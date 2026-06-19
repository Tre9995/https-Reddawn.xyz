'use strict';

var express  = require('express');
var cors     = require('cors');
var axios    = require('axios');
var http     = require('http');
var https    = require('https');

var manifest = require('./manifest.json');
var pluto    = require('./lib/pluto');
var mapper   = require('./lib/mapper');

var app = express();
app.use(cors());

var PORT = process.env.PORT || 7000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getBaseUrl(req) {
  // On Render, trust the x-forwarded-proto header for https
  var proto = req.headers['x-forwarded-proto'] || req.protocol;
  return proto + '://' + req.get('host');
}

function sendJson(res, payload) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'max-age=300, stale-while-revalidate=600');
  res.send(JSON.stringify(payload));
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
    '<a href="/debug/nettest">/debug/nettest</a></p>'
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
    var plutoId    = mapper.fromStremioId(id);
    var item       = await pluto.getItem(plutoId);
    var baseUrl    = getBaseUrl(req);
    var streams    = mapper.toStreams(item, baseUrl);
    sendJson(res, { streams: streams });
  } catch (err) {
    console.error('[stream] error:', err.message);
    sendJson(res, { streams: [] });
  }
});

// ─── HLS Proxy ───────────────────────────────────────────────────────────────
// Stremio calls your server for the .m3u8; your server fetches it from Pluto
// using its US IP and pipes it back. Pluto never sees the user's non-US IP.
//
// Also rewrites any absolute URLs inside the m3u8 to go through this proxy,
// so segment fetches (.ts files) also come through your server.

app.get('/proxy/stream/:channelId.m3u8', async function (req, res) {
  var channelId = req.params.channelId;

  try {
    var item = await pluto.getItem(channelId);
    if (!item || !item.streamUrl) {
      return res.status(404).send('Channel not found');
    }

    console.log(`[proxy] fetching HLS for channel: ${channelId}`);

    var response = await axios.get(item.streamUrl, {
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

    var m3u8 = response.data;
    var baseUrl = getBaseUrl(req);

    // Rewrite absolute https:// URLs inside the m3u8 to go through our proxy
    // so .ts segment requests also pass through the server
    m3u8 = m3u8.replace(
      /^(https?:\/\/[^\s]+)$/gm,
      function (url) {
        return baseUrl + '/proxy/segment?url=' + encodeURIComponent(url);
      }
    );

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(m3u8);

  } catch (err) {
    console.error('[proxy] HLS fetch error:', err.message);
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

    // If this segment is itself an m3u8 (variant playlist), rewrite its URLs too
    var contentType = response.headers['content-type'] || '';
    if (contentType.includes('mpegurl') || url.includes('.m3u8')) {
      var text     = Buffer.from(response.data).toString('utf8');
      var baseUrl  = getBaseUrl(req);
      text = text.replace(
        /^(https?:\/\/[^\s]+)$/gm,
        function (segUrl) {
          return baseUrl + '/proxy/segment?url=' + encodeURIComponent(segUrl);
        }
      );
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.send(text);
    }

    // Binary segment (.ts)
    res.setHeader('Content-Type', contentType || 'video/MP2T');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(Buffer.from(response.data));

  } catch (err) {
    console.error('[proxy/segment] error:', err.message, 'url:', url.slice(0, 80));
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
    sendJson(res, {
      ok:              true,
      status:          r.status,
      hasToken:        !!d.sessionToken,
      marketingRegion: d.marketingRegion || 'not returned',
      geoCountry:      (d.geoLocation && d.geoLocation.country) || 'not returned',
      topKeys:         Object.keys(d).slice(0, 10),
    });
  } catch (e) {
    console.error('[nettest] error:', e.message);
    sendJson(res, { ok: false, error: e.message });
  }
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

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, function () {
  console.log('🔴 Red Dawn (Free) addon running on port ' + PORT);
  console.log('   Install URL: http://localhost:' + PORT + '/manifest.json');
});
