'use strict';

var express  = require('express');
var cors     = require('cors');
var axios    = require('axios');

var manifest = require('./manifest.json');
var pluto    = require('./lib/pluto');
var mapper   = require('./lib/mapper');

var app = express();
app.use(cors());

var PORT = process.env.PORT || 7000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getBaseUrl(req) {
  var proto = req.headers['x-forwarded-proto'] || req.protocol;
  return proto + '://' + req.get('host');
}

function sendJson(res, payload) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'max-age=300, stale-while-revalidate=600');
  res.send(JSON.stringify(payload));
}

// Resolves a (possibly relative) URL found inside an m3u8 against the
// playlist's own URL. Pluto's stitcher sometimes returns relative paths for
// variant playlists/segments — the old regex only matched lines starting
// with "http", so relative lines were silently left untouched and the
// player tried (and failed) to resolve them on its own.
function resolveUrl(maybeRelative, playlistUrl) {
  try {
    return new URL(maybeRelative, playlistUrl).toString();
  } catch (e) {
    return maybeRelative;
  }
}

// Rewrites an m3u8 body so every absolute AND relative media/playlist
// reference routes back through our /proxy/segment endpoint. Handles:
//   1. Bare URL lines (variant playlists, segment URIs)
//   2. Relative path lines
//   3. URI="..." attributes (used in #EXT-X-KEY, #EXT-X-MAP, #EXT-X-MEDIA, etc.)
function rewriteM3U8(m3u8, sourcePlaylistUrl, baseUrl) {
  var lines = m3u8.split('\n');

  var rewritten = lines.map(function (line) {
    var trimmed = line.trim();

    // Case 1: tag lines with URI="..." attribute (ad markers, keys, maps)
    if (trimmed.startsWith('#') && /URI="([^"]+)"/.test(trimmed)) {
      return trimmed.replace(/URI="([^"]+)"/, function (full, uri) {
        var absolute = resolveUrl(uri, sourcePlaylistUrl);
        var proxied  = baseUrl + '/proxy/segment?url=' + encodeURIComponent(absolute);
        return 'URI="' + proxied + '"';
      });
    }

    // Case 2: comment / tag lines with no URL to rewrite — leave as-is
    if (trimmed.startsWith('#') || trimmed === '') {
      return line;
    }

    // Case 3: a bare media/playlist reference line — absolute or relative
    var absolute = resolveUrl(trimmed, sourcePlaylistUrl);
    return baseUrl + '/proxy/segment?url=' + encodeURIComponent(absolute);
  });

  return rewritten.join('\n');
}

// ─── Routes ──────────────────────────────────────────────────────────────────

app.get('/', function (req, res) {
  var url = getBaseUrl(req) + '/manifest.json';
  res.send(
    '<h1>Red Dawn (Free) Stremio Addon</h1>' +
    '<p>Status: ✅ running</p>' +
    '<p>Install in Stremio: <code>' + url + '</code></p>' +
    '<p>Debug: <a href="/debug/channels">/debug/channels</a> | ' +
    '<a href="/debug/search?q=news">/debug/search?q=news</a> | ' +
    '<a href="/debug/nettest">/debug/nettest</a> | ' +
    '<a href="/debug/streamtest?id=">/debug/streamtest?id=CHANNEL_ID</a></p>'
  );
});

app.get('/manifest.json', function (req, res) {
  sendJson(res, manifest);
});

// ─── Catalog ─────────────────────────────────────────────────────────────────

app.get('/catalog/:type/:id/:extra?.json', async function (req, res) {
  var type  = req.params.type;
  var id    = req.params.id;
  var extra = req.params.extra || '';

  if (type !== 'movie') {
    return sendJson(res, { metas: [] });
  }

  try {
    var items = [];
    var skip  = 0;
    var skipMatch = extra.match(/skip=(\d+)/);
    if (skipMatch) skip = parseInt(skipMatch[1], 10);

    if (id === 'pluto_search') {
      var query = '';
      var searchMatch = decodeURIComponent(extra).match(/search=([^&]+)/);
      if (searchMatch) query = searchMatch[1];
      if (!query) return sendJson(res, { metas: [] });
      items = await pluto.search(query);

    } else if (id === 'pluto_featured') {
      items = await pluto.getCategoryItems(null, skip, 100);
    }

    var metas = items.map(mapper.toMetaPreview).filter(Boolean);
    sendJson(res, { metas: metas });

  } catch (err) {
    console.error('[catalog] error:', err.message);
    sendJson(res, { metas: [] });
  }
});

// ─── Meta ────────────────────────────────────────────────────────────────────

app.get('/meta/:type/:id.json', async function (req, res) {
  var type = req.params.type;
  var id   = req.params.id;

  if (type !== 'movie') {
    return sendJson(res, { meta: null });
  }

  try {
    var plutoId = mapper.fromStremioId(id);
    var item    = await pluto.getItem(plutoId);
    var meta    = mapper.toMetaDetail(item);
    sendJson(res, { meta: meta || null });
  } catch (err) {
    console.error('[meta] error:', err.message);
    sendJson(res, { meta: null });
  }
});

// ─── Stream ──────────────────────────────────────────────────────────────────

app.get('/stream/:type/:id.json', async function (req, res) {
  var type = req.params.type;
  var id   = req.params.id;

  if (type !== 'movie') {
    return sendJson(res, { streams: [] });
  }

  try {
    var plutoId = mapper.fromStremioId(id);
    var item    = await pluto.getItem(plutoId);
    if (!item) return sendJson(res, { streams: [] });

    var baseUrl = getBaseUrl(req);
    var streams = mapper.toStreams(item, baseUrl);
    sendJson(res, { streams: streams });
  } catch (err) {
    console.error('[stream] error:', err.message);
    sendJson(res, { streams: [] });
  }
});

// ─── HLS Proxy ───────────────────────────────────────────────────────────────
// Stremio calls your server for the .m3u8; your server fetches a FRESH
// signed stream URL from Pluto (every time — never cached) using a US IP,
// and pipes it back. Pluto never sees the user's non-US IP, and we never
// hand out a stale/expired sessionToken.

app.get('/proxy/stream/:channelId.m3u8', async function (req, res) {
  var channelId = req.params.channelId;

  try {
    // Confirm the channel exists (uses the long-lived metadata cache — fine).
    var item = await pluto.getItem(channelId);
    if (!item) {
      return res.status(404).send('Channel not found');
    }

    // Always fetch a brand-new, freshly-tokened stream URL right before use.
    // This is the fix: the old code reused a streamUrl that had been cached
    // for up to 55 minutes with a token that dies in a few minutes.
    var freshStreamUrl = await pluto.getFreshStreamUrl(channelId);

    console.log('[proxy] fetching HLS for channel: ' + channelId);

    var response = await axios.get(freshStreamUrl, {
      timeout: 15000,
      responseType: 'text',
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Origin':          'https://pluto.tv',
        'Referer':         'https://pluto.tv/',
        'Accept':          '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    var m3u8    = response.data;
    var baseUrl = getBaseUrl(req);
    var rewritten = rewriteM3U8(m3u8, freshStreamUrl, baseUrl);

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(rewritten);

  } catch (err) {
    var status = (err.response && err.response.status) || '?';
    console.error('[proxy] HLS fetch error:', err.message, '(upstream status: ' + status + ')');
    res.status(502).send('Failed to fetch stream from Pluto TV');
  }
});

// ─── Segment Proxy ───────────────────────────────────────────────────────────
// Proxies .ts video segments and any nested m3u8 playlists (variant streams)

app.get('/proxy/segment', async function (req, res) {
  var url = req.query.url;
  if (!url) return res.status(400).send('Missing url param');

  try {
    var response = await axios.get(url, {
      timeout: 30000,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Origin':          'https://pluto.tv',
        'Referer':         'https://pluto.tv/',
        'Accept':          '*/*',
      },
    });

    var contentType = response.headers['content-type'] || '';
    if (contentType.indexOf('mpegurl') !== -1 || url.indexOf('.m3u8') !== -1) {
      var text    = Buffer.from(response.data).toString('utf8');
      var baseUrl = getBaseUrl(req);
      var rewritten = rewriteM3U8(text, url, baseUrl);
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.send(rewritten);
    }

    res.setHeader('Content-Type', contentType || 'video/MP2T');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(Buffer.from(response.data));

  } catch (err) {
    var status = (err.response && err.response.status) || '?';
    console.error('[proxy/segment] error:', err.message, '(upstream status: ' + status + ')', 'url:', url.slice(0, 80));
    res.status(502).send('Segment fetch failed');
  }
});

// ─── Debug endpoints ─────────────────────────────────────────────────────────

app.get('/debug/nettest', async function (req, res) {
  try {
    console.log('[nettest] fetching Pluto boot API...');
    var r = await axios.get('https://boot.pluto.tv/v4/start', {
      timeout: 15000,
      params: {
        appName: 'web', appVersion: '9.14.0', deviceVersion: '124.0.0',
        deviceModel: 'web', deviceMake: 'chrome', deviceType: 'web',
        clientID: 'reddawn-nettest', clientModelNumber: '1.0.0',
        serverSideAds: 'false', marketingRegion: 'US', clientIP: '76.89.234.101',
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://pluto.tv',
        'Referer': 'https://pluto.tv/',
      },
    });
    var d = r.data || {};
    var sess = d.session || {};
    sendJson(res, {
      ok:              true,
      status:          r.status,
      hasToken:        !!d.sessionToken,
      marketingRegion: sess.marketingRegion || 'not returned',
      countryCode:     sess.countryCode || 'not returned',
      activeRegion:    sess.activeRegion || 'not returned',
      city:            sess.city || 'not returned',
      topKeys:         Object.keys(d).slice(0, 10),
    });
  } catch (e) {
    console.error('[nettest] error:', e.message);
    sendJson(res, { ok: false, error: e.message });
  }
});

// Definitive US-vs-Germany region check. Compares THREE attempts:
//   1. No region params at all  -> reveals where Pluto thinks your SERVER
//      actually is (this is your baseline / the "do nothing" case)
//   2. marketingRegion=US + clientIP param  -> the spoof this addon relies on
//   3. X-Forwarded-For header only  -> tests whether Pluto even looks at that
//      header (the old code's comment claimed it's ignored — this proves it
//      either way instead of assuming)
// If attempt #2 doesn't come back "US", the spoof is NOT working and you
// will keep getting German (or wherever your host server actually is)
// content no matter how much after-the-fact filtering by name we do.
app.get('/debug/regioncheck', async function (req, res) {
  var US_IP = '76.89.234.101';
  var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Origin': 'https://pluto.tv',
    'Referer': 'https://pluto.tv/',
  };

  async function attempt(label, params, extraHeaders) {
    try {
      var r = await axios.get('https://boot.pluto.tv/v4/start', {
        timeout: 15000,
        params: params,
        headers: Object.assign({}, HEADERS, extraHeaders || {}),
      });
      var d = r.data || {};
      var sess = d.session || {};
      return {
        label: label,
        ok: true,
        status: r.status,
        marketingRegion: sess.marketingRegion || null,
        countryCode: sess.countryCode || null,
        activeRegion: sess.activeRegion || null,
        resolvedClientIP: sess.clientIP || null,
        city: sess.city || null,
        hasToken: !!d.sessionToken,
      };
    } catch (e) {
      return {
        label: label,
        ok: false,
        error: e.message,
        upstreamStatus: (e.response && e.response.status) || null,
      };
    }
  }

  var deviceId = 'reddawn-regioncheck-' + Date.now();

  var results = await Promise.all([
    attempt('1_no_region_params (baseline: where is your server really?)', {
      appName: 'web', appVersion: '9.14.0', deviceVersion: '124.0.0',
      deviceModel: 'web', deviceMake: 'chrome', deviceType: 'web',
      clientID: deviceId, clientModelNumber: '1.0.0', serverSideAds: 'false',
    }),
    attempt('2_marketingRegion_US_plus_clientIP (the spoof this addon uses)', {
      appName: 'web', appVersion: '9.14.0', deviceVersion: '124.0.0',
      deviceModel: 'web', deviceMake: 'chrome', deviceType: 'web',
      clientID: deviceId, clientModelNumber: '1.0.0', serverSideAds: 'false',
      marketingRegion: 'US', clientIP: US_IP,
    }),
    attempt('3_xforwardedfor_header_only (does Pluto even read this?)', {
      appName: 'web', appVersion: '9.14.0', deviceVersion: '124.0.0',
      deviceModel: 'web', deviceMake: 'chrome', deviceType: 'web',
      clientID: deviceId, clientModelNumber: '1.0.0', serverSideAds: 'false',
    }, { 'X-Forwarded-For': US_IP }),
  ]);

  var verdict;
  var spoofResult = results[1];
  if (spoofResult.ok && spoofResult.marketingRegion === 'US') {
    verdict = 'PASS - spoof attempt #2 returned marketingRegion="US". Region forcing is working.';
  } else if (spoofResult.ok) {
    verdict = 'FAIL - spoof attempt #2 returned marketingRegion="' + spoofResult.marketingRegion + '" instead of "US". The clientIP trick is NOT forcing US region; you are getting that region\'s catalog instead.';
  } else {
    verdict = 'INCONCLUSIVE - request #2 errored, see results for detail.';
  }

  sendJson(res, { verdict: verdict, results: results });
});

app.get('/debug/channels', async function (req, res) {
  try {
    var cats  = await pluto.getCategories();
    var items = await pluto.getCategoryItems(null, 0, 10);
    var all   = await pluto.getCategoryItems(null, 0, 9999);
    sendJson(res, {
      categories:    cats.length,
      totalChannels: all.length,
      sample:        items,
    });
  } catch (e) {
    console.error('[debug/channels] error:', e.message);
    sendJson(res, { error: e.message });
  }
});

app.get('/debug/search', async function (req, res) {
  try {
    var q     = req.query.q || 'news';
    var items = await pluto.search(q);
    sendJson(res, { query: q, count: items.length, sample: items.slice(0, 5) });
  } catch (e) {
    console.error('[debug/search] error:', e.message);
    sendJson(res, { error: e.message });
  }
});

// New: fetch a fresh stream URL for one channel and report whether Pluto's
// stitcher actually accepted it (HTTP 200 + playlist body), and show a
// snippet of the raw m3u8 so we can see if it uses relative or absolute URLs.
app.get('/debug/streamtest', async function (req, res) {
  var channelId = req.query.id;
  if (!channelId) {
    return sendJson(res, { error: 'Pass ?id=<channelId> — get one from /debug/channels' });
  }
  try {
    var freshStreamUrl = await pluto.getFreshStreamUrl(channelId);
    var r = await axios.get(freshStreamUrl, {
      timeout: 15000,
      responseType: 'text',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://pluto.tv',
        'Referer': 'https://pluto.tv/',
      },
    });
    sendJson(res, {
      ok: true,
      status: r.status,
      streamUrl: freshStreamUrl,
      bodyPreview: String(r.data).split('\n').slice(0, 15),
    });
  } catch (e) {
    sendJson(res, {
      ok: false,
      error: e.message,
      upstreamStatus: (e.response && e.response.status) || null,
      upstreamBodyPreview: e.response ? String(e.response.data).slice(0, 300) : null,
    });
  }
});

// Dumps the FULL raw boot response so we can see its actual shape.
// regioncheck assumed marketingRegion/geoLocation are top-level fields —
// they came back null on every attempt including the baseline, which means
// either those fields don't exist on this endpoint at all, or they're
// nested somewhere else. This shows us the real structure instead of
// guessing further.
app.get('/debug/rawboot', async function (req, res) {
  var US_IP = '76.89.234.101';
  var deviceId = 'reddawn-rawboot-' + Date.now();
  try {
    var r = await axios.get('https://boot.pluto.tv/v4/start', {
      timeout: 15000,
      params: {
        appName: 'web', appVersion: '9.14.0', deviceVersion: '124.0.0',
        deviceModel: 'web', deviceMake: 'chrome', deviceType: 'web',
        clientID: deviceId, clientModelNumber: '1.0.0', serverSideAds: 'false',
        marketingRegion: 'US', clientIP: US_IP,
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://pluto.tv',
        'Referer': 'https://pluto.tv/',
      },
    });
    // Send the entire raw body back, unmodified, so we can inspect every key.
    sendJson(res, { status: r.status, fullBody: r.data });
  } catch (e) {
    sendJson(res, {
      ok: false,
      error: e.message,
      upstreamStatus: (e.response && e.response.status) || null,
      upstreamBody: e.response ? e.response.data : null,
    });
  }
});

app.listen(PORT, function () {
  console.log('🔴 Red Dawn (Free) addon running on port ' + PORT);
  console.log('   Install URL: http://localhost:' + PORT + '/manifest.json');
});
