var express = require('express');
var cors = require('cors');

var manifest = require('./manifest');
var pluto = require('./lib/pluto');
var mapper = require('./lib/mapper');

var app = express();
app.use(cors());

var PORT = process.env.PORT || 7000;

function sendJson(res, payload) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'max-age=300, stale-while-revalidate=600');
  res.send(JSON.stringify(payload));
}

app.get('/', function (req, res) {
  var url = req.protocol + '://' + req.get('host') + '/manifest.json';
  res.send('<h1>Red Dawn (Free) Stremio Addon</h1><p>Status: running.</p><p>Install URL: ' + url + '</p>');
});

app.get('/manifest.json', function (req, res) {
  sendJson(res, manifest);
});

app.get('/catalog/:type/:id/:extra?.json', async function (req, res) {
  var type = req.params.type;
  var id = req.params.id;
  var extra = req.params.extra;

  if (type !== 'movie') {
    return sendJson(res, { metas: [] });
  }

  try {
    var items = [];

    if (id === 'pluto_search') {
      var query = '';
      if (extra) {
        var match = decodeURIComponent(extra).match(/search=([^&]+)/);
        if (match) query = match[1];
      }
      if (!query) return sendJson(res, { metas: [] });
      items = await pluto.search(query);
    } else if (id === 'pluto_featured') {
      var categories = await pluto.getCategories();
      var firstCategory = categories[0];
      if (firstCategory) {
        var categoryId = firstCategory.id || firstCategory._id || firstCategory.slug;
        items = await pluto.getCategoryItems(categoryId);
      }
    }

    var metas = items.map(mapper.toMetaPreview).filter(Boolean);
    sendJson(res, { metas: metas });
  } catch (err) {
    console.error('[catalog] error:', err.message);
    sendJson(res, { metas: [] });
  }
});

app.get('/meta/:type/:id.json', async function (req, res) {
  var type = req.params.type;
  var id = req.params.id;

  if (type !== 'movie') {
    return sendJson(res, { meta: null });
  }

  try {
    var plutoId = mapper.fromStremioId(id);
    var item = await pluto.getItem(plutoId);
    var meta = mapper.toMetaDetail(item);
    sendJson(res, { meta: meta || null });
  } catch (err) {
    console.error('[meta] error:', err.message);
    sendJson(res, { meta: null });
  }
});

app.get('/stream/:type/:id.json', async function (req, res) {
  var type = req.params.type;
  var id = req.params.id;

  if (type !== 'movie') {
    return sendJson(res, { streams: [] });
  }

  try {
    var plutoId = mapper.fromStremioId(id);
    var item = await pluto.getItem(plutoId);
    var streams = mapper.toStreams(item);
    sendJson(res, { streams: streams });
  } catch (err) {
    console.error('[stream] error:', err.message);
    sendJson(res, { streams: [] });
  }
});

app.get('/debug/categories', async function (req, res) {
  var categories = await pluto.getCategories();
  sendJson(res, { count: categories.length, sample: categories.slice(0, 3) });
});

app.get('/debug/search', async function (req, res) {
  var q = req.query.q || 'batman';
  var items = await pluto.search(q);
  sendJson(res, { count: items.length, sample: items.slice(0, 3) });
});

app.listen(PORT, function () {
  console.log('Red Dawn (Free) addon running on port ' + PORT);
});
