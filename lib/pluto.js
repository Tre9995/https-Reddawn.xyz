'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Pluto TV via its real public API (no account required).
//
// Flow:
//   1. GET boot.pluto.tv/v4/start  →  { sessionToken, ... }
//   2. GET service-channels.clusters.pluto.tv/v2/guide/channels
//        with Authorization: Bearer <sessionToken>
//      →  { data: [ { id, name, number, images, summary, ... } ] }
//   3. Stream URLs are built from the channel id using the public stitcher
// ─────────────────────────────────────────────────────────────────────────────

const axios = require('axios');

// ─── Simple cache ─────────────────────────────────────────────────────────────
const _cache = new Map();
function cacheGet(k) {
  const e = _cache.get(k);
  if (!e || Date.now() > e.expires) return null;
  return e.value;
}
function cacheSet(k, v, ttlMs) {
  _cache.set(k, { value: v, expires: Date.now() + ttlMs });
}

// ─── HTTP client ──────────────────────────────────────────────────────────────
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Origin': 'https://pluto.tv',
  'Referer': 'https://pluto.tv/',
};

const client = axios.create({ timeout: 20000, headers: BROWSER_HEADERS });

// ─── Step 1: get session token ─────────────────────────────────────────────────
async function getSessionToken() {
  const hit = cacheGet('sessionToken');
  if (hit) return hit;

  console.log('[pluto] fetching session token from boot API...');
  const { data } = await client.get('https://boot.pluto.tv/v4/start', {
    params: {
      appName: 'web',
      appVersion: '8.0.0',
      deviceVersion: '122.0.0',
      deviceModel: 'web',
      deviceMake: 'chrome',
      deviceType: 'web',
      clientID: 'reddawn-addon-' + Math.random().toString(36).slice(2),
      clientModelNumber: '1.0.0',
      serverSideAds: 'false',
      drmCapabilities: 'widevine:L3',
      blockingMode: '',
    },
  });

  const token = data.sessionToken;
  if (!token) throw new Error('No sessionToken in boot response');
  console.log('[pluto] session token obtained');

  // Cache for 3.5 hours (tokens last ~4 hours)
  cacheSet('sessionToken', token, 3.5 * 60 * 60 * 1000);
  return token;
}

// ─── Step 2: fetch channel list ────────────────────────────────────────────────
async function fetchChannels() {
  const hit = cacheGet('channels');
  if (hit) return hit;

  const token = await getSessionToken();

  console.log('[pluto] fetching channel list...');
  const { data } = await client.get(
    'https://service-channels.clusters.pluto.tv/v2/guide/channels',
    {
      headers: { Authorization: `Bearer ${token}` },
      params: { offset: '0', limit: '1000', sort: 'number:asc' },
    }
  );

  const raw = data.data || [];
  console.log(`[pluto] got ${raw.length} channels`);

  // Normalize into our internal shape
  const channels = raw.map(ch => {
    const logo = (ch.images || []).find(img => img.type === 'colorLogoPNG')?.url
              || (ch.images || [])[0]?.url
              || undefined;

    // Build HLS stream URL using Pluto's public stitcher
    const streamUrl =
      `https://service-stitcher.clusters.pluto.tv/stitch/hls/channel/${ch._id || ch.id}/master.m3u8` +
      `?deviceType=web&deviceMake=chrome&deviceModel=web&sid=${ch._id || ch.id}` +
      `&deviceId=${ch._id || ch.id}&deviceVersion=122.0.0&appVersion=8.0.0` +
      `&userId=&deviceDNT=0&marketingRegion=US&serverSideAds=false`;

    return {
      id:        ch._id || ch.id,
      name:      ch.name || 'Unknown',
      group:     ch.category || ch.group || 'General',
      summary:   ch.summary || ch.description || '',
      logo:      logo,
      number:    ch.number,
      streamUrl: streamUrl,
    };
  });

  // Cache 1 hour
  cacheSet('channels', channels, 60 * 60 * 1000);
  return channels;
}

// ─── Public API ───────────────────────────────────────────────────────────────

async function getCategories() {
  try {
    const channels = await fetchChannels();
    const map = {};
    for (const ch of channels) {
      const g = ch.group || 'General';
      if (!map[g]) map[g] = { id: g, name: g };
    }
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  } catch (e) {
    console.error('[pluto] getCategories error:', e.message);
    return [];
  }
}

async function getCategoryItems(categoryId, offset, limit) {
  try {
    const channels = await fetchChannels();
    const filtered = categoryId
      ? channels.filter(ch => ch.group === categoryId)
      : channels;
    const start = Number(offset) || 0;
    return filtered.slice(start, start + (Number(limit) || 100));
  } catch (e) {
    console.error('[pluto] getCategoryItems error:', e.message);
    return [];
  }
}

async function search(query) {
  try {
    const channels = await fetchChannels();
    const q = query.toLowerCase();
    return channels
      .filter(ch =>
        ch.name.toLowerCase().includes(q) ||
        (ch.group || '').toLowerCase().includes(q) ||
        (ch.summary || '').toLowerCase().includes(q)
      )
      .slice(0, 50);
  } catch (e) {
    console.error('[pluto] search error:', e.message);
    return [];
  }
}

async function getItem(plutoId) {
  try {
    const channels = await fetchChannels();
    return channels.find(ch => ch.id === plutoId) || null;
  } catch (e) {
    console.error('[pluto] getItem error:', e.message);
    return null;
  }
}

module.exports = { getCategories, getCategoryItems, search, getItem };
