# Version Management Guide

## 📌 Current Version: v0.0.1

### Version Files (MUST stay synchronized)

1. **`ui/pages/dashboard/src/version.js`** - Source of truth for UI version
2. **`ui/pages/dashboard/package.json`** - NPM package version
3. **`PROJECT_STATUS.md`** - Deployment tracking
4. **Foundry manifest** - Deployment version (auto-managed by CLI)

---

## 🔄 Version Update Workflow

### Before EVERY Deployment:

#### Step 1: Update Version Number

Edit **`ui/pages/dashboard/src/version.js`**:

```javascript
export const VERSION = 'vX.Y.Z';  // Update this line
```

**Version format:**
- `vMAJOR.MINOR.PATCH`
- **MAJOR**: Breaking changes, major features (v1.0.0, v2.0.0)
- **MINOR**: New features, significant updates (v0.1.0, v0.2.0)
- **PATCH**: Bug fixes, minor tweaks (v0.0.1, v0.0.2)

#### Step 2: Sync package.json

Edit **`ui/pages/dashboard/package.json`**:

```json
{
  "name": "agentic-soc-oversight-dashboard",
  "version": "X.Y.Z",  // Update this (no 'v' prefix)
  ...
}
```

#### Step 3: Build

```bash
cd ui/pages/dashboard
npm run build
```

#### Step 4: Deploy

```bash
cd /Users/rclavero/SOC-VIDEOWALL_SOC_OPERATIONS_CENTER/agentic-soc-oversight-dashboard
foundry apps deploy --no-prompt \
  --change-type [Patch|Minor|Major] \
  --change-log "Description of changes"
```

**Change type mapping:**
- `Patch` → Bug fixes (0.0.X)
- `Minor` → New features (0.X.0)
- `Major` → Breaking changes (X.0.0)

#### Step 5: Update PROJECT_STATUS.md

After successful deployment, update:

```markdown
**Current Version**: vX.Y.Z (Production)
**Status**: 🟢 DEPLOYED & OPERATIONAL
```

---

## 🎯 Version Display

The version is displayed in the UI header:

**Location**: Top-right of dashboard header  
**Format**: Small blue text showing current version

The version is dynamically imported from `version.js`, so updating that file will automatically update the UI after rebuild.

---

## ✅ Pre-Deployment Checklist

Before deploying, verify:

- [ ] Updated `ui/pages/dashboard/src/version.js`
- [ ] Updated `ui/pages/dashboard/package.json` (matching version)
- [ ] Ran `npm run build` successfully
- [ ] Tested locally with `foundry ui run` (optional)
- [ ] Ready to deploy with correct `--change-type`

---

## 📋 Version History Template

Keep track of releases in PROJECT_STATUS.md:

```markdown
## Version History

### v0.0.2 (2026-07-29)
- Fixed: Authorization issues with LogScale queries
- Added: Version management system
- Changed: Updated CSP configuration

### v0.0.1 (2026-07-28)
- Initial deployment
- Complete dashboard with 12 LogScale queries
- All widgets operational
```

---

## 🚨 Common Mistakes to Avoid

1. ❌ Forgetting to update version.js before deployment
2. ❌ Mismatch between version.js and package.json
3. ❌ Not rebuilding after version change
4. ❌ Using wrong --change-type in deploy command
5. ❌ Forgetting to update PROJECT_STATUS.md after deployment

---

## 🔍 Quick Version Check

To see what version is currently deployed:

1. Open the dashboard in Falcon Console
2. Look at top-right corner of header
3. Should show: `vX.Y.Z` in blue text

If version doesn't match expectations:
- Check if build was run after version update
- Check if deployment completed successfully
- Clear browser cache and refresh

---

**Last Updated**: 2026-07-28  
**Maintained By**: Development Team
