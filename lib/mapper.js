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
 * Helper to safely extract images from Pluto's image array
 */
function getPlutoImage(images, preferredType) {
  if (!Array.isArray(images) || images.length === 0) return undefined;
  
  // Look for preferred layout type (e.g., 'poster' or 'featured')
  const match = images.find(img => img.type === preferredType);
  if (match && match.url) return match.url;
  
  // Fallback to any available image URL
  const fallback = images.find(img => img.url);
  return fallback ? fallback.url : undefined;
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
    // Correctly targets Pluto's structured image array
    poster: getPlutoImage(item.images, 'poster'),
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
    background: getPlutoImage(item.images, 'featured') || base.poster,
    genres: item.genre ? [item.genre] : (item.genres || undefined),
    runtime: item.duration ? `${Math.round(item.duration / 60000)} min` : undefined,
  };
}

/**
 * Build Stremio stream object(s) from a Pluto item's playback info.
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
  
  for (let url of candidates) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    
    // Clean up Pluto macro replacements to prevent media player decoder errors
    url = url
      .replace(/__deviceLat__/g, '0')
      .replace(/__deviceLon__/g, '0')
      .replace(/__sid__/g, 'reddawn_session')
      .replace(/__userId__/g, 'reddawn_user');

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
    
