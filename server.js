const express = require('express');
const cors = require('cors');
const { addonBuilder, getRouter } = require('stremio-addon-sdk');

const app = express();
app.use(cors()); // Crucial for Stremio Web

// 1. Your Manifest
const manifest = {
    "id": "com.reddawn.streaming",
    "version": "1.1.0",
    "name": "Red Dawn - Streaming (Free P2P)",
    "description": "Multi-source streaming addon featuring free torrents and advanced media filtering.",
    "types": ["movie", "series"],
    "resources": ["stream"],
    "idPrefixes": ["tt"],
    "catalogs": [], // Empty catalogs since you provide streams, not catalogs
    "logo": "https://raw.githubusercontent.com/Tre9995/https-Reddawn.xyz/main/logo/reddawn.png"
};

const builder = new addonBuilder(manifest);

// 2. Stream Handler (Where the magic happens)
builder.defineStreamHandler((args) => {
    console.log(`Stremio requested: ${args.type} - ${args.id}`);
    
    // TODO: Add your Axios logic here to scrape/fetch your torrent links!
    // For now, here is a dummy stream so Stremio shows something:
    const streams = [
        {
            name: "Red Dawn Test",
            title: "1080p Test Stream\n👤 50 💾 2GB",
            infoHash: "dd8255ecdc7ca55fb0bbf81323d87062db1f6d1c" // Big Buck Bunny torrent
        }
    ];

    return Promise.resolve({ streams: streams });
});

// 3. Connect Stremio SDK to Express
app.use(getRouter(builder.getInterface()));

// 4. Start the server
const PORT = process.env.PORT || 7000;
app.listen(PORT, () => {
    console.log(`Red Dawn Addon running at http://localhost:${PORT}/manifest.json`);
});
