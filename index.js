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

// Resolves a (possibly relative) URL against the playlist's own URL.
// e.g. "1042180/playlist.m3u8?foo=bar" resolved against
// "https://cfd-v4-service-channel-stitcher-use1-1.prd.pluto.tv/stitch/hls/channel/CHANNEL_ID/master.m3u8?..."
// correctly becomes:
// "https://cfd-v4-service-channel-stitcher-use1-1.prd.pluto.tv/stitch/hls/channel/CHANNEL_ID/1042180/playlist.m3u8?foo=bar"
function resolveUrl(maybeRelative, playlistUrl) {
  try {
    return new URL(maybeRelative, playlistUrl).toString();
  } catch (e) {
    return maybeRelative;
  }
}

// Rewrites an m3u8 body so every media/playlist reference routes through
// our /proxy/segment endpoint. Handles:
//   1. Bare URL lines — absolute or relative (variant playlists, segments)
//   2. URI="..." attributes in tag lines (keys, maps, subtitles)
function rewriteM3U8(m3u8, sourcePlaylistUrl, baseUrl) {
  var lines = m3u8.split('\n');

  var rewritten = lines.map(function (line) {
    var trimmed = line.trim();

    // Case 1: tag line with URI="..." attribute (subtitles, keys, maps, etc.)
    if (trimmed.startsWith('#') && /URI="([^"]+)"/.test(trimmed)) {
      return trimmed.replace(/URI="([^"]+)"/g, function (full, uri) {
        var absolute = resolveUrl(uri, sourcePlaylistUrl);
        return 'URI="' + baseUrl + '/proxy/segment?url=' + encodeURIComponent(absolute) + '"';
      });
    }

    // Case 2: other tag/comment lines or blank lines — leave as-is
    if (trimmed.startsWith('#') || trimmed === '') {
      return line;
    }

    // Case 3: bare media/playlist reference (absolute or relative)
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
// Fetches a FRESH signed stream URL from Pluto on every request, rewrites
// all relative + absolute URLs in the m3u8 to route back through this proxy.

app.get('/proxy/stream/:channelId.m3u8', async function (req, res) {
  var channelId = req.params.channelId;

  try {
    var item = await pluto.getItem(channelId);
    if (!item) {
      return res.status(404).send('Channel not found');
    }

    // Always get a brand-new token — never use a cached stream URL.
    var freshStreamUrl = await pluto.getFreshStreamUrl(channelId);

    console.log('[proxy] fetching master HLS for channel: ' + channelId);
    console.log('[proxy] stream URL: ' + freshStreamUrl.slice(0, 120) + '...');

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

    // KEY FIX: pass freshStreamUrl as the base for resolving relative paths.
    // Pluto's master playlist contains lines like "1042180/playlist.m3u8?..."
    // which are relative to the master playlist URL — not to your server root.
    // resolveUrl() handles this correctly using the URL constructor.
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
// Proxies variant playlists (.m3u8) and video segments (.ts).
// For nested m3u8 files, rewrites their URLs too so segments also proxy
// back through this server.

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
    var isM3U8 = contentType.indexOf('mpegurl') !== -1 || url.indexOf('.m3u8') !== -1;

    if (isM3U8) {
      var text      = Buffer.from(response.data).toString('utf8');
      var baseUrl   = getBaseUrl(req);
      // Use the segment's own URL as the base for resolving any relative
      // paths inside this nested playlist (variant → segment .ts files).
      var rewritten = rewriteM3U8(text, url, baseUrl);
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.send(rewritten);
    }

    // Raw video segment — pipe straight through
    res.setHeader('Content-Type', contentType || 'video/MP2T');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(Buffer.from(response.data));

  } catch (err) {
    var status = (err.response && err.response.status) || '?';
    console.error('[proxy/segment] error:', err.message,
      '(upstream status: ' + status + ')',
      'url:', url.slice(0, 100));
    res.status(502).send('Segment fetch failed');
  }
});

// ─── Debug endpoints ─────────────────────────────────────────────────────────

app.get('/debug/nettest', async function (req, res) {
  try {
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
        'Origin': 'https://pluto.tv', 'Referer': 'https://pluto.tv/',
      },
    });
    var d = r.data || {};
    var sess = d.session || {};
    sendJson(res, {
      ok: true, status: r.status, hasToken: !!d.sessionToken,
      marketingRegion: sess.marketingRegion || 'not returned',
      countryCode: sess.countryCode || 'not returned',
      city: sess.city || 'not returned',
    });
  } catch (e) {
    sendJson(res, { ok: false, error: e.message });
  }
});

app.get('/debug/regioncheck', async function (req, res) {
  var US_IP = '76.89.234.101';
  var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Origin': 'https://pluto.tv', 'Referer': 'https://pluto.tv/',
  };

  async function attempt(label, params, extraHeaders) {
    try {
      var r = await axios.get('https://boot.pluto.tv/v4/start', {
        timeout: 15000, params: params,
        headers: Object.assign({}, HEADERS, extraHeaders || {}),
      });
      var d = r.data || {};
      var sess = d.session || {};
      return {
        label, ok: true, status: r.status,
        marketingRegion: sess.marketingRegion || null,
        countryCode: sess.countryCode || null,
        activeRegion: sess.activeRegion || null,
        resolvedClientIP: sess.clientIP || null,
        city: sess.city || null,
        hasToken: !!d.sessionToken,
      };
    } catch (e) {
      return { label, ok: false, error: e.message };
    }
  }

  var deviceId = 'reddawn-regioncheck-' + Date.now();
  var base = { appName: 'web', appVersion: '9.14.0', deviceVersion: '124.0.0', deviceModel: 'web', deviceMake: 'chrome', deviceType: 'web', clientID: deviceId, clientModelNumber: '1.0.0', serverSideAds: 'false' };

  var results = await Promise.all([
    attempt('1_baseline (no region params)', base),
    attempt('2_clientIP_spoof', { ...base, marketingRegion: 'US', clientIP: US_IP }),
    attempt('3_xforwardedfor_header', base, { 'X-Forwarded-For': US_IP }),
  ]);

  var s = results[1];
  var verdict = s.ok
    ? (s.marketingRegion === 'US' ? 'PASS — region forcing is working.' : `FAIL — got "${s.marketingRegion}" instead of US.`)
    : 'INCONCLUSIVE — request errored.';

  sendJson(res, { verdict, results });
});

app.get('/debug/channels', async function (req, res) {
  try {
    var cats  = await pluto.getCategories();
    var items = await pluto.getCategoryItems(null, 0, 10);
    var all   = await pluto.getCategoryItems(null, 0, 9999);
    sendJson(res, { categories: cats.length, totalChannels: all.length, sample: items });
  } catch (e) {
    sendJson(res, { error: e.message });
  }
});

app.get('/debug/search', async function (req, res) {
  try {
    var q     = req.query.q || 'news';
    var items = await pluto.search(q);
    sendJson(res, { query: q, count: items.length, sample: items.slice(0, 5) });
  } catch (e) {
    sendJson(res, { error: e.message });
  }
});

app.get('/debug/streamtest', async function (req, res) {
  var channelId = req.query.id;
  if (!channelId) return sendJson(res, { error: 'Pass ?id=<channelId>' });
  try {
    var freshStreamUrl = await pluto.getFreshStreamUrl(channelId);
    var r = await axios.get(freshStreamUrl, {
      timeout: 15000, responseType: 'text',
      headers: { 'User-Agent': 'Mozilla/5.0', 'Origin': 'https://pluto.tv', 'Referer': 'https://pluto.tv/' },
    });
    sendJson(res, {
      ok: true, status: r.status, streamUrl: freshStreamUrl,
      bodyPreview: String(r.data).split('\n').slice(0, 15),
    });
  } catch (e) {
    sendJson(res, { ok: false, error: e.message, upstreamStatus: (e.response && e.response.status) || null });
  }
});

// Test the FULL proxy chain — fetches master m3u8 through your proxy and
// shows what Stremio would actually receive (rewritten URLs and all).
app.get('/debug/proxytest', async function (req, res) {
  var channelId = req.query.id;
  if (!channelId) return sendJson(res, { error: 'Pass ?id=<channelId> — get one from /debug/channels' });
  try {
    var baseUrl  = getBaseUrl(req);
    var proxyUrl = baseUrl + '/proxy/stream/' + encodeURIComponent(channelId) + '.m3u8';
    var r = await axios.get(proxyUrl, { timeout: 15000, responseType: 'text' });
    sendJson(res, {
      ok: true, status: r.status, proxyUrl,
      bodyPreview: String(r.data).split('\n').slice(0, 20),
    });
  } catch (e) {
    sendJson(res, { ok: false, error: e.message });
  }
});

app.get('/debug/rawboot', async function (req, res) {
  var deviceId = 'reddawn-rawboot-' + Date.now();
  try {
    var r = await axios.get('https://boot.pluto.tv/v4/start', {
      timeout: 15000,
      params: {
        appName: 'web', appVersion: '9.14.0', deviceVersion: '124.0.0',
        deviceModel: 'web', deviceMake: 'chrome', deviceType: 'web',
        clientID: deviceId, clientModelNumber: '1.0.0', serverSideAds: 'false',
        marketingRegion: 'US', clientIP: '76.89.234.101',
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'https://pluto.tv', 'Referer': 'https://pluto.tv/',
      },
    });
    sendJson(res, { status: r.status, fullBody: r.data });
  } catch (e) {
    sendJson(res, { ok: false, error: e.message });
  }
});

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, function () {
  console.log('🔴 Red Dawn (Free) addon running on port ' + PORT);
  console.log('   Install URL: http://localhost:' + PORT + '/manifest.json');
});
