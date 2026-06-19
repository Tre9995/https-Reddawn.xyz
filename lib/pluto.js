'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Pluto TV VOD data via matthuisman's public mirror (no auth required)
// This is the same EPG/VOD data used by thousands of IPTV players worldwide.
// ─────────────────────────────────────────────────────────────────────────────

const axios = require('axios');

const VOD_JSON_URL = 'https://i.mjh.nz/PlutoTV/us.json';

const _cache = new Map();
function cacheGet(k) { const e = _cache.get(k); if (!e || Date.now() > e.x) return null; return e.v; }
function cacheSet(k, v, ttl) { _cache.set(k, { v, x: Date.now() + (ttl || 300000) }); }

const client = axios.create({
  timeout: 20000,
  headers: {
    'User-Agent': 'Mozilla/5.0',
    'Accept': 'application/json',
  },
});

// Fetch and cache the full Pluto TV VOD catalog
async function fetchCatalog() {
  const hit = cacheGet('catalog');
  if (hit) return hit;

  console.log('[pluto] fetching VOD catalog...');
  const { data } = await client.get(VOD_JSON_URL);
  console.log('[pluto] catalog fetched, keys:', Object.keys(data || {}).join(','));
  cacheSet('catalog', data, 60 * 60 * 1000); // cache 1 hour
  return data;
}

// Extract VOD movies from the catalog
async function getVodItems() {
  const hit = cacheGet('vod_items');
  if (hit) return hit;

  const catalog = await fetchCatalog();

  // matthuisman's format: { channels: {...}, vod: {...} }
  // vod items are keyed by id
  let items = [];

  if (catalog && catalog.vod) {
    items = Object.values(catalog.vod);
  } else if (catalog && catalog.channels) {
    // fallback: use channels as content
    items = Object.values(catalog.channels);
  }

  console.log('[pluto] vod items count:', items.length);
  cacheSet('vod_items', items, 60 * 60 * 1000);
  return items;
}

// ─── Public API ──────────────────────────────────────────────────────────────

async function getCategories() {
  try {
    const items = await getVodItems();
    // Build pseudo-categories from genres
    const genreMap = {};
    for (const item of items) {
      const genre = item.genre || item.group || 'Movies';
      if (!genreMap[genre]) genreMap[genre] = { id: genre, name: genre, _id: genre };
    }
    const cats = Object.values(genreMap);
    console.log('[pluto] categories:', cats.length);
    return cats;
  } catch (e) {
    console.error('[pluto] getCategories error:', e.message);
    return [];
  }
}

async function getCategoryItems(categoryId, offset, limit) {
  try {
    const items = await getVodItems();
    const filtered = items.filter(item => {
      const genre = item.genre || item.group || 'Movies';
      return genre === categoryId;
    });
    const start = offset || 0;
    const end = start + (limit || 100);
    return filtered.slice(start, end);
  } catch (e) {
    console.error('[pluto] getCategoryItems error:', e.message);
    return [];
  }
}

async function search(query) {
  try {
    const items = await getVodItems();
    const q = query.toLowerCase();
    const results = items.filter(item => {
      const name = (item.name || item.title || '').toLowerCase();
      const desc = (item.description || item.summary || '').toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
    console.log('[pluto] search "' + query + '" results:', results.length);
    return results.slice(0, 50);
  } catch (e) {
    console.error('[pluto] search error:', e.message);
    return [];
  }
}

async function getItem(plutoId) {
  try {
    const items = await getVodItems();
    return items.find(item => (item.id || item._id) === plutoId) || null;
  } catch (e) {
    console.error('[pluto] getItem error:', e.message);
    return null;
  }
}

module.exports = { getCategories, getCategoryItems, search, getItem };
