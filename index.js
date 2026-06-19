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

function sendJson(res, payload) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'max-age=300, stale-while-revalidate=600');
  res.send(JSON.stringify(payload));
}

// ─── Routes ──────────────────────────────────────────────────────────────────

app.get('/', function (req, res) {
  var url = req.protocol + '://' + req.get('host') + '/manifest.json';
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
// Stremio calls:  /catalog/movie/pluto_featured.json
//            or:  /catalog/movie/pluto_featured/skip=0.json
//            or:  /catalog/movie/pluto_search/search=batman.json

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
      // Return all channels paginated (100 per page)
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
    var streams = mapper.toStreams(item);
    sendJson(res, { streams: streams });
  } catch (err) {
    console.error('[stream] error:', err.message);
    sendJson(res, { streams: [] });
  }
});

// ─── Debug endpoints ─────────────────────────────────────────────────────────

// Test raw network access to i.mjh.nz
app.get('/debug/nettest', async function (req, res) {
  try {
    console.log('[nettest] fetching i.mjh.nz M3U...');
    var r = await axios.get('https://i.mjh.nz/PlutoTV/us.m3u8', {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    var lines = r.data.split('\n').length;
    sendJson(res, { ok: true, status: r.status, lines: lines, preview: r.data.slice(0, 300) });
  } catch (e) {
    console.error('[nettest] error:', e.message);
    sendJson(res, { ok: false, error: e.message });
  }
});

// Show first 10 parsed channels
app.get('/debug/channels', async function (req, res) {
  try {
    var cats  = await pluto.getCategories();
    var items = await pluto.getCategoryItems(null, 0, 10);
    sendJson(res, {
      categories: cats.length,
      totalChannels: (await pluto.getCategoryItems(null, 0, 9999)).length,
      sample: items,
    });
  } catch (e) {
    console.error('[debug/channels] error:', e.message);
    sendJson(res, { error: e.message });
  }
});

// Test search
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
