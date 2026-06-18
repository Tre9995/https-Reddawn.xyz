# 🔴 Red Dawn - Advanced Multi-Source Streaming Addon

A powerful Stremio addon featuring **free torrents** and **premium debrid** support with advanced quality filtering, 4K HDR support, and multi-audio tracks.

## ✨ Features

### 🎬 Stream Sources
- **Free Torrents (P2P)** - Access to torrent networks without premium services
- **Premium Debrid Services**:
  - RealDebrid
  - Premiumize.me
  - AllDebrid
  - TorBox
- **Usenet Sources** - NZB-based streams
- **HTTP Sources** - Direct HTTP links
- **Both Cached & Uncached** - Maximum stream availability

### 🎥 Video Quality
- **4K Resolution (2160p)** - Ultra HD streaming
- **1440p** - QHD quality
- **1080p** - Full HD quality
- **720p** - HD quality
- **Atmos/DTS:X Audio** - Premium surround sound
- **HDR/DolbyVision** - Enhanced color and contrast
- **10-bit Encoding** - Superior color depth

### 📋 Smart Filtering
- **Advanced SEL (Stream Expression Language)** - Fine-grained control
- **Vidhin's Regex Patterns** - Professional release filtering
- **Automatic Quality Selection** - Best streams first
- **Language Preferences** - Multi-language support
- **Custom Keywords** - Exclude unwanted versions

## 🚀 Installation

### Method 1: Stremio App (Easiest)
1. Open **Stremio**
2. Go to **Settings → Add-ons**
3. Search for **"Red Dawn"**
4. Click **Install**

### Method 2: Manual Installation
1. Copy the manifest URL:
   ```
   https://raw.githubusercontent.com/Tre9995/reddawn-addon/main/manifest.json
   ```
2. Open Stremio → Settings → Add-ons
3. Paste URL and click Install

### Method 3: Local Development
```bash
git clone https://github.com/Tre9995/reddawn-addon
cd reddawn-addon
npm install
npm start
```

## ⚙️ Configuration

### Premium Debrid Setup (Recommended)
1. **Get a Premium Account**:
   - [RealDebrid](https://real-debrid.com) (Recommended)
   - [Premiumize.me](https://premiumize.me)
   - [AllDebrid](https://alldebrid.com)

2. **Add API Key to Addon**:
   - Open Red Dawn settings in Stremio
   - Paste your API key
   - Save and restart

3. **Enjoy Cached Streams**:
   - Instant playback from cached content
   - 🚀 Much faster than P2P torrents
   - Higher reliability

### Free Torrent Mode
- Works **without** premium subscription
- Requires active torrent client integration
- May include ads
- Slower speeds but **completely free**

## 🎯 Quality Preferences

### Preferred Resolutions (in order)
1. 2160p (4K UHD) 🔥
2. 1440p (QHD) ✨
3. 1080p (Full HD) 🚀
4. 720p (HD) 💿

### Preferred Audio
- Atmos (Best)
- DTS:X
- TrueHD
- DTS-HD MA
- FLAC
- Standard DD/DD+

### Preferred Video Tags
- HDR + DolbyVision (Best)
- DolbyVision
- HDR10+
- HDR10
- HDR
- 10-bit

## 📊 Stream Sorting

Streams are automatically sorted by:

**For Cached Streams:**
1. Size (largest first)
2. Seadex score
3. Resolution (highest first)
4. Quality (best first)
5. Language match
6. Audio quality
7. Video tags
8. Seeders (for torrents)

**For Uncached Streams:**
1. Seadex score
2. Resolution (highest first)
3. Quality (best first)
4. Seeders (for torrents)
5. Language match

## 🎬 Supported Content

- **Movies** - All genres
- **TV Series** - All seasons and episodes
- **4K Movies** - Ultra HD catalog
- **HDR Content** - Premium visual quality
- **Multi-language** - International content

## 🛡️ Safety & Performance

✅ **Safe**
- No malware or harmful code
- Community-reviewed
- Regular updates
- Privacy-focused

⚡ **Fast**
- Optimized search algorithms
- Minimal buffering
- Quick stream selection
- Cached content instantly

## 🔧 Advanced Users

### Custom Stream Expressions
Edit `addon-config.json` to add custom SEL filters:

```json
"preferredStreamExpressions": [
  {
    "expression": "/* Your custom filter */",
    "enabled": true
  }
]
```

### Regex Patterns
Add custom regex patterns for release matching:

```json
"syncedRankedRegexUrls": [
  "https://your-regex-source.json"
]
```

### Exclude Content
Add keywords to automatically exclude:

```json
"excludedKeywords": [
  "keyword-to-exclude",
  "another-keyword"
]
```

## 📱 Supported Platforms

- ✅ Stremio on Windows
- ✅ Stremio on macOS
- ✅ Stremio on Linux
- ✅ Stremio on Android
- ✅ Stremio on iOS
- ✅ Web Stremio

## 🐛 Troubleshooting

### No Streams Found
- Check your internet connection
- Enable free torrents if premium is down
- Wait a few seconds and refresh
- Clear addon cache in Stremio settings

### Slow Loading
- Reduce quality preferences temporarily
- Use cached streams only (enable "Exclude Uncached")
- Check your debrid account status
- Verify API key is correct

### Poor Video Quality
- Check your internet speed
- Reduce preferred resolution
- Disable premium features if unstable
- Use a VPN if in restricted region

### API Key Not Working
- Verify key is copied correctly (no spaces)
- Check account hasn't expired
- Test key on official site
- Restart Stremio app

## 📞 Support

- **GitHub Issues**: https://github.com/Tre9995/reddawn-addon/issues
- **Website**: https://reddawn.xyz
- **Email**: support@reddawn.xyz
- **Community Discord**: [Join Here]

## 📜 License

Licensed under MIT License - See LICENSE file

## ⭐ Credits

- **Dave** - Original creator
- **Tamtaro** - SEL Filtering System
- **Vidhin** - Regex patterns
- **Stremio** - Platform

## 🔄 Updates

Red Dawn is actively maintained. Updates include:
- New stream sources
- Better filtering
- Performance improvements
- Bug fixes
- Feature additions

Follow releases: https://github.com/Tre9995/reddawn-addon/releases

---

**Made with ❤️ by the Red Dawn Team**

*Enjoy premium streaming with Red Dawn! 🎬🍿*
