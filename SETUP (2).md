# 🚀 Red Dawn Setup Guide

Complete guide to setting up Red Dawn with **FREE** and **PREMIUM** options.

---

## 📋 Quick Start (5 minutes)

### Step 1: Install Red Dawn
1. Open **Stremio** app
2. Go to **Settings** → **Add-ons**
3. Click **Browse Add-ons**
4. Search **"Red Dawn"**
5. Click **Install**

### Step 2: Choose Your Option
- **FREE**: Works immediately, no setup needed
- **PREMIUM**: Requires debrid account (15-30 mins)

---

## 🆓 FREE VERSION Setup

### Requirements
- ✅ Internet connection (any speed)
- ✅ Stremio installed
- ✅ Optional: VPN for some regions

### What You Get
- 📺 Movies and TV series
- 🎬 1080p+ quality
- 🌍 International content
- ⚡ Works immediately
- 🎁 Zero cost forever

### What You DON'T Get
- 4K streams (limited)
- Instant playback (downloads via torrent)
- Premium audio (Atmos, DTS)
- Cached/fast streams

### How to Use
1. Search for a movie/show in Stremio
2. Click on content
3. Red Dawn streams appear automatically
4. Click any stream to play
5. Wait for torrent download (1-5 minutes)

### Optimization Tips
```
For faster FREE streams:
1. Search "Red Dawn settings"
2. Under "Streaming":
   - Preferred Resolutions: 720p, 1080p
   - Exclude Uncached: Enabled
   - Include Seeders: 100+
3. Save and restart Stremio
```

---

## 💎 PREMIUM VERSION Setup (Recommended)

### Why Premium?
- ⚡ **Instant playback** (no waiting!)
- 🔥 **4K HDR** streams (beautiful picture)
- 🎵 **Atmos audio** (amazing sound)
- 💨 **Ultra-fast** speeds (100+ Mbps)
- 🔒 **More reliable** (less buffering)
- 🌐 **Works everywhere** (VPN friendly)
- 💰 **Affordable** ($3-5/month)

### Step 1: Choose a Debrid Service

#### Option A: RealDebrid (RECOMMENDED) ⭐
**Best overall, most streams**

1. Visit: https://real-debrid.com
2. Click **Sign Up**
3. Create account (email + password)
4. Choose plan:
   - **15 days**: €1.50 (trial)
   - **30 days**: €3.99 (monthly)
   - **180 days**: €15.99 (best value)
5. Complete payment
6. Go to **Dashboard** → **Settings**
7. Click **Security** tab
8. Copy your **API Token**

#### Option B: Premiumize.me
**Good alternative, reliable**

1. Visit: https://premiumize.me
2. Click **Register**
3. Create account
4. Choose plan:
   - **7 days**: €1.99 (trial)
   - **30 days**: €4.99 (monthly)
   - **365 days**: €37.99 (yearly)
5. Complete payment
6. Go to **My Account** → **API Token**
7. Copy your **Token**

#### Option C: AllDebrid
**Budget option, good performance**

1. Visit: https://alldebrid.com
2. Click **Register**
3. Create account
4. Choose plan:
   - **30 days**: €2.99 (monthly)
   - **365 days**: €19.99 (yearly)
5. Complete payment
6. Go to **Dashboard** → **Account**
7. Copy your **API Key**

### Step 2: Add API Key to Red Dawn

#### Method A: In-App Setup (Easiest)
1. Open **Stremio**
2. Find **Red Dawn** addon
3. Click the **⚙️ Settings** icon
4. Paste your API Token/Key
5. Select your provider:
   - RealDebrid
   - Premiumize
   - AllDebrid
6. Click **Save**
7. Wait 10 seconds for Stremio to refresh

#### Method B: Manual Configuration
1. Find Stremio config folder:
   - **Windows**: `%APPDATA%\stremio`
   - **Mac**: `~/Library/Application Support/Stremio`
   - **Linux**: `~/.config/Stremio`
2. Edit `settings.json`
3. Add:
```json
{
  "addons": [
    {
      "id": "com.reddawn.streaming",
      "config": {
        "debridService": "realdebrid",
        "apiKey": "YOUR_API_KEY_HERE"
      }
    }
  ]
}
```
4. Save and restart Stremio

### Step 3: Optimize Premium Settings

1. Open Red Dawn **Settings**
2. Configure:

**Resolution**
- Preferred: 2160p, 1440p, 1080p, 720p
- Force 4K: No (unless you have fast connection)

**Quality**
- Preferred: BluRay REMUX, BluRay, WEB-DL, WEBRip
- Exclude: CAM, TS, TC

**Audio**
- Preferred: Atmos, DTS:X, TrueHD, DTS-HD MA
- Include: All (to maximize streams)

**Video Tags**
- Preferred: HDR+DV, DV, HDR10+, HDR10

**Stream Types**
- Priority Order: Debrid, Usenet, HTTP, P2P

**Sorting**
- Cached streams first: **Enable**
- By size: **Descending**
- By quality: **Descending**

3. Click **Apply**
4. Restart Stremio

### Step 4: Test Your Setup

1. Search for: **"The Matrix"** (popular 4K movie)
2. Click on the movie
3. You should see:
   - ✅ Multiple 4K streams
   - ✅ Fast load (instant)
   - ✅ Provider shown (RealDebrid, etc)
4. Click a stream
5. Should start playing in seconds

**If no streams appear:**
- Check API key is correct (no spaces)
- Verify account is active and funded
- Refresh Stremio (close and reopen)
- Clear addon cache: Settings → Clear Cache

---

## 🔄 Hybrid Setup (FREE + PREMIUM)

### Best of Both Worlds
Combine free and premium for maximum streams!

1. Set up **RealDebrid** (or similar)
2. Enable both in Red Dawn:
   - Debrid: ON
   - Torrent (P2P): ON

3. Sorting will be:
   - Premium cached streams first (instant)
   - Premium uncached second (still fast)
   - Free torrents last (if needed)

4. Result:
   - 📺 Tons of options
   - ⚡ Instant when cached
   - 🆓 Fallback to free if premium down
   - 💰 Get value from premium + free options

---

## 🛠️ Troubleshooting

### No Streams Showing
```
✓ Check internet connection
✓ Verify API key (Settings → Red Dawn → API)
✓ Try searching different content
✓ Restart Stremio (Force close + reopen)
✓ Clear cache: Settings → Advanced → Clear Cache
✓ Check debrid account status (not expired)
✓ Reinstall Red Dawn addon
```

### Streams Buffering
```
✓ Check your internet speed (need 10+ Mbps for 4K)
✓ Lower preferred resolution: 1080p instead of 2160p
✓ Enable "Cached Only" for instant streams
✓ Restart router/WiFi
✓ Try hardwired connection instead of WiFi
✓ Close other apps using bandwidth
```

### API Key Rejected
```
✓ Verify key is copied correctly (no extra spaces)
✓ Check account is still active (not expired)
✓ Log into debrid website to verify access
✓ Re-generate API key in account settings
✓ Copy and paste again (don't type manually)
✓ Wait 30 seconds after updating
```

### Some Movies Have No Streams
```
Reason: Not enough seeders (free) or not cached (premium)
✓ Try searching similar movie
✓ Try a TV series instead (usually more streams)
✓ Wait 24 hours (content may be added)
✓ Check debrid service is working
✓ Adjust quality filters (less restrictive)
```

### Stremio Crashes
```
✓ Update Stremio to latest version
✓ Uninstall all addons except Red Dawn
✓ Clear Stremio cache completely
✓ Reinstall Stremio from official source
✓ Contact Stremio support if issue persists
```

---

## 💰 Cost Comparison

### FREE
- Cost: **$0**
- Speed: Slow (torrents)
- Quality: Up to 1080p
- Uptime: 90%
- Best for: Budget-conscious

### PREMIUM (RealDebrid Example)
- Cost: **$3.99/month** (~13¢/day)
- Speed: Ultra-fast (instant)
- Quality: Up to 4K + HDR + Atmos
- Uptime: 99%
- Best for: Anyone wanting quality

### COMPARISON
| Feature | FREE | PREMIUM |
|---------|------|---------|
| **Cost** | $0/mo | $3.99/mo |
| **Speed** | 1-5 min | Instant |
| **4K** | Rare | Common |
| **HDR** | No | Yes |
| **Audio** | Stereo | Atmos |
| **Reliability** | 70% | 99% |
| **Best For** | Budget | Quality |

---

## 🎯 Pro Tips

### For Free Users
```
1. Search popular movies (more seeders)
2. Adjust to 720p quality (faster)
3. Accept earlier releases (more available)
4. Use during off-peak hours (faster speeds)
5. Keep WiFi nearby (better signal)
```

### For Premium Users
```
1. Enable "Cached Only" for instant streams
2. Set preferred resolution to 2160p (you can handle it)
3. Enable all audio formats (Atmos, DTS:X, TrueHD)
4. Allow uncached streams (gives more options)
5. Update addon weekly (new improvements)
```

### For All Users
```
1. Update Stremio regularly
2. Use VPN if in restricted region
3. Report problems (helps us improve)
4. Share with friends who might enjoy it
5. Consider premium if you watch regularly
```

---

## ❓ FAQ

**Q: Is this legal?**
A: Yes! We help you access legal content. Debrid is 100% legal.

**Q: Is my data safe?**
A: Yes. We don't store personal data. Debrid is trusted by millions.

**Q: Can I share my API key?**
A: No! Keep it private. Anyone with your key can use your account.

**Q: What if my debrid service is down?**
A: Free torrents still work. Enable both for backup.

**Q: Can I use on mobile?**
A: Yes! Works on Stremio Android & iOS apps.

**Q: How often are streams updated?**
A: Continuously. New content added as it becomes available.

**Q: Do I need a VPN?**
A: Optional. Helps in some regions. Debrid is legal in most.

**Q: Can I cancel anytime?**
A: Yes! No contracts. Cancel at any time.

---

## 📞 Need Help?

- **Issues**: https://github.com/Tre9995/reddawn-addon/issues
- **Discord**: [Join Community]
- **Email**: support@reddawn.xyz
- **Website**: https://reddawn.xyz

---

**🎬 Ready to stream? Start with FREE, upgrade to PREMIUM whenever you want! 🍿**
