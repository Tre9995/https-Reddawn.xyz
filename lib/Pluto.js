// lib/pluto.js
//
// Thin client around Pluto TV's public VOD catalog API.
// Pluto TV is a free, ad-supported, licensed streaming service owned by
// Paramount. This client only reads their public on-demand catalog
// endpoints and never touches torrents, debrid services, or unlicensed
// sources.

const axios = require('axios');
const NodeCache = require('node-cache');

const BASE = 'https://service-vod.clusters.pluto.tv/v4/vod';

// Cache responses for 10 minutes so we don't hammer Pluto's API and so
// repeated Stremio requests are fast.
const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

const client = axios.create({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    Accept: 'application/json',
  },
});

async function cachedGet(key, url, params) {
  const cached = cache.get(key);
  if (cached) return cached;

  const { data } = await client.get(url, { params });
  cache.set(key, data);
  return data;
}

/**
 * Fetch the list of VOD categories (genres / collections) Pluto exposes.
 */
async function getCategories() {
  const key = 'categories';
  try {
    const data = await cachedGet(key, `${BASE}/categories`);
    return data.categories || data || [];
  } catch (err) {
    console.error('[pluto] getCategories failed:', err.message);
    return [];
  }
}

/**
 * Fetch items (movies) for a given category id/slug, paginated.
 */
async function getCategoryItems(categoryId, page = 1) {
  const key = `cat:${categoryId}:${page}`;
  try {
    const data = await cachedGet(key, `${BASE}/categories/${categoryId}/items`, {
      page,
      pageSize: 50,
    });
    return data.items || data.data || data || [];
  } catch (err) {
    console.error(`[pluto] getCategoryItems(${categoryId}) failed:`, err.message);
    return [];
  }
}

/**
 * Search Pluto's VOD catalog by free-text query.
 */
async function search(query) {
  const key = `search:${query.toLowerCase()}`;
  try {
    const data = await cachedGet(key, `${BASE}/search`, { q: query });
    return data.items || data.data || data || [];
  } catch (err) {
    console.error(`[pluto] search("${query}") failed:`, err.message);
    return [];
  }
}

/**
 * Look up full details (including playback manifest) for one VOD item by id.
 */
async function getItem(id) {
  const key = `item:${id}`;
  try {
    const data = await cachedGet(key, `${BASE}/items`, { ids: id });
    const items = data.items || data.data || data || [];
    return Array.isArray(items) ? items[0] : items;
  } catch (err) {
    console.error(`[pluto] getItem(${id}) failed:`, err.message);
    return null;
  }
}

module.exports = {
  getCategories,
  getCategoryItems,
  search,
  getItem,
};
