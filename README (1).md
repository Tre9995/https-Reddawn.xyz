# Red Dawn (Free) — Stremio Addon

A working Stremio addon that serves **free, legal, ad-supported movies**
from [Pluto TV](https://pluto.tv)'s public on-demand catalog. No account,
no API key, no debrid service, no torrents — just Pluto's own
already-licensed free content, surfaced inside Stremio.

## Why this instead of a torrent/scraper addon?

Sites that scrape unlicensed streaming mirrors are serving copyrighted
films without rights, and addons that scrape them carry real legal risk
for whoever hosts/distributes them. Pluto TV is the opposite: it's a
real, ad-supported, fully licensed streaming service (owned by
Paramount), and this addon just reads their own public catalog API —
the same one their web/mobile apps use — so everything streamed is
something Pluto already has the rights to show you for free.

## Project structure

```
.
├── index.js          # Express server implementing the Stremio addon protocol
├── manifest.js        # Addon manifest (id, catalogs, resources)
├── lib/
│   ├── pluto.js        # Pluto TV API client (categories, search, item lookup)
│   └── mapper.js       # Converts Pluto data → Stremio meta/stream objects
└── package.json
```

## Run locally

```bash
npm install
npm start
```

Server starts on `http://127.0.0.1:7000`. In Stremio:
**Settings → Addons → paste** `http://127.0.0.1:7000/manifest.json` **→ Install**

(Local install only works while your computer is running the server and
Stremio is on the same machine/network.)

## Deploy so it works everywhere, all the time

Pick one (all have free tiers):

### Render.com
1. Push this folder to a GitHub repo.
2. On [render.com](https://render.com) → New → Web Service → connect the repo.
3. Build command: `npm install` — Start command: `npm start`.
4. Once deployed, your manifest URL is `https://YOUR-APP.onrender.com/manifest.json`.

### Vercel
1. `npm i -g vercel`
2. From this folder: `vercel` (follow prompts).
3. Manifest URL: `https://YOUR-APP.vercel.app/manifest.json`.

### Railway / Fly.io
Same idea — point them at this repo, `npm install` + `npm start`, then
use the public URL + `/manifest.json`.

## Install in Stremio (after deploying)

1. Open Stremio → **Settings → Addons**.
2. Paste your deployed manifest URL, e.g.
   `https://your-app.onrender.com/manifest.json`
3. Click **Install**.
4. You'll see "Pluto TV - Featured" and "Pluto TV - Search" catalogs
   under Movies.

## If streams don't show up after deploying

Pluto's API field names occasionally shift. Two debug routes are built
in to help:

- `https://your-app.onrender.com/debug/categories`
- `https://your-app.onrender.com/debug/search?q=batman`

These return the **raw** Pluto API response. If `lib/mapper.js`'s
`toStreams()` isn't finding a playable URL, compare the raw item shape
from `/debug/search` against the field names checked in `toStreams()`
and adjust them to match.

## What this addon does NOT do

- No torrents, magnet links, or P2P.
- No debrid service integration (RealDebrid/AllDebrid/etc).
- No scraping of unlicensed streaming sites.

If you want a wider catalog later, the legitimate path is adding more
free/licensed sources the same way (e.g. Internet Archive's public
domain film collection for older titles), not adding piracy sources.
