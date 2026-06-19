// index.js
//
// Red Dawn (Free) — a Stremio addon serving Pluto TV's free, ad-supported
// on-demand movie catalog. Implements the Stremio addon HTTP protocol
// directly with Express (manifest.json, /catalog, /meta, /stream).

const express = require('express');
const cors = require('cors');

const manifest = require('./manifest');
const pluto = require('./lib/pluto');
const mapper = require('./lib/mapper');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 7000;

// --- Helpers ---------------------------------------------------------

function sendJson(res, payload) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'max-age=300, stale-while-revalidate=600');
  res.send(JSON.stringify(payload));
}

// --- Routes ------------------------------------------------------------

app.get('/', (req, res) => {
  res.send(
    `<h1>Red Dawn (Free) Stremio Addon</h1>
     <p>Status: running.</p>
     <p>Install URL: <code>${req.protocol}://${req.get('host')}/manifest.json</code></p>`
  );
});

app.get('/manifest.json', (req, res) => {
  sendJson(res, manifest);
});

// Catalog: GET /catalog/:type/:id.json  (and with /extra/ segment for search)
app.get('/catalog/:type/:id/:extra?.json', async (req, res) => {
  const { type, id, extra } = req.params;

  if (type !== 'movie') {
    return sendJson(res, { metas: [] });
  }

  try {
    let items = [];

    if (id === 'pluto_search') {
      // extra segment looks like "search=batman"
      let query = '';
      if (extra) {
        const match = decodeURIComponent(extra).match(/search=([^&]+)/);
        if (match) query = match[1];
      }
      if (!query) return sendJson(res, { metas: [] });
      items = await pluto.search(query);
    } else if (id === 'pluto_featured') {
      const categories = await pluto.getCategories();
      const firstCategory = categories[0];
      if (firstCategory) {
        const categoryId = firstCategory.id || firstCategory._id || firstCategory.slug;
        items = await pluto.getCategoryItems(categoryId);
      }
    }

    const metas = items.map(mapper.toMetaPreview).filter(Boolean);
    sendJson(res, { metas });
  } catch (err) {
    console.error('[catalog] error:', err.message);
    sendJson(res, { metas: [] });
  }
});

// Meta: GET /meta/:type/:id.json
app.get('/meta/:type/:id.json', async (req, res) => {
  const { type, id } = req.params;

  if (type !== 'movie') {
    return sendJson(res, { meta: null });
  }

  try {
    const plutoId = mapper.fromStremioId(id);
    const item = await pluto.getItem(plutoId);
    const meta = mapper.toMetaDetail(item);
    sendJson(res, { meta: meta || null });
  } catch (err) {
    console.error('[meta] error:', err.message);
    sendJson(res, { meta: null });
  }
});

// Stream: GET /stream/:type/:id.json
app.get('/stream/
