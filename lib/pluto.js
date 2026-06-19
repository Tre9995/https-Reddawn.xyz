'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Pluto TV live channel data via matthuisman's public M3U mirror.
//
// WHY M3U AND NOT JSON?
//   i.mjh.nz only publishes Pluto TV as an M3U playlist + XML EPG.
//   There is no us.json VOD file — the previous code was pointing at a
//   URL that does not exist / returns an IPTV channels feed, not movies.
//   We parse the M3U, which gives us channels we can expose as Stremio
//   "movie" items (each channel = one playable entry with a live HLS stream).
// ─────────────────────────────────────────────────────────────────────────────

const axios = require('axios');

// Public M3U playlist from matthuisman's mirror (updated hourly, no auth needed)
const PLUTO_M3U_URL = 'https://i.mjh.nz/PlutoTV/us.m3u8';

// Simple in-memory cache
const _cache = new Map();
function cacheGet(k) {
  const e = _cache.get(k);
  if (!e || Date.now() > e.expires) return null;
  return e.value;
}
function cacheSet(k, v, ttlMs) {
  _cache.set(k, { value: v, expires: Date.now() + (ttlMs || 300000) });
}

const client = axios.create({
  timeout: 20000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; RedDawnAddon/1.0)',
    'Accept': '*/*',
  },
});

// ─── M3U Parser ──────────────────────────────────────────────────────────────
// Parses lines like:
//   #EXTINF:-1 tvg-id="abc123" tvg-logo="https://..." group-title="News",Channel Name
//   https://stream-url.m3u8
//
function parseM3U(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const channels = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith('#EXTINF')) continue;

    // Extract attributes from the EXTINF line
    const tvgId    = (line.match(/tvg-id="([^"]*)"/)      || [])[1] || '';
    const tvgLogo  = (line.match(/tvg-logo="([^"]*)"/)     || [])[1] || '';
    const tvgChno  = (line.match(/tvg-chno="([^"]*)"/)     || [])[1] || '';
    const group    = (line.match(/group-title="([^"]*)"/)  || [])[1] || 'General';
    // Channel name is after the last comma on the EXTINF line
    const nameMatch = line.match(/,(.+)$/);
    const name      = nameMatch ? nameMatch[1].trim() : 'Unknown Channel';

    // The next non-comment line is the stream URL
    let streamUrl = '';
    for (let j = i + 1; j < lines.length; j++) {
      if (!lines[j].startsWith('#')) {
        streamUrl = lines[j].trim();
        break;
      }
    }

    if (!streamUrl || !tvgId) continue;

    channels.push({
      id:       tvgId,
      name:     name,
      group:    group,
      logo:     tvgLogo,
      chno:     tvgChno,
      streamUrl: streamUrl,
    });
  }

  return channels;
}

// ─── Fetch & cache the full channel list ─────────────────────────────────────
async function fetchChannels() {
  const hit = cacheGet('channels');
  if (hit) return hit;

  console.log('[pluto] fetching M3U playlist...');
  const { data } = await client.get(PLUTO_M3U_URL);
  const channels = parseM3U(data);
  console.log(`[pluto] parsed ${channels.length} channels`);

  cacheSet('channels', channels, 60 * 60 * 1000); // cache 1 hour
  return channels;
}

// ─── Public API ──────────────────────────────────────────────────────────────

async function getCategories() {
  try {
    const channels = await fetchChannels();
    const groupMap = {};
    for (const ch of channels) {
      const g = ch.group || 'General';
      if (!groupMap[g]) groupMap[g] = { id: g, name: g, _id: g };
    }
    return Object.values(groupMap).sort((a, b) => a.name.localeCompare(b.name));
  } catch (e) {
    console.error('[pluto] getCategories error:', e.message);
    return [];
  }
}

async function getCategoryItems(categoryId, offset, limit) {
  try {
    const channels = await fetchChannels();
    // If no category filter, return all channels
    const filtered = categoryId
      ? channels.filter(ch => ch.group === categoryId)
      : channels;
    const start = Number(offset) || 0;
    const end   = start + (Number(limit) || 100);
    return filtered.slice(start, end);
  } catch (e) {
    console.error('[pluto] getCategoryItems error:', e.message);
    return [];
  }
}

async function search(query) {
  try {
    const channels = await fetchChannels();
    const q = query.toLowerCase();
    const results = channels.filter(ch =>
      ch.name.toLowerCase().includes(q) ||
      ch.group.toLowerCase().includes(q)
    );
    console.log(`[pluto] search "${query}" → ${results.length} results`);
    return results.slice(0, 50);
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
