'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Pluto TV via its real public API.
// Fixes:
//   1. Force US region via X-Forwarded-For header (US East IP)
//   2. Pass sessionToken in stream URL so Pluto accepts the request
//   3. Use proper deviceId (random UUID stable per session)
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

// ─── Stable random device ID for this server session ─────────────────────────
const DEVICE_ID = 'reddawn-' + Math.random().toString(36).slice(2) + Date.now().toString(36);

// ─── US East IP — forces Pluto to serve the US catalog in English ─────────────
const US_IP = '108.82.206.181';

const BOOT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Origin': 'https://pluto.tv',
  'Referer': 'https://pluto.tv/',
  'X-Forwarded-For': US_IP,
};

const client = axios.create({ timeout: 20000, headers: BOOT_HEADERS });

// ─── Step 1: get session token ────────────────────────────────────────────────
async function getSession() {
  const hit = cacheGet('session');
  if (hit) return hit;

  console.log('[pluto] fetching session from boot API (US region)...');
  const { data } = await client.get('https://boot.pluto.tv/v4/start', {
    params: {
      appName: 'web',
      appVersion: '8.0.0',
      deviceVersion: '122.0.0',
      deviceModel: 'web',
      deviceMake: 'chrome',
      deviceType: 'web',
      clientID: DEVICE_ID,
      clientModelNumber: '1.0.0',
      serverSideAds: 'false',
      drmCapabilities: 'widevine:L3',
      blockingMode: '',
      marketingRegion: 'US',
    },
  });

  const token = data.sessionToken;
  if (!token) throw new Error('No sessionToken in boot response');
  console.log('[pluto] session token obtained');

  const session = { token, deviceId: DEVICE_ID };
  cacheSet('session', session, 3.5 * 60 * 60 * 1000); // 3.5 hours
  return session;
}

// ─── Build a working HLS stream URL ──────────────────────────────────────────
function buildStreamUrl(channelId, token, deviceId) {
  const params = new URLSearchParams({
    appName: 'web',
    appVersion: '8.0.0',
    clientID: deviceId,
    clientModelNumber: '1.0.0',
    deviceDNT: '0',
    deviceId: deviceId,
    deviceMake: 'chrome',
    deviceModel: 'web',
    deviceType: 'web',
    deviceVersion: '122.0.0',
    marketingRegion: 'US',
    serverSideAds: 'true',
    sessionToken: token,
    sid: deviceId,
    userId: '',
  });
  return `https://service-stitcher.clusters.pluto.tv/stitch/hls/channel/${channelId}/master.m3u8?${params.toString()}`;
}

// ─── Step 2: fetch full channel list ─────────────────────────────────────────
async function fetchChannels() {
  const hit = cacheGet('channels');
  if (hit) return hit;

  const { token, deviceId } = await getSession();

  console.log('[pluto] fetching US channel list...');
  const { data } = await client.get(
    'https://service-channels.clusters.pluto.tv/v2/guide/channels',
    {
      headers: {
        ...BOOT_HEADERS,
        Authorization: `Bearer ${token}`,
      },
      params: { offset: '0', limit: '1000', sort: 'number:asc' },
    }
  );

  const raw = data.data || [];
  console.log(`[pluto] got ${raw.length} channels`);

  // Also fetch categories so we can group properly
  let categoryMap = {};
  try {
    const catResp = await client.get(
      'https://service-channels.clusters.pluto.tv/v2/guide/categories',
      {
        headers: { ...BOOT_HEADERS, Authorization: `Bearer ${token}` },
        params: { offset: '0', limit: '500' },
      }
    );
    for (const cat of (catResp.data.data || [])) {
      for (const id of (cat.channelIDs || [])) {
        categoryMap[id] = cat.name;
      }
    }
    console.log('[pluto] categories fetched, entries:', Object.keys(categoryMap).length);
  } catch (e) {
    console.warn('[pluto] category fetch failed (non-fatal):', e.message);
  }

  const channels = raw.map(ch => {
    const id = ch._id || ch.id;
    const logo = (ch.images || []).find(img => img.type === 'colorLogoPNG')?.url
              || (ch.images || [])[0]?.url
              || undefined;

    return {
      id,
      name:      ch.name || 'Unknown',
      group:     categoryMap[id] || ch.category || 'General',
      summary:   ch.summary || ch.description || '',
      logo,
      number:    ch.number,
      streamUrl: buildStreamUrl(id, token, deviceId),
    };
  });

  cacheSet('channels', channels, 55 * 60 * 1000); // 55 min (refresh before token expires)
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
