// lib/mapper.js
//
// Converts Pluto TV API objects into the shapes Stremio expects
// (catalog meta previews, full meta objects, and stream objects).

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
 * Build a lightweight catalog-row preview from a Pluto item.
 */
function toMetaPreview(item) {
  if (!item) return null;
  const id = item.id || item._id;
  if (!id) return null;

  return {
    id: toStremioId(id),
    type: 'movie',
    name: item.name || item.title || 'Untitled',
    poster: item.poster || item.posterImage || item.thumbnail || undefined,
    posterShape: 'poster',
    description: item.description || item.summary || undefined,
    releaseInfo: item.releaseYear ? String(item.releaseYear) : undefined,
  };
}

/**
 * Build a full meta object (used for the /meta/ endpoint).
 */
function toMetaDetail(item) {
  const base = toMetaPreview(item);
  if (!base) return null;

  return {
    ...base,
    background: item.background || item.heroImage || base.poster,
    genres: item.genre ? [item.genre] : item.genres || undefined,
    runtime: item.duration ? `${Math.round(item.duration / 60000)} min` : undefined,
  };
}

/**
 * Build Stremio stream object(s) from a Pluto item's playback info.
 * Pluto serves HLS (.m3u8) manifests for on-demand playback, which
 * Stremio's built-in player supports natively.
 */
function toStreams(item) {
  if (!item) return [];

  const candidates = [];

  if (item.stitched && Array.isArray(item.stitched.urls)) {
    for (const u of item.stitched.urls) {
      if (u.url) candidates.push(u.url);
    }
  }
  if (item.streamUrl) candidates.push(item.streamUrl);
  if (item.hlsUrl) candidates.push(item.hlsUrl);
  if (item.video && item.video.url) candidates.push(item.video.url);

  const seen = new Set();
  const streams = [];
  for (const url of candidates) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    streams.push({
      url,
      title: 'Pluto TV (Free, ad-supported)',
      behaviorHints: {
        notWebReady: false,
      },
    });
  }

  return streams;
}

module.exports = {
  toStremioId,
  fromStremioId,
  toMetaPreview,
  toMetaDetail,
  toStreams,
};
