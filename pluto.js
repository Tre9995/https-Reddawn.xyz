'use strict';
const axios = require('axios');

// ─── Cache ───────────────────────────────────────────────────────────────────
const _cache = new Map();
const cache = {
  get(k) { const e = _cache.get(k); if (!e || Date.now() > e.x) { _cache.delete(k); return null; } return e.v; },
  set(k, v) { _cache.set(k, { v, x: Date.now() + 300000 }); },
};

// ─── Pluto TV public endpoints (no auth required) ────────────────────────────
// These are the public FAST/VOD endpoints used by Pluto TV's web app
const BASE = 'https://api.pluto.tv';
const SEARCH_URL = BASE + '/v3/vod/search';
const CATS_URL   = BASE + '/v2/vod/categories';
const ITEMS_URL  = BASE + '/v2/vod/categories/{id}/items';
const ITEM_URL   = BASE + '/v2/vod/series/{id}';

// Pluto TV requires these params on every request
const BASE_PARAMS = {
  appName: 'web',
  appVersion: '7.5.2',
  deviceDNT: '0',
  deviceId: 'web-' + Math.random().toString(36).slice(2),
  deviceLat: '0',
  deviceLon: '0',
  deviceMake: 'Chrome',
  deviceModel: 'web',
  deviceType: 'web',
  deviceVersion: '114.0.0',
  includeExtendedEvents: 'false',
  serverSideAds: 'true',
  skipAdvertisements: 'false',
  userId: '',
  sid: 'reddawn-' + Date.now(),
};

const client = axios.create({
  timeout: 20000,
  headers: {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Origin': 'https://pluto.tv',
    'Referer': 'https://pluto.tv/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
  },
});

// ─── Session token via boot ───────────────────────────────────────────────────
let _token = null;
let _tokenExp = 0;

async function fetchToken() {
  if (_token && Date.now() < _tokenExp) return _token;
  try {
    const params = Object.assign({}, BASE_PARAMS, { clientTime: new Date().toISOString() });
    const res = await client.get('https://boot.pluto.tv/v4/start', { params });
    if (res.data && res.data.sessionToken) {
      _token = res.data.sessionToken;
      _tokenExp = Date.now() + 50 * 60 * 1000;
      console.log('[pluto] token ok');
    }
  } catch (e) {
    console.error('[pluto] boot error:', e.message);
  }
  return _token;
}

async function apiGet(url, extra) {
  const token = await fetchToken();
  const params = Object.assign({}, BASE_PARAMS, { clientTime: new Date().toISOString() }, extra || {});
  const headers = token ? { Authorization: 'Bearer ' + token } : {};
  const res = await client.get(url, { params, headers });
  return res.data;
}

async function cached(key, url, extra) {
  const hit = cache.get(key);
  if (hit) return hit;
  const data = await apiGet(url, extra);
  cache.set(key, data);
  return data;
}

// ─── Public functions ─────────────────────────────────────────────────────────

async function getCategories() {
  try {
    const data = await cached('cats', CATS_URL, { includeItems: 'false', onDemand: 'true' });
    const cats = (data && (data.categories || data.data || []));
    console.log('[pluto] categories count:', Array.isArray(cats) ? cats.length : 'not array', 'keys:', data ? Object.keys(data).join(',') : 'null');
    return Array.isArray(cats) ? cats : [];
  } catch (e) {
    console.error('[pluto] getCategories error:', e.message);
    return [];
  }
}

async function getCategoryItems(id, offset, limit) {
  if (!id) return [];
  try {
    const url = ITEMS_URL.replace('{id}', encodeURIComponent(id));
    const data = await cached('ci:' + id, url, { offset: offset || 0, limit: limit || 100, onDemand: 'true' });
    const items = data && (data.items || data.vod || data.data || []);
    return Array.isArray(items) ? items : [];
  } catch (e) {
    console.error('[pluto] getCategoryItems error:', e.message);
    return [];
  }
}

async function search(q) {
  if (!q) return [];
  try {
    const data = await cached('s:' + q, SEARCH_URL, { query: q, onDemand: 'true' });
    const items = data && (data.vod || data.items || data.data || []);
    console.log('[pluto] search keys:', data ? Object.keys(data).join(',') : 'null');
    return Array.isArray(items) ? items : [];
  } catch (e) {
    console.error('[pluto] search error:', e.message);
    return [];
  }
}

async function getItem(id) {
  if (!id) return null;
  try {
    const url = ITEM_URL.replace('{id}', encodeURIComponent(id));
    const data = await cached('i:' + id, url);
    return (data && data.vod) ? data.vod : data;
  } catch (e) {
    console.error('[pluto] getItem error:', e.message);
    return null;
  }
}

module.exports = { getCategories, getCategoryItems, search, getItem };
