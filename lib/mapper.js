'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Maps Pluto TV channel objects → Stremio meta/stream format
// Streams are proxied through YOUR server so Pluto sees a US IP,
// not the user's device IP.
//
// UPDATED: type changed from 'movie' to 'tv' to match manifest.json v1.0.1.
// Pluto channels are live linear TV, not on-demand movies — using the
// correct Stremio content type fixes how the app presents/handles them
// (live-playback UI expectations, no runtime/release-date mismatch, etc).
// ─────────────────────────────────────────────────────────────────────────────
const ADDON_ID_PREFIX = 'reddawn_pluto_';
function toStremioId(plutoId) {
  return `${ADDON_ID_PREFIX}${plutoId}`;
}
function fromStremioId(stremioId) {
  return stremioId.startsWith(ADDON_ID_PREFIX)
    ? stremioId.slice(ADDON_ID_PREFIX.length)
    : stremioId;
}
/**
 * Lightweight catalog-row preview shown in the Stremio browse grid.
 */
function toMetaPreview(item) {
  if (!item || !item.id) return null;
  return {
    id:          toStremioId(item.id),
    type:        'tv',
    name:        item.name || 'Unknown Channel',
    poster:      item.logo || undefined,
    posterShape: 'landscape',
    description: item.group ? `Genre: ${item.group}` : 'Live Pluto TV channel',
    genres:      item.group ? [item.group] : undefined,
  };
}
/**
 * Full meta object for the /meta/ endpoint (detail view).
 */
function toMetaDetail(item) {
  const base = toMetaPreview(item);
  if (!base) return null;
  return {
    ...base,
    background:  item.logo || undefined,
    releaseInfo: 'LIVE',
    runtime:     'Live TV',
  };
}
/**
 * Build Stremio stream object.
 * Points to /proxy/stream/:channelId on YOUR server instead of Pluto directly.
 * This means Pluto always sees your server's US IP, not the user's device.
 */
function toStreams(item, serverBaseUrl) {
  if (!item || !item.id) return [];
  // serverBaseUrl is passed in from index.js (e.g. https://https-reddawn-xyz.onrender.com)
  const proxyUrl = `${serverBaseUrl}/proxy/stream/${encodeURIComponent(item.id)}.m3u8`;
  return [
    {
      url:   proxyUrl,
      title: `📺 ${item.name}\n🆓 Free • Pluto TV (ad-supported)`,
      behaviorHints: {
        notWebReady: false,
      },
    },
  ];
}
module.exports = {
  toStremioId,
  fromStremioId,
  toMetaPreview,
  toMetaDetail,
  toStreams,
};
