# 📁 Red Dawn Repository Structure

## 📂 File Overview

### Core Addon Files

**manifest.json**
- Stremio's configuration file
- Defines addon metadata (name, version, description)
- Lists supported content types (movies, series)
- Entry point for Stremio to load the addon

**addon-config.json**
- Advanced streaming configuration
- Quality preferences (resolutions, codecs)
- Audio preferences (Atmos, DTS, etc)
- Stream filtering rules
- Sorting criteria
- Poster service settings

### Documentation Files

**README.md** ⭐ START HERE
- Overview of Red Dawn addon
- Features and capabilities
- Installation instructions
- Basic configuration
- Troubleshooting guide

**SETUP.md** 📖 COMPLETE SETUP GUIDE
- Detailed setup for free and premium
- Step-by-step debrid service setup
- Free vs Premium comparison
- Cost breakdown
- Hybrid setup guide
- Complete troubleshooting

**OPTIMIZATION.md** ⚙️ PERFORMANCE TUNING
- 4 different usage profiles
- Hardware-specific tips
- Internet speed optimization
- Benchmark testing
- Advanced tweaks

**CONTRIBUTING.md**
- How to contribute to the project
- Code style guidelines
- Pull request process
- Bug reporting guidelines

**LICENSE**
- MIT License
- Legal terms and disclaimer

### Configuration & Setup Files

**package.json**
- NPM project metadata
- Dependencies list
- Build scripts
- Version information

**.gitignore**
- Ignores node_modules, logs, etc
- Prevents committing unnecessary files
- IDE configuration files ignored

### GitHub Configuration

**.github/workflows/ci-cd.yml**
- Automated testing pipeline
- Validates JSON on every commit
- Runs security checks
- Creates releases

**.github/ISSUE_TEMPLATE/bug_report.md**
- Template for bug reports
- Helps users report issues properly
- Structured format

**.github/ISSUE_TEMPLATE/feature_request.md**
- Template for feature requests
- Encourages detailed suggestions

---

## 🚀 Getting Started

### For End Users
1. **Read**: README.md (5 min overview)
2. **Follow**: SETUP.md (15 min setup)
3. **Optimize**: OPTIMIZATION.md (optional)
4. **Enjoy**: Start watching!

### For Contributors
1. **Read**: README.md (understand the project)
2. **Read**: CONTRIBUTING.md (learn how to help)
3. **Fork**: Repository on GitHub
4. **Clone**: `git clone https://github.com/YOUR-USERNAME/reddawn-addon`
5. **Code**: Make your changes
6. **Test**: Run tests locally
7. **Push**: Push to your fork
8. **Pull Request**: Submit PR to main repo

### For Developers
1. **Read**: package.json (see dependencies)
2. **Install**: `npm install`
3. **Understand**: manifest.json structure
4. **Study**: addon-config.json format
5. **Explore**: Stream filtering rules
6. **Extend**: Add new features

---

## 📋 Configuration Hierarchy

```
Red Dawn Addon
├── manifest.json (Stremio reads this first)
│   └── Addon metadata
│       └── Name, version, types supported
│
├── addon-config.json (User preferences)
│   ├── Quality preferences
│   ├── Audio preferences
│   ├── Video tag preferences
│   ├── Stream type priority
│   ├── Sorting criteria
│   └── Visual formatting
│
└── User Settings (Stremio app)
    ├── API key (for debrid)
    ├── Preferred resolution
    ├── Preferred quality
    └── Other runtime settings
```

---

## 🔄 Workflow

### For Installing
1. Open Stremio
2. Go to Add-ons
3. Search "Red Dawn"
4. Click Install
5. Click Settings (⚙️)
6. Enter API key (if using premium)
7. Save

### For Troubleshooting
1. Check README.md for common issues
2. Check SETUP.md troubleshooting section
3. Clear Stremio cache
4. Reinstall addon
5. Restart Stremio
6. Open GitHub Issue if still stuck

### For Contributing
1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Commit with clear messages
6. Push to your fork
7. Open Pull Request
8. Wait for review
9. Address feedback
10. Merge!

---

## 📊 File Sizes & Purposes

| File | Size | Purpose | Read When |
|------|------|---------|-----------|
| manifest.json | ~400B | Stremio addon definition | Setting up addon |
| addon-config.json | ~50KB | Advanced configuration | Customizing behavior |
| README.md | ~15KB | Quick overview | First time |
| SETUP.md | ~50KB | Complete setup guide | Installing addon |
| OPTIMIZATION.md | ~40KB | Performance tuning | Want better quality |
| package.json | ~2KB | Node dependencies | Developer setup |
| CONTRIBUTING.md | ~5KB | How to contribute | Want to help |
| LICENSE | ~1KB | Legal terms | Legal concerns |

---

## 🎯 Quick Navigation

### "How do I...?"

**...install Red Dawn?**
→ README.md → Installation section

**...set up premium debrid?**
→ SETUP.md → Premium Version Setup

**...make it faster?**
→ OPTIMIZATION.md → Choose Your Profile

**...fix no streams?**
→ README.md or SETUP.md → Troubleshooting

**...contribute code?**
→ CONTRIBUTING.md

**...report a bug?**
→ GitHub Issues → Use bug_report.md template

**...request a feature?**
→ GitHub Issues → Use feature_request.md template

**...understand the config?**
→ addon-config.json comments or Ask in Discord

---

## 🔐 Important Notes

### Secrets
- **Never commit**: API keys, passwords, tokens
- **Use**: Environment variables or .env files
- **gitignore**: Automatically ignores .env files

### Updates
- **Check releases**: github.com/Tre9995/reddawn-addon/releases
- **Auto-update**: Stremio checks for addon updates weekly
- **Manual update**: Uninstall and reinstall addon

### Backups
- **Config backup**: Save addon-config.json copy
- **Settings backup**: Stremio syncs to account
- **API keys**: Store in password manager

---

## 📞 Support Resources

### Self-Help
1. README.md - Common questions
2. SETUP.md - Setup issues
3. OPTIMIZATION.md - Performance issues
4. GitHub Issues - Search similar problems

### Community
1. **GitHub Issues**: Report bugs, request features
2. **Discord**: Join community chat
3. **Email**: support@reddawn.xyz
4. **Website**: https://reddawn.xyz

### For Issues
1. Search existing issues first
2. Use appropriate template
3. Include as much detail as possible
4. Include version numbers
5. Include error messages (if any)
6. Include screenshots (if relevant)
7. Be patient - volunteers helping

---

## 🔧 Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Build for production
npm run build

# Validate JSON
node -e "require('fs').readFileSync('manifest.json'); console.log('✓ manifest valid')"
```

---

## 📈 Repository Stats

- **Language**: JSON + Markdown
- **License**: MIT (free and open)
- **Type**: Stremio Addon
- **Status**: Active development
- **Maintenance**: Community supported

---

## ✅ Checklist: Before You Release

### Code
- [ ] All JSON files are valid
- [ ] No secrets in commits
- [ ] Tests pass
- [ ] Linting passes
- [ ] Comments for complex code

### Documentation
- [ ] README updated
- [ ] SETUP.md reflects changes
- [ ] OPTIMIZATION.md updated if needed
- [ ] Changelog created

### Testing
- [ ] Free streams working
- [ ] Premium streams working (if applicable)
- [ ] 4K streams found
- [ ] HDR/Atmos streams found
- [ ] Different resolutions work
- [ ] Mobile version tested
- [ ] PC/TV version tested

### Release
- [ ] Version bumped in package.json + manifest.json
- [ ] Git tag created
- [ ] Release notes written
- [ ] Files uploaded to GitHub

---

**🎬 Red Dawn is open source and community-driven. Help make it better! 🚀**
