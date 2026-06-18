# ⚙️ Red Dawn Optimization Guide

Optimize Red Dawn for your specific setup and internet connection.

---

## 🎯 Choose Your Profile

### 1️⃣ Budget User (FREE Torrents)
**Best for**: Limited budget, occasional watching
**Internet**: Any speed
**Hardware**: Any device
**Goal**: Free streaming with patience

### 2️⃣ Performance User (Premium + Optimization)
**Best for**: Regular watching, want quality
**Internet**: 10+ Mbps
**Hardware**: Good computer/TV
**Goal**: Best quality with reasonable cost

### 3️⃣ Power User (4K + All Features)
**Best for**: Best quality, all features
**Internet**: 50+ Mbps
**Hardware**: 4K TV + good hardware
**Goal**: Maximum quality and features

### 4️⃣ Mobile User
**Best for**: Watching on phone/tablet
**Internet**: Variable (4G/5G/WiFi)
**Hardware**: Phone or tablet
**Goal**: Fast loading, battery efficient

---

## 🚀 Performance Profiles

### Profile 1: Budget Free Streams

**Configuration:**
```json
{
  "preferredResolutions": ["1080p", "720p"],
  "preferredQualities": ["WEBRip", "WEB-DL", "DVDRip"],
  "preferredStreamTypes": ["p2p"],
  "excludeUncached": false,
  "enableSeadex": true,
  "sortCriteria": {
    "cached": [
      {"key": "seeders", "direction": "desc"},
      {"key": "resolution", "direction": "desc"},
      {"key": "quality", "direction": "desc"}
    ]
  }
}
```

**Stremio Settings:**
- Resolution: 720p-1080p
- Autoplay: OFF
- Quality: Medium
- Buffering: Allow 30 seconds

**Expected Performance:**
- ⏱️ Load time: 1-3 minutes
- 🎬 Quality: Good (1080p)
- 💾 Data: 2-4 GB per movie
- 📊 Uptime: 70-80%

---

### Profile 2: Premium Balanced

**Configuration:**
```json
{
  "preferredResolutions": ["2160p", "1440p", "1080p"],
  "preferredQualities": ["BluRay REMUX", "BluRay", "WEB-DL"],
  "preferredStreamTypes": ["debrid", "usenet", "p2p"],
  "excludeUncached": false,
  "enableSeadex": true,
  "sortCriteria": {
    "cached": [
      {"key": "cached", "direction": "desc"},
      {"key": "quality", "direction": "desc"},
      {"key": "resolution", "direction": "desc"}
    ]
  }
}
```

**Stremio Settings:**
- Resolution: Auto (1080p-4K)
- Autoplay: ON
- Quality: High
- Buffering: Allow 10 seconds

**Debrid Setup:**
- Service: RealDebrid
- Plan: 30-day (€3.99)
- Account: Active and funded

**Expected Performance:**
- ⏱️ Load time: Instant (3-10 sec)
- 🎬 Quality: Excellent (4K)
- 💾 Data: 5-20 GB per movie
- 📊 Uptime: 95%+

---

### Profile 3: Ultimate 4K Setup

**Configuration:**
```json
{
  "preferredResolutions": ["2160p"],
  "preferredQualities": ["BluRay REMUX"],
  "preferredVisualTags": ["HDR+DV", "DV", "HDR10+"],
  "preferredAudioTags": ["Atmos", "DTS:X", "TrueHD"],
  "preferredStreamTypes": ["debrid"],
  "excludeUncached": true,
  "enableSeadex": true,
  "sortCriteria": {
    "cached": [
      {"key": "resolution", "direction": "desc"},
      {"key": "visualTag", "direction": "desc"},
      {"key": "audioTag", "direction": "desc"},
      {"key": "size", "direction": "desc"}
    ]
  }
}
```

**Hardware Requirements:**
- 📺 4K TV (at least 55")
- 🖥️ High-end device (Apple TV 4K, Shield TV, etc)
- 🎧 Surround sound system (Dolby Atmos capable)
- 📡 Wired Ethernet (not WiFi)
- 🔋 Gigabit internet (100+ Mbps)

**Stremio Settings:**
- Video Player: Native (highest quality)
- Resolution: 4K
- Autoplay: ON
- Buffering: 5 seconds

**Debrid Setup:**
- Service: RealDebrid
- Plan: 180-day (€15.99) or higher
- Account: Premium with lots of balance

**Expected Performance:**
- ⏱️ Load time: Instant
- 🎬 Quality: MAXIMUM (4K + HDR + Atmos)
- 💾 Data: 15-50 GB per movie
- 📊 Uptime: 98%+
- 👑 Experience: Cinema-quality

---

### Profile 4: Mobile Streaming

**Configuration:**
```json
{
  "preferredResolutions": ["720p"],
  "preferredQualities": ["WEB-DL", "WEBRip", "HD"],
  "preferredStreamTypes": ["debrid", "http"],
  "excludeUncached": true,
  "enableSeadex": false,
  "sortCriteria": {
    "cached": [
      {"key": "size", "direction": "asc"},
      {"key": "quality", "direction": "desc"},
      {"key": "resolution", "direction": "desc"}
    ]
  }
}
```

**Mobile Settings:**
- Resolution: 720p
- Autoplay: OFF (save battery)
- Quality: Medium
- Download option: Yes

**Debrid (Optional):**
- Small plan enough: €1.50 trial
- Focus on cached streams

**Expected Performance:**
- ⏱️ Load time: 3-10 sec
- 🎬 Quality: Good (720p)
- 💾 Data: 500MB-1GB per movie
- 🔋 Battery: 3-4 hours continuous
- 📊 Uptime: Good

**Pro Tips:**
1. Download content before travel
2. Use cellular data wisely
3. Enable WiFi-only option
4. Close background apps
5. Reduce screen brightness

---

## 🌐 Internet Speed Optimization

### Slow Connection (< 5 Mbps)

**Settings:**
```json
{
  "preferredResolutions": ["720p"],
  "preferredQualities": ["WEBRip", "HDRip"],
  "preferredStreamTypes": ["p2p"],
  "sortCriteria": {
    "uncached": [
      {"key": "seeders", "direction": "desc"}
    ]
  }
}
```

**Tips:**
- ✓ Use 720p quality
- ✓ Search popular content (more seeders)
- ✓ Use torrent client (better than direct)
- ✓ Wait 2-5 minutes for buffering
- ✓ Exclude 4K content

### Medium Connection (5-20 Mbps)

**Settings:**
```json
{
  "preferredResolutions": ["1080p", "720p"],
  "preferredQualities": ["WEB-DL", "WEBRip"],
  "preferredStreamTypes": ["debrid", "p2p"],
  "excludeUncached": true
}
```

**Tips:**
- ✓ Use 1080p for movies
- ✓ 720p for TV series
- ✓ Get small debrid plan
- ✓ Use cached streams only
- ✓ Wired connection better than WiFi

### Fast Connection (20-50 Mbps)

**Settings:**
```json
{
  "preferredResolutions": ["2160p", "1440p"],
  "preferredQualities": ["BluRay", "WEB-DL"],
  "preferredStreamTypes": ["debrid"],
  "excludeUncached": false
}
```

**Tips:**
- ✓ Upgrade to 4K capable device
- ✓ Use premium debrid
- ✓ Enable all quality options
- ✓ Wired ethernet recommended
- ✓ Get good surround system

### Ultra-Fast Connection (50+ Mbps)

**Settings:**
```json
{
  "preferredResolutions": ["2160p"],
  "preferredQualities": ["BluRay REMUX"],
  "preferredVisualTags": ["HDR+DV", "DV"],
  "preferredAudioTags": ["Atmos", "TrueHD"],
  "excludeUncached": true
}
```

**Tips:**
- ✓ 4K TV setup is worth it
- ✓ Premium debrid essential
- ✓ Surround sound system recommended
- ✓ Use highest quality always
- ✓ Multiple devices simultaneously OK

---

## 💡 Hardware-Specific Tips

### Apple TV 4K
```
✓ Use native player (best quality)
✓ Enable 4K + Dolby Vision
✓ Wired Ethernet required for 4K
✓ AirDrop from iPhone for content
✓ Set Stremio to "Use Smart TV APIs"
```

### NVIDIA Shield TV
```
✓ One of the best for Red Dawn
✓ Use Dolby Atmos passthrough
✓ Enable 4K + HDR automatically
✓ USB external storage for downloads
✓ Set video codec to automatic
```

### Roku TV
```
✓ Works well for 1080p streaming
✓ Limited to HD for some content
✓ WiFi should be 5GHz
✓ Update firmware regularly
✓ Restart device if buffering
```

### Samsung/LG Smart TV
```
✓ Use built-in Stremio app
✓ Enable 4K in TV settings
✓ Update TV firmware
✓ Use wired connection if available
✓ Reduce resolution if laggy
```

### PC/Laptop
```
✓ Use full Stremio app
✓ Update graphics drivers
✓ Disable browser extensions
✓ Close other apps
✓ Use high-performance GPU
```

### Phone/Tablet
```
✓ Use Stremio mobile app
✓ WiFi recommended (uses data)
✓ Keep display brightness at 50%
✓ Close background apps
✓ Disable auto-brightness for battery
```

---

## 📊 Benchmark Settings

### Test Your Setup
1. Search: **"The Matrix"** (popular, many versions)
2. Note load times for each resolution
3. Try 3-4 different streams
4. Record average load time
5. Check bitrate in player info

### Results Interpretation

| Load Time | Status | Action |
|-----------|--------|--------|
| < 5 sec | 🟢 Excellent | Enjoy all features |
| 5-15 sec | 🟡 Good | Can use 4K fine |
| 15-30 sec | 🟠 Okay | Stick to 1080p |
| 30+ sec | 🔴 Slow | Use 720p only |

---

## 🔧 Advanced Tweaks

### Increase Cache
```
Linux/Mac: ~/.config/Stremio
Windows: %APPDATA%\Stremio

Add to settings.json:
"cacheSize": "2GB"
```

### Disable Animations
```
Stremio Settings → Advanced → Animations: OFF
(Faster on older devices)
```

### Reduce Memory Usage
```
Close browser tabs
Disable other addons
Limit to 1 device at a time
```

### Improve Search Speed
```
1. Use full titles (not abbreviations)
2. Search IMDb ID (tt1234567)
3. Use quotes for exact match
4. Avoid special characters
```

---

## ✅ Optimization Checklist

- [ ] Choose correct profile (Budget/Premium/Power/Mobile)
- [ ] Set preferred resolutions
- [ ] Configure audio preferences
- [ ] Choose stream type priority
- [ ] Adjust quality filters
- [ ] Enable/disable uncached streams
- [ ] Test with known content
- [ ] Benchmark load times
- [ ] Adjust if needed
- [ ] Enjoy!

---

## 📞 Still Not Working?

1. **Check your profile** - Right profile for your setup?
2. **Test internet** - speedtest.net
3. **Compare settings** - Match your profile exactly
4. **Clear cache** - Stremio → Clear Cache
5. **Restart** - Close and reopen Stremio
6. **Ask for help** - GitHub issues or Discord

---

**Happy optimizing! 🚀 Choose your profile and enjoy Red Dawn!**
