'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Pluto TV via its real public API — FORCED US REGION
//
// KEY FIX (this version):
//   The old code baked `sessionToken` into each channel's `streamUrl` and
//   cached that for 55 minutes. Pluto's sessionToken is short-lived (good
//   for a few minutes of active streaming, not 55), so most stream requests
//   were handed a dead token and Pluto's stitcher rejected them — which is
//   why playback "didn't work" except right after a fresh deploy/restart.
//
//   Fix: channel METADATA (name/logo/group) is cached long (55 min), but the
//   STREAM URL is now built fresh, on every single stream request, using a
//   session that's force-refreshed if it's older than a safe TTL. We never
//   store a stream URL in the long-lived cache.
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

// ─── US IP passed as a QUERY PARAM — this is what Pluto actually checks ──────
const US_IP = '76.89.234.101'; // US residential IP (Los Angeles, CA)

const BOOT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Origin': 'https://pluto.tv',
  'Referer': 'https://pluto.tv/',
};

const client = axios.create({ timeout: 20000, headers: BOOT_HEADERS });

// Sessions are short-lived. Re-fetch a new one before each stream request if
// the cached one is older than this. Keep it well under what Pluto allows.
const SESSION_TTL_MS = 4 * 60 * 1000; // 4 minutes — safely inside token lifetime

// ─── Step 1: get session token (always fresh-ish, short TTL) ────────────────
async function getSession(forceFresh) {
  if (!forceFresh) {
    const hit = cacheGet('session');
    if (hit) return hit;
  }

  console.log('[pluto] fetching session (forced US region via clientIP param)...');

  const { data } = await client.get('https://boot.pluto.tv/v4/start', {
    params: {
      appName:            'web',
      appVersion:         '9.14.0',
      deviceVersion:      '124.0.0',
      deviceModel:        'web',
      deviceMake:         'chrome',
      deviceType:         'web',
      clientID:           DEVICE_ID,
      clientModelNumber:  '1.0.0',
      // TEST: previously 'true' + widevine:L3. Hypothesis: the multi-language
      // generic "stream ended" filler we're seeing instead of real
      // programming may be Pluto's stitcher falling back when server-side
      // ad insertion or DRM licensing can't be resolved for this synthetic
      // session. Disabling both to test whether real content plays.
      serverSideAds:      'false',
      drmCapabilities:    '',
      blockingMode:       '',
      marketingRegion:    'US',
      clientIP:           US_IP,
    },
  });

  const token = data.sessionToken;
  if (!token) throw new Error('[pluto] No sessionToken in boot response');

  const session = data.session || {};
  const region = session.marketingRegion || session.activeRegion || session.countryCode || 'unknown';
  console.log(`[pluto] session OK — region: ${region}, token: ${token.slice(0, 12)}...`);

  // Hard check, not just a warning: if the clientIP/marketingRegion spoof
  // didn't actually work, every channel we fetch will be for the WRONG
  // country (not just a few mislabeled ones — the entire catalog and every
  // streamUrl will be sourced from wherever Pluto thinks the server is).
  // Filtering by channel name afterwards cannot fix this. Fail loudly so it
  // shows up in logs/the debug endpoints instead of silently serving the
  // wrong region.
  if (region && region !== 'US') {
    const msg = `[pluto] REGION SPOOF FAILED — Pluto returned region "${region}" instead of "US". ` +
                `The catalog and stream URLs from this session will be for "${region}", not the US. ` +
                `Check /debug/regioncheck for details.`;
    console.error(msg);
    const err = new Error(msg);
    err.code = 'WRONG_REGION';
    err.actualRegion = region;
    throw err;
  }

  // The boot response tells us the REAL stitcher host to use for this
  // session (data.servers.stitcher). The old code hardcoded
  // "service-stitcher.clusters.pluto.tv", which is not the host Pluto's own
  // boot response actually points to (it's something like
  // "cfd-v4-service-channel-stitcher-use1-1.prd.pluto.tv" and can change).
  // Always use what boot.pluto.tv tells us, not a hardcoded guess.
  const stitcherHost = (data.servers && data.servers.stitcher) || 'https://service-stitcher.clusters.pluto.tv';

  const sessionObj = { token, deviceId: DEVICE_ID, fetchedAt: Date.now(), stitcherHost };
  cacheSet('session', sessionObj, SESSION_TTL_MS);
  return sessionObj;
}

// ─── Build a working HLS stream URL ──────────────────────────────────────────
function buildStreamUrl(channelId, token, deviceId, stitcherHost) {
  const params = new URLSearchParams({
    appName:           'web',
    appVersion:        '9.14.0',
    clientID:          deviceId,
    clientModelNumber: '1.0.0',
    deviceDNT:         '0',
    deviceId:          deviceId,
    deviceMake:        'chrome',
    deviceModel:       'web',
    deviceType:        'web',
    deviceVersion:     '124.0.0',
    marketingRegion:   'US',
    serverSideAds:     'false',
    sessionToken:      token,
    sid:               deviceId,
    clientIP:          US_IP,
    userId:            '',
  });
  // stitcherHost comes from the boot response (data.servers.stitcher) — the
  // real, current stitcher endpoint Pluto told us to use for this session.
  // The old code hardcoded "service-stitcher.clusters.pluto.tv", which is
  // NOT the host Pluto's own boot response points to (real example seen:
  // "https://cfd-v4-service-channel-stitcher-use1-1.prd.pluto.tv") — that
  // mismatch alone could fail every stream request regardless of region.
  const host = (stitcherHost || 'https://service-stitcher.clusters.pluto.tv').replace(/\/+$/, '');
  return `${host}/stitch/hls/channel/${channelId}/master.m3u8?${params.toString()}`;
}

// ─── Public: get a guaranteed-fresh stream URL for a channel ────────────────
// This is what index.js's /proxy/stream route should call right before
// fetching from Pluto — NOT a cached value from the channel list.
async function getFreshStreamUrl(channelId) {
  // Always force a brand-new session for playback requests. A few hundred ms
  // of extra latency on stream start is a much smaller problem than dead links.
  const { token, deviceId, stitcherHost } = await getSession(true);
  return buildStreamUrl(channelId, token, deviceId, stitcherHost);
}

// ─── Step 2: fetch US channel list (metadata only — safe to cache) ─────────
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
      params: {
        offset:          '0',
        limit:           '1000',
        sort:            'number:asc',
        marketingRegion: 'US',
        clientIP:        US_IP,
      },
    }
  );

  const raw = data.data || [];
  console.log(`[pluto] got ${raw.length} channels`);

  let categoryMap = {};
  try {
    const catResp = await client.get(
      'https://service-channels.clusters.pluto.tv/v2/guide/categories',
      {
        headers: { ...BOOT_HEADERS, Authorization: `Bearer ${token}` },
        params: {
          offset:          '0',
          limit:           '500',
          marketingRegion: 'US',
          clientIP:        US_IP,
        },
      }
    );
    for (const cat of (catResp.data.data || [])) {
      for (const id of (cat.channelIDs || [])) {
        categoryMap[id] = cat.name;
      }
    }
    console.log('[pluto] categories fetched:', Object.keys(categoryMap).length);
  } catch (e) {
    console.warn('[pluto] category fetch failed (non-fatal):', e.message);
  }

  // English-only filter: confirmed via /debug/allnames that Pluto groups
  // ALL Spanish-language channels under one real category: "En Español"
  // (Cine Premiere, Pluto TV Novelas, EstrellaTV, CNN Noticias, etc).
  // The old filter guessed at ch.country/ch.language fields that don't
  // actually exist on this endpoint — this filters on the real category
  // name instead, which is the one place Pluto's grouping is unambiguous.
  const EXCLUDED_GROUPS = new Set(['En Español', 'En Espanol']);
  const filtered = raw.filter(ch => {
    const id = ch._id || ch.id;
    const group = categoryMap[id] || ch.category || '';
    return !EXCLUDED_GROUPS.has(group);
  });

  console.log(`[pluto] after English-only filter: ${filtered.length} channels (excluded ${raw.length - filtered.length})`);

  // IMPORTANT: no streamUrl baked in here anymore — that field is now built
  // fresh per-request via getFreshStreamUrl(). We keep metadata only.
  const channels = filtered.map(ch => {
    const id = ch._id || ch.id;
    const logo =
      (ch.images || []).find(img => img.type === 'colorLogoPNG')?.url ||
      (ch.images || []).find(img => img.type === 'logo')?.url ||
      (ch.images || [])[0]?.url ||
      undefined;

    return {
      id,
      name:    ch.name || 'Unknown Channel',
      group:   categoryMap[id] || ch.category || 'General',
      summary: ch.summary || ch.description || '',
      logo,
      number:  ch.number,
      // streamUrl intentionally omitted — fetch fresh via getFreshStreamUrl(id)
    };
  });

  cacheSet('channels', channels, 55 * 60 * 1000); // metadata only, safe to cache
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

module.exports = {
  getCategories,
  getCategoryItems,
  search,
  getItem,
  getFreshStreamUrl,
};
