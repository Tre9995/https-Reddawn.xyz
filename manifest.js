// manifest.js
//
// The manifest is what tells Stremio what this addon offers: which
// resources (catalog/meta/stream), which content types, and which
// catalogs to show in the discovery UI.

module.exports = {
  id: 'com.reddawn.plutofree',
  version: '1.0.0',
  name: 'Red Dawn (Free - Pluto TV)',
  description:
    'Free, legal, ad-supported movies sourced from Pluto TV\'s public on-demand catalog. No account or API key required.',
  logo: 'https://i.imgur.com/3p4QqAk.png',
  resources: ['catalog', 'meta', 'stream'],
  types: ['movie'],
  catalogs: [
    {
      type: 'movie',
      id: 'pluto_featured',
      name: 'Pluto TV - Featured',
      extra: [{ name: 'skip' }],
    },
    {
      type: 'movie',
      id: 'pluto_search',
      name: 'Pluto TV - Search',
      extra: [{ name: 'search', isRequired: true }],
    },
  ],
  idPrefixes: ['reddawn_pluto_'],
  behaviorHints: {
    configurable: false,
    adult: false,
  },
};
