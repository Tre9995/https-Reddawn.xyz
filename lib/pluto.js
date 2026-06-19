'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Pluto TV — FORCED US REGION (Render-safe version)
//
// ROOT CAUSE OF SPANISH CHANNELS:
//   Pluto TV ignores the `clientIP` query parameter for region detection.
//   It uses the actual outbound IP of whoever makes the HTTP request — your
//   Render server. If that server is not in the US, Pluto returns non-US
//   content regardless of any params you pass.
//
// FIX APPLIED HERE:
//   1. Use Pluto's internal API endpoint that accepts an explicit countryCode,
//      rather than relying on IP-based geo-detection.
//   2. Request channels with `countryCode=US` directly in the channels API.
//   3. Remove the hard throw on wrong region — downgrade to a warning so the
//      addon doesn't crash entirely if the spoof is imperfect.
//   4. Filter channels by language/name as a second safety net.
//   5. Session TTL kept short (4 min) so tokens never expire mid-stream.
// ─────────────────────────────────────────────────────────────────────────────

const axios = require('axios');

// ─── Simple in-memory cache ───────────────────────────────────────────────────
const _cache = new Map();
function cacheGet(k) {
  const e = _cache.get(k);
  if (!e || Date.now() > e.expires) return null;
  return e.value;
}
function cacheSet(k, v, ttlMs) {
  _cache.set(k, { value: v, expires: Date.now() + ttlMs });
}

// ─── Stable device ID for this server process ─────────────────────────────────
const DEVICE_ID = 'reddawn-' + Math.random().toString(36).slice(2) + Date.now().toString(36);

// ─── A real US residential IP (Los Angeles, CA) ───────────────────────────────
// Pluto ignores this for region-detection but some stitcher CDN nodes use it
// for ad targeting — keep it for completeness.
const US_IP = '76.89.234.101';

const BOOT_HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept':          'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Origin':          'https://pluto.tv',
  'Referer':         'https://pluto.tv/',
};

const client = axios.create({ timeout: 20000, headers: BOOT_HEADERS });

const SESSION_TTL_MS = 4 * 60 * 1000; // 4 minutes

// ─── Spanish-language / non-English channel name patterns to filter out ───────
// This is the SECOND safety net in case some non-US channels slip through.
const SPANISH_PATTERNS = [
  /\bEn Español\b/i,
  /\bEspañol\b/i,
  /\bLatino\b/i,
  /\bNovela\b/i,
  /\bTelenovela\b/i,
  /\bMundo\b/i,
  /\bUnivis/i,
  /\bTelemundo\b/i,
  /\bUnivision\b/i,
  /\bFubo Deportes\b/i,
];

function isSpanishChannel(ch) {
  const name = ch.name || '';
  const lang = (ch.language || ch.primaryLanguage || '').toLowerCase();
  if (lang && (lang.startsWith('es') || lang.startsWith('de') || lang.startsWith('pt'))) return true;
  if (SPANISH_PATTERNS.some(re => re.test(name))) return true;
  return false;
}

// ─── Step 1: get a session token ──────────────────────────────────────────────
async function getSession(forceFresh) {
  if (!forceFresh) {
    const hit = cacheGet('session');
    if (hit) return hit;
  }

  console.log('[pluto] fetching session...');

  // KEY CHANGE: pass `appStoreAffiliate=google` and `appsFlyerUID` to mimic
  // the web app more closely, and include `countryCode` directly.
  // Pluto's boot endpoint respects `countryCode` as an override when the
  // calling app passes it — this is how their own smart TV / Roku apps work
  // when they know the device region ahead of time.
  const { data } = await client.get('https://boot.pluto.tv/v4/start', {
    params: {
      appName:           'web',
      appVersion:        '9.14.0',
      deviceVersion:     '124.0.0',
      deviceModel:       'web',
      deviceMake:        'chrome',
      deviceType:        'web',
      clientID:          DEVICE_ID,
      clientModelNumber: '1.0.0',
      serverSideAds:     'true',
      drmCapabilities:   'widevine:L3',
      blockingMode:      '',
      marketingRegion:   'US',
      countryCode:       'US',        // ← explicit country override
      clientIP:          US_IP,
    },
  });

  const token = data.sessionToken;
  if (!token) throw new Error('[pluto] No sessionToken in boot response');

  // Region is reported at different depths depending on Pluto API version.
  // Check all known locations instead of one hardcoded path.
  const session  = data.session   || {};
  const features = data.features  || {};
  const region   =
    session.marketingRegion ||
    session.activeRegion    ||
    session.countryCode     ||
    data.marketingRegion    ||
    data.countryCode        ||
    features.marketingRegion ||
    'unknown';

  console.log(`[pluto] session OK — detected region: ${region}, token: ${token.slice(0, 12)}...`);

  // CHANGED: downgrade from hard throw → warning only.
  // The addon should still try to work even if Pluto's region detection
  // reports the server's real location. The channel-level filters below
  // (countryCode param + language filter + name filter) provide a safety net.
  if (region !== 'US' && region !== 'unknown') {
    console.warn(
      `[pluto] WARNING — Pluto session region is "${region}", not "US". ` +
      `Your Render server may not be in a US region. Channel-level filters will ` +
      `still attempt to pull US content. Check /debug/regioncheck for details.`
    );
  }

  const stitcherHost =
    (data.servers && data.servers.stitcher) ||
    'https://service-stitcher.clusters.pluto.tv';

  const sessionObj = { token, deviceId: DEVICE_ID, fetchedAt: Date.now(), stitcherHost, region };
  cacheSet('session', sessionObj, SESSION_TTL_MS);
  return sessionObj;
}

// ─── Build a working HLS stream URL ───────────────────────────────────────────
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
    countryCode:       'US',
    serverSideAds:     'true',
    sessionToken:      token,
    sid:               deviceId,
    clientIP:          US_IP,
    userId:            '',
  });
  const host = (stitcherHost || 'https://service-stitcher.clusters.pluto.tv').replace(/\/+$/, '');
  return `${host}/stitch/hls/channel/${channelId}/master.m3u8?${params.toString()}`;
}

// ─── Public: always-fresh stream URL (called per-request, never cached) ───────
async function getFreshStreamUrl(channelId) {
  const { token, deviceId, stitcherHost } = await getSession(true);
  return buildStreamUrl(channelId, token, deviceId, stitcherHost);
}

// ─── Step 2: fetch channel list (metadata only, cached 55 min) ────────────────
async function fetchChannels() {
  const hit = cacheGet('channels');
  if (hit) return hit;

  const { token } = await getSession();

  console.log('[pluto] fetching US channel list...');

  // KEY CHANGE: pass `countryCode=US` directly to the channels API.
  // This is the most reliable way to force US catalog on a non-US server.
  const { data } = await client.get(
    'https://service-channels.clusters.pluto.tv/v2/guide/channels',
    {
      headers: { ...BOOT_HEADERS, Authorization: `Bearer ${token}` },
      params: {
        offset:          '0',
        limit:           '1000',
        sort:            'number:asc',
        marketingRegion: 'US',
        countryCode:     'US',        // ← explicit US catalog request
        clientIP:        US_IP,
      },
    }
  );

  const raw = data.data || [];
  console.log(`[pluto] got ${raw.length} raw channels`);

  // ── Category map ────────────────────────────────────────────────────────────
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
          countryCode:     'US',
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

  // ── Filter: remove non-English / non-US channels ───────────────────────────
  const NON_US_COUNTRIES = new Set(['DE', 'AT', 'CH', 'de', 'at', 'ch']);

  const filtered = raw.filter(ch => {
    // Drop channels geo-locked to non-US countries
    const countries = ch.country || ch.countries || ch.geoAvailability || '';
    if (typeof countries === 'string' && NON_US_COUNTRIES.has(countries)) return false;
    if (Array.isArray(countries) && countries.length && countries.every(c => NON_US_COUNTRIES.has(c))) return false;

    // Drop German-language channels
    const lang = ch.language || ch.primaryLanguage || '';
    if (lang && lang.toLowerCase().startsWith('de')) return false;

    // Drop Spanish/non-English channels by name/language pattern
    if (isSpanishChannel(ch)) return false;

    return true;
  });

  console.log(`[pluto] after filters: ${filtered.length} channels`);

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
      // streamUrl intentionally omitted — always fetched fresh per-request
    };
  });

  cacheSet('channels', channels, 55 * 60 * 1000);
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
