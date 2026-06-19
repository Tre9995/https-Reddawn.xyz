'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Maps Pluto TV channel objects (from parsed M3U) → Stremio meta/stream format
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
    type:        'movie',
    name:        item.name || 'Unknown Channel',
    poster:      item.logo || undefined,
    posterShape: 'landscape',   // channel logos are usually wide
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
    background: item.logo || undefined,
    releaseInfo: 'LIVE',
    runtime:     'Live TV',
  };
}

/**
 * Build Stremio stream object from a channel's HLS URL.
 */
function toStreams(item) {
  if (!item || !item.streamUrl) return [];

  return [
    {
      url:   item.streamUrl,
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
