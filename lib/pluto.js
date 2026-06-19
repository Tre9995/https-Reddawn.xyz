'use strict';

// ─── Dependencies ────────────────────────────────────────────────────────────
const axios = require('axios');

// ─── Simple in-memory TTL cache ──────────────────────────────────────────────
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const _cache = new Map();

const cache = {
  get(key) {
    const entry = _cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      _cache.delete(key);
      return null;
    }
    return entry.value;
  },
  set(key, value) {
    _cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
  },
};

// ─── Pluto TV API constants ───────────────────────────────────────────────────
const BOOT_URL       = 'https://boot.pluto.tv/v4/start';
const VOD_CATS_URL   = 'https://api.pluto.tv/v2/vod/categories';
const VOD_ITEMS_URL  = 'https://api.pluto.tv/v2/vod/categories/{id}/items';
const VOD_SEARCH_URL = 'https://api.pluto.tv/v3/vod/search';
const VOD_ITEM_URL   = 'https://api.pluto.tv/v2/vod/series/{id}';

// Required device parameters that Pluto TV checks on every request
const DEFAULT_PARAMS = {
  appName:           'web',
  appVersion:        '7.5.1',
  deviceVersion:     '94.0.0',
  deviceModel:       'web',
  deviceMake:        'chrome',
  deviceType:        'web',
  clientModelNumber: 'na',
  serverSideAds:     'false',
  drmCapabilities:   '',
  clientTime:        () => new Date().toISOString(),
};

// ─── Axios client ────────────────────────────────────────────────────────────
const client = axios.create({
  timeout: 15000,
  headers: {
    'Accept':     'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36',
    'Origin':     'https://pluto.tv',
    'Referer':    'https://pluto.tv/',
  },
});

// ─── Session token (refreshed automatically) ─────────────────────────────────
let sessionToken     = null;
let sessionExpiresAt = 0;

async function getSessionToken() {
  if (sessionToken && Date.now() < sessionExpiresAt) return sessionToken;

  try {
    const params = buildParams();
    const { data } = await client.get(BOOT_URL, { params });
    if (data && data.sessionToken) {
      sessionToken     = data.sessionToken;
      sessionExpiresAt = Date.now() + 55 * 60 * 1000;
      console.log('[pluto] New session token acquired');
    }
  } catch (err) {
    console.error('[pluto] Boot request failed:', err.message);
  }

  return sessionToken;
}

function buildParams(extra = {}) {
  const p = {};
  for (const [k, v] of Object.entries(DEFAULT_PARAMS)) {
    p[k] = typeof v === 'function' ? v() : v;
  }
  return { ...p, ...extra };
}

async function authorizedGet(url, params = {}) {
  const token  = await getSessionToken();
  const config = { params: buildParams(params) };
  if (token) config.headers = { Authorization: `Bearer ${token}` };
  const { data } = await client.get(url, config);
  return data;
}

async function cachedGet(cacheKey, url, params = {}) {
  const hit = cache.get(cacheKey);
  if (hit) return hit;
  const data = await authorizedGet(url, params);
  cache.set(cacheKey, data);
  return data;
}

// ─── Public API ──────────────────────────────────────────────────────────────

async function getCategories() {
  try {
    const data = await cachedGet('categories', VOD_CATS_URL, {
      includeItems: 'false',
      onDemand:     'true',
    });
    return (data && data.categories) ? data.categories : [];
