# Complete Setup Guide: Electron Auto-Update with GitHub Actions

This guide documents all changes made to a default Vite Electron app scaffolding to implement automated GitHub releases with an auto-update UI.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Configuration Changes](#configuration-changes)
4. [Main Process Changes](#main-process-changes)
5. [Preload Script Changes](#preload-script-changes)
6. [Renderer Process (UI) Changes](#renderer-process-ui-changes)
7. [GitHub Actions Workflow](#github-actions-workflow)
8. [Private Repository Setup](#private-repository-setup)
9. [Testing the Setup](#testing-the-setup)
10. [Troubleshooting](#troubleshooting)

---

## Overview

This setup enables:

- ✅ Automatic releases on push to main branch
- ✅ Version tags with hyphenated format (v1-0-0 instead of v1.0.0)
- ✅ Auto-update checking from within the app
- ✅ Download progress tracking with UI
- ✅ One-click install updates
- ✅ Support for both public and private repositories

---

## Prerequisites

1. **GitHub Repository**: Can be public or private
2. **electron-updater**: Already included in dependencies
3. **GitHub Actions**: Enabled in repository settings
4. **Repository Settings**:
   - Go to Settings → Actions → General
   - Under "Workflow permissions", select "Read and write permissions"
   - Check "Allow GitHub Actions to create and approve pull requests"
5. **For Private Repositories**: Personal Access Token (PAT) required - see [Private Repository Setup](#private-repository-setup)

---

## Configuration Changes

### 1. Update `package.json`

**Add these fields:**

```diff
{
  "name": "auto-update",
  "version": "1.0.0",
  ...
+ "homepage": "https://github.com/YOUR_USERNAME/auto-update",
+ "repository": {
+   "type": "git",
+   "url": "https://github.com/YOUR_USERNAME/auto-update.git"
+ },
  "scripts": {
    ...
    "build:unpack": "npm run build && electron-builder --dir",
-   "build:win": "npm run build && electron-builder --win",
-   "build:mac": "electron-vite build && electron-builder --mac",
-   "build:linux": "electron-vite build && electron-builder --linux"
+   "build:win": "npm run build && electron-builder --win"
  },
  "dependencies": {
    ...
+   "electron-updater": "^6.3.9"
  }
}
```

**Changes Made**:

- ➕ Added `homepage` field
- ➕ Added `repository` object
- ➖ Removed `build:mac` and `build:linux` scripts
- ✓ Ensure `electron-updater` is in dependencies

---

### 2. Update `electron-builder.yml`

**Change publish configuration:**

```diff
  ...
  npmRebuild: false
  publish:
-   provider: generic
-   url: https://example.com/auto-updates
+   provider: github
+   owner: YOUR_USERNAME
+   repo: auto-update
+   releaseType: release
  electronDownload:
    mirror: https://npmmirror.com/mirrors/electron/
```

**Remove macOS and Linux configurations:**

```diff
- mac:
-   entitlementsInherit: build/entitlements.mac.plist
-   ...
- dmg:
-   artifactName: ${name}-${version}.${ext}
- linux:
-   target:
-     - AppImage
-     - snap
-     - deb
-   ...
```

**Changes Made**:

- ✏️ Changed `provider` from `generic` to `github`
- ➕ Added `owner`, `repo`, and `releaseType`
- ➖ Removed all `mac`, `dmg`, `linux`, and `appImage` sections

---

## Main Process Changes

### 3. Update `src/main/index.ts`

**Add import:**

```diff
  import { app, shell, BrowserWindow, ipcMain } from 'electron'
  import { join } from 'path'
  import { electronApp, optimizer, is } from '@electron-toolkit/utils'
+ import { autoUpdater } from 'electron-updater'
  import icon from '../../resources/icon.png?asset'
```

**Configure auto-updater (add after imports):**

```typescript
// Configure auto-updater
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true
```

**Add IPC handlers in `app.whenReady()` after the ping handler:**

```typescript
// Auto-updater IPC handlers
ipcMain.handle('check-for-updates', async () => {
  try {
    const result = await autoUpdater.checkForUpdates()
    return {
      updateAvailable: result?.updateInfo?.version !== app.getVersion(),
      currentVersion: app.getVersion(),
      latestVersion: result?.updateInfo?.version || app.getVersion(),
      updateInfo: result?.updateInfo
    }
  } catch (error) {
    return {
      updateAvailable: false,
      currentVersion: app.getVersion(),
      latestVersion: app.getVersion(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})

ipcMain.handle('download-update', async () => {
  try {
    await autoUpdater.downloadUpdate()
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall(false, true)
})

ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

// Auto-updater event listeners
autoUpdater.on('update-available', (info) => {
  BrowserWindow.getAllWindows()[0]?.webContents.send('update-available', info)
})

autoUpdater.on('update-not-available', (info) => {
  BrowserWindow.getAllWindows()[0]?.webContents.send('update-not-available', info)
})

autoUpdater.on('download-progress', (progress) => {
  BrowserWindow.getAllWindows()[0]?.webContents.send('download-progress', progress)
})

autoUpdater.on('update-downloaded', (info) => {
  BrowserWindow.getAllWindows()[0]?.webContents.send('update-downloaded', info)
})

autoUpdater.on('error', (error) => {
  BrowserWindow.getAllWindows()[0]?.webContents.send('update-error', error.message)
})
```

**Changes Made**:

- ➕ Import `autoUpdater` from `electron-updater`

````

**Changes Made**:

- Imported `autoUpdater` from `electron-updater`
- Configured `autoUpdater.autoDownload = false` (manual download control)
- Configured `autoUpdater.autoInstallOnAppQuit = true`
- Added IPC handlers for:
  - `check-for-updates`: Check if new version exists
  - `download-update`: Download the update
  - `install-update`: Quit and install
  - `get-app-version`: Get current version
- Added event listeners for auto-updater events
- Send events to renderer process for UI updates

---

## Preload Script Changes

### 4. Update `src/preload/index.ts`

**Add import:**

```diff
+ import { contextBridge, ipcRenderer } from 'electron'
  import { electronAPI } from '@electron-toolkit/preload'
````

**Replace empty api object:**

```diff
  // Custom APIs for renderer
- const api = {}
+ const api = {
+   checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
+   downloadUpdate: () => ipcRenderer.invoke('download-update'),
+   installUpdate: () => ipcRenderer.invoke('install-update'),
+   getAppVersion: () => ipcRenderer.invoke('get-app-version'),
+   onUpdateAvailable: (callback: (info: any) => void) => {
+     ipcRenderer.on('update-available', (_event, info) => callback(info))
+   },
+   onUpdateNotAvailable: (callback: (info: any) => void) => {
+     ipcRenderer.on('update-not-available', (_event, info) => callback(info))
+   },
+   onDownloadProgress: (callback: (progress: any) => void) => {
+     ipcRenderer.on('download-progress', (_event, progress) => callback(progress))
+   },
+   onUpdateDownloaded: (callback: (info: any) => void) => {
+     ipcRenderer.on('update-downloaded', (_event, info) => callback(info))
+   },
+   onUpdateError: (callback: (error: string) => void) => {
+     ipcRenderer.on('update-error', (_event, error) => callback(error))
+   }
+ }
```

**Changes Made**:

- ➕ Import `ipcRenderer`
- ➕ Add 4 invoke methods (check, download, install, getVersion)
- ➕ Add 5 event listener methods

---

### 5. Update `src/preload/index.d.ts`

**Add interfaces and update API type:**

```diff
import { ElectronAPI } from '@electron-toolkit/preload'

+ interface UpdateInfo {
+   updateAvailable: boolean
+   currentVersion: string
+   latestVersion: string
+   updateInfo?: any
+   error?: string
+ }
+
+ interface DownloadResult {
+   success: boolean
+   error?: string
+ }
+
+ interface API {
+   checkForUpdates: () => Promise<UpdateInfo>
+   downloadUpdate: () => Promise<DownloadResult>
+   installUpdate: () => Promise<void>
+   getAppVersion: () => Promise<string>
+   onUpdateAvailable: (callback: (info: any) => void) => void
+   onUpdateNotAvailable: (callback: (info: any) => void) => void
+   onDownloadProgress: (callback: (progress: any) => void) => void
+   onUpdateDownloaded: (callback: (info: any) => void) => void
+   onUpdateError: (callback: (error: string) => void) => void
+ }

  declare global {
    interface Window {
      electron: ElectronAPI
-     api: unknown
+     api: API
    }
  }
```

**Changes Made**:
- Added `UpdateInfo` interface
- Added `DownloadResult` interface
- Added `API` interface with all update methods
- Updated global Window interface to include typed `api` property

---

## Renderer Process (UI) Changes

### 6. Create `src/renderer/src/components/UpdateChecker.tsx`

**Create new component file with:**
- State management for update checking, downloading, and progress
- `useEffect` to register update event listeners from preload API
- Three main functions:
  - `checkForUpdates()`: Calls `window.api.checkForUpdates()`
  - `downloadUpdate()`: Calls `window.api.downloadUpdate()`
  - `installUpdate()`: Calls `window.api.installUpdate()`
- UI sections:
  - Check button
  - Version display (current vs latest)
  - Download button (when update available)
  - Progress bar (during download)
  - Install button (when downloaded)
  - Error messages

**Key Features**:
- Shows download progress with `formatBytes()` helper
- Manages loading states (checking, downloading)
- Handles errors gracefully

**Note**: Full component code (~180 lines) manages all update UI states and calls window.api methods.

---
<!-- 
### 7. Create `src/renderer/src/components/UpdateChecker.css`

**Create CSS file with styling for:**
- `.update-checker` - Main container with glass effect
- Button styles (`.btn-primary`, `.btn-success`, `.btn-install`)
- `.progress-bar` and `.progress-fill` for download progress
- `.version-info`, `.error-message`, `.success-message` displays
- Hover effects and transitions

**Note**: All CSS follows existing app theme and color scheme.

--- -->

### 8. Update `src/renderer/src/App.tsx`

**Add import:**

```diff
+ import UpdateChecker from './components/UpdateChecker'
  import electronLogo from './assets/electron.svg'
```

**Add component to JSX:**

```diff
  return (
    <>
      <img alt="logo" className="logo" src={electronLogo} />
      ...
+     <UpdateChecker />
      ...
    </>
  )
```


**Changes Made**:

- ➕ Import and render `UpdateChecker` component
- (Optional) Restructure layout for better visual hierarchy

---

## GitHub Actions Workflow

### 9. Create `.github/workflows/release.yml`

Complete workflow for automated releases:

```yaml
name: Build and Release

on:
  push:
    branches:
      - main
    paths-ignore:
      - '**.md'
      - '.gitignore'

permissions:
  contents: write

jobs:
  release:
    runs-on: windows-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Get version from package.json
        id: get-version
        shell: bash
        run: |
          VERSION=$(node -p "require('./package.json').version")
          VERSION_TAG="v${VERSION//./-}"
          echo "version=$VERSION" >> $GITHUB_OUTPUT
          echo "version_tag=$VERSION_TAG" >> $GITHUB_OUTPUT

      - name: Check if tag exists
        id: check-tag
        shell: bash
        run: |
          if git rev-parse "${{ steps.get-version.outputs.version_tag }}" >/dev/null 2>&1; then
            echo "exists=true" >> $GITHUB_OUTPUT
          else
            echo "exists=false" >> $GITHUB_OUTPUT
          fi

      - name: Build application
        if: steps.check-tag.outputs.exists == 'false'
        run: npm run build:win
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Create Git tag
        if: steps.check-tag.outputs.exists == 'false'
        shell: bash
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git tag -a "${{ steps.get-version.outputs.version_tag }}" -m "Release version ${{ steps.get-version.outputs.version }}"
          git push https://x-access-token:${{ secrets.GITHUB_TOKEN }}@github.com/${{ github.repository }}.git "${{ steps.get-version.outputs.version_tag }}"

      - name: Create Release
        if: steps.check-tag.outputs.exists == 'false'
        uses: softprops/action-gh-release@v2
        with:
          tag_name: ${{ steps.get-version.outputs.version_tag }}
          name: Release ${{ steps.get-version.outputs.version }}
          draft: false
          prerelease: false
          generate_release_notes: true
          files: |
            dist/*.exe
            dist/latest*.yml
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Key Features**:

- **Permissions**: `contents: write` allows pushing tags and creating releases
- **Trigger**: Runs on push to main branch (ignores markdown and .gitignore changes)
- **Version Tag**: Converts `1.0.0` → `v1-0-0` (hyphenated format)
- **Tag Check**: Prevents duplicate releases for same version
- **Build**: Runs Windows build only
- **Git Tag**: Creates and pushes annotated tag using GitHub token
- **Release**: Creates GitHub release with installer and update manifest files
- **Auto Release Notes**: Automatically generates release notes from commits

---
<!-- 
## Private Repository Setup

If your repository is **private**, you need additional configuration because the default `GITHUB_TOKEN` has limited access for private repos, and end users won't be able to download updates without authentication.

### Option 1: Using GitHub Personal Access Token (Recommended)

This method allows your app to check for and download updates from private repositories.

#### Step 1: Create Personal Access Token (PAT)

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a descriptive name: `electron-auto-update-token`
4. Set expiration (recommend: No expiration for production apps)
5. Select scopes:
   - ✅ `repo` (Full control of private repositories)
6. Click "Generate token"
7. **Copy the token immediately** (you won't see it again!)

#### Step 2: Add Token to GitHub Repository Secrets

1. Go to your repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `GH_PERSONAL_TOKEN`
4. Value: Paste your PAT from Step 1
5. Click "Add secret"

#### Step 3: Update GitHub Actions Workflow

Modify `.github/workflows/release.yml` to replace all `GITHUB_TOKEN` with `GH_PERSONAL_TOKEN`:

```diff
       - name: Checkout code
         uses: actions/checkout@v4
         with:
           fetch-depth: 0
-          token: ${{ secrets.GITHUB_TOKEN }}
+          token: ${{ secrets.GH_PERSONAL_TOKEN }}

       ...

       - name: Build application
         if: steps.check-tag.outputs.exists == 'false'
         run: npm run build:win
         env:
-          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
+          GH_TOKEN: ${{ secrets.GH_PERSONAL_TOKEN }}

       ...

       - name: Create Git tag
         if: steps.check-tag.outputs.exists == 'false'
         shell: bash
         run: |
           git config user.name "github-actions[bot]"
           git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
           git tag -a "${{ steps.get-version.outputs.version_tag }}" -m "Release version ${{ steps.get-version.outputs.version }}"
-          git push https://x-access-token:${{ secrets.GITHUB_TOKEN }}@github.com/${{ github.repository }}.git "${{ steps.get-version.outputs.version_tag }}"
+          git push https://x-access-token:${{ secrets.GH_PERSONAL_TOKEN }}@github.com/${{ github.repository }}.git "${{ steps.get-version.outputs.version_tag }}"

       ...

       - name: Create Release
         if: steps.check-tag.outputs.exists == 'false'
         uses: softprops/action-gh-release@v2
         with:
           ...
         env:
-          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
+          GITHUB_TOKEN: ${{ secrets.GH_PERSONAL_TOKEN }}
```

**Changes Required**: Replace all 4 occurrences of `GITHUB_TOKEN` with `GH_PERSONAL_TOKEN`

#### Step 4: Update Main Process for Private Repo Access

Modify `src/main/index.ts` to configure electron-updater with token:

```typescript
import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import icon from '../../resources/icon.png?asset'

// Configure auto-updater
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

// FOR PRIVATE REPOSITORIES ONLY:
// Set GitHub token for private repo access
// IMPORTANT: Do NOT hardcode tokens in source code!
// Use environment variables or external configuration
autoUpdater.requestHeaders = {
  Authorization: `token ${process.env.GITHUB_TOKEN || 'YOUR_TOKEN_HERE'}`
}

// Alternatively, use setFeedURL with private option
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'YOUR_USERNAME',
  repo: 'auto-update',
  private: true,
  token: process.env.GITHUB_TOKEN || 'YOUR_TOKEN_HERE'
})

// ... rest of the code remains the same
```

**Security Warning**:

- ⚠️ **NEVER commit tokens to source code!**
- Use environment variables or secure configuration
- Consider using electron-store or similar for secure storage
- Encrypt tokens before storing

#### Step 5: Secure Token Storage (Production Method)

For production apps, store the token securely:

**Option A: Environment Variables**

```typescript
// In main process
const githubToken = process.env.GITHUB_UPDATER_TOKEN

if (githubToken) {
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'YOUR_USERNAME',
    repo: 'auto-update',
    private: true,
    token: githubToken
  })
}
```

Then set environment variable before running:

```bash
# Windows
$env:GITHUB_UPDATER_TOKEN="your_token_here"
npm run build:win

# Set permanently
[System.Environment]::SetEnvironmentVariable('GITHUB_UPDATER_TOKEN', 'your_token_here', 'User')
```

**Option B: Secure Configuration File** (Recommended)

Create a config system:

```typescript
// src/main/config.ts
import { app } from 'electron'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

interface AppConfig {
  githubToken?: string
}

export function loadConfig(): AppConfig {
  const configPath = join(app.getPath('userData'), 'config.json')

  if (existsSync(configPath)) {
    try {
      const configData = readFileSync(configPath, 'utf-8')
      return JSON.parse(configData)
    } catch (error) {
      console.error('Error loading config:', error)
    }
  }

  return {}
}

// src/main/index.ts
import { loadConfig } from './config'

const config = loadConfig()

if (config.githubToken) {
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'YOUR_USERNAME',
    repo: 'auto-update',
    private: true,
    token: config.githubToken
  })
}
```

Then create `%APPDATA%/auto-update/config.json`:

```json
{
  "githubToken": "your_token_here"
}
```

**Option C: Electron-Store (Best for Production)**

```bash
npm install electron-store
```

```typescript
import Store from 'electron-store'

const store = new Store({
  encryptionKey: 'your-encryption-key' // Use unique key per installation
})

const githubToken = store.get('githubToken') as string

if (githubToken) {
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'YOUR_USERNAME',
    repo: 'auto-update',
    private: true,
    token: githubToken
  })
}
```

### Option 2: Make Releases Public (Easier Alternative)

Even for private repos, you can make releases public:

1. Go to repository Settings
2. Scroll to "Danger Zone"
3. Check if there's an option to make releases public
4. This allows downloads without authentication
5. Source code remains private

**Note**: This feature availability depends on your GitHub plan.

### Option 3: Use Generic Provider with Authenticated CDN

Host release files on an authenticated CDN or server:

```yaml
# electron-builder.yml
publish:
  provider: generic
  url: https://your-cdn.com/updates
```

Then configure your server to require authentication for downloads.

### Testing Private Repo Setup

1. **Build with token**:

   ```bash
   $env:GITHUB_TOKEN="your_pat_token"
   npm run build:win
   ```

2. **Push to trigger release**:

   ```bash
   git add .
   git commit -m "Test private repo update"
   git push origin main
   ```

3. **Verify in GitHub Actions**:
   - Check workflow uses `GH_PERSONAL_TOKEN`
   - Verify release is created
   - Confirm files are uploaded

4. **Test update in app**:
   - Run installed app
   - Click "Check for Updates"
   - Should successfully detect and download update

### Private Repo Troubleshooting

**Issue**: "Failed to check for updates" with 401/403 error

**Solutions**:

1. Verify PAT has `repo` scope
2. Check token is not expired
3. Ensure token is correctly set in app
4. Verify repository owner/name are correct

**Issue**: Workflow can't create release

**Solutions**:

1. Verify `GH_PERSONAL_TOKEN` is set in repository secrets
2. Check token has correct permissions
3. Ensure repository settings allow Actions to create releases

**Issue**: App can't download update files

**Solutions**:

1. Token must be embedded in the app (security consideration!)
2. Consider making releases public instead
3. Use authenticated CDN for file hosting

### Security Considerations for Private Repos

⚠️ **Important Security Notes**:

1. **Token in App**: If you embed PAT in the app, users can extract it
2. **Read-Only Token**: Create a separate PAT with only `repo:read` access
3. **Token Rotation**: Regularly rotate tokens and update app
4. **Alternative**: Host updates on authenticated server you control
5. **Consider**: If security is critical, private repos + embedded tokens may not be ideal

### Recommended Approach by Scenario

| Scenario            | Recommendation                              |
| ------------------- | ------------------------------------------- |
| Open Source Project | Use public repository (easiest)             |
| Internal Tool       | Private repo + env variables for token      |
| Commercial Software | Private repo + encrypted config or paid CDN |
| High Security       | Custom update server with authentication    |
| Small Team          | Private repo with public releases           |

--- -->

## Testing the Setup

### Step 1: Initial Build

```bash
npm install
npm run build:win
```

### Step 2: Test Locally

```bash
npm run dev
```

- Click "Check for Updates" button
- Should show "You have the latest version" (no releases yet)

### Step 3: Create First Release

1. **Update version in `package.json`**:

   ```json
   {
     "version": "1.0.0"
   }
   ```

2. **Commit and push**:

   ```bash
   git add .
   git commit -m "Initial release v1.0.0"
   git push origin main
   ```

3. **Monitor GitHub Actions**:
   - Go to repository → Actions tab
   - Watch the workflow execute
   - Check for any errors

4. **Verify Release**:
   - Go to repository → Releases
   - Should see release `v1-0-0` with installer

### Step 4: Test Update Flow

1. **Install the released version** from GitHub

2. **Bump version** in `package.json`:

   ```json
   {
     "version": "1.0.1"
   }
   ```

3. **Make UI changes** (to have something different)

4. **Push changes**:

   ```bash
   git add .
   git commit -m "Update to v1.0.1"
   git push origin main
   ```

5. **In installed app**:
   - Open the v1.0.0 app
   - Click "Check for Updates"
   - Should show v1.0.1 available
   - Click "Download Update"
   - Watch progress bar
   - Click "Restart & Install"
   - App should update to v1.0.1

---

## Troubleshooting

### Issue 1: Permission Denied (403 Error)

**Problem**: GitHub Actions can't push tags

**Solution**:

1. Go to Repository Settings → Actions → General
2. Under "Workflow permissions", select "Read and write permissions"
3. Save changes
4. Re-run the workflow

---

### Issue 2: Symbolic Link Errors on Windows

**Problem**: `Cannot create symbolic link: A required privilege is not held by the client`

**Solution Option 1** (Recommended):

1. Open Windows Settings
2. Go to "Privacy & Security" → "For developers"
3. Enable "Developer Mode"

**Solution Option 2**:

1. Run PowerShell as Administrator
2. Run build command

**Solution Option 3**:

```powershell
# Clear electron-builder cache
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\electron-builder\Cache" -ErrorAction SilentlyContinue
```

---

### Issue 3: Update Check Shows Error

**Problem**: "Failed to check for updates" error in app

**Causes & Solutions**:

1. **No releases published yet**:
   - Create first release by pushing to main

2. **Wrong repository URL**:
   - Verify `package.json` has correct repository URL
   - Verify `electron-builder.yml` has correct owner/repo

3. **Private repository without token**:
   - See [Private Repository Setup](#private-repository-setup)
   - Configure GitHub token in app
   - Or make releases public

4. **Network/Firewall issues**:
   - Check internet connection
   - Verify GitHub is accessible
   - Check corporate firewall settings

---

### Issue 4: Private Repository 401/403 Errors

**Problem**: Authentication errors when checking for updates in private repo

**Solutions**:

1. **Missing Token**:
   - Ensure GitHub PAT is configured in app
   - Verify token has `repo` scope
   - Check token is not expired

2. **Invalid Token Format**:

   ```typescript
   // Correct format
   autoUpdater.requestHeaders = {
     Authorization: `token ${yourToken}`
   }
   // NOT: `Bearer ${yourToken}`
   ```

3. **Token Not Set in Build**:
   - Set environment variable before building
   - Or use config file loaded at runtime
   - Verify token is accessible in production build

4. **Repository Access**:
   - Ensure PAT owner has access to the repository
   - Check repository is not archived or deleted
   - Verify repository name and owner are correct

---

### Issue 5: App Not Finding Updates

**Problem**: App says "latest version" but new release exists

**Checklist**:

1. ✅ Version in app < version in release
2. ✅ Release has `.exe` and `latest.yml` files
3. ✅ Release is not a draft
4. ✅ Repository URL in `package.json` matches GitHub
5. ✅ Tag format is `v1-0-0` (hyphenated)
6. ✅ For private repos: Token is valid and configured

---

### Issue 6: Build Fails in GitHub Actions

**Common Issues**:

1. **Missing dependencies**:

   ```yaml
   - name: Install dependencies
     run: npm ci # Use ci instead of install
   ```

2. **Type errors**:
   - Fix TypeScript errors locally first
   - Run `npm run typecheck` before pushing

3. **Wrong Node version**:
   ```yaml
   - name: Setup Node.js
     uses: actions/setup-node@v4
     with:
       node-version: 20 # Match your local version
   ```

---
