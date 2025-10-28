# Auto-Update Electron App

An Electron application with React, TypeScript, and automatic update functionality using GitHub Releases.

## Features

- ✅ Automatic update checking
- ✅ Download progress tracking
- ✅ One-click install updates
- ✅ GitHub Actions automated releases
- ✅ Version management with hyphenated tags (v1-0-0 format)
- ✅ Windows only builds

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure GitHub Repository

Make sure your GitHub repository is set up correctly:

- Repository: `SaptanshuWanjari/auto-update`
- The app will publish releases to this repository automatically

### 3. Development

```bash
# Start development mode
npm run dev

# Build for production
npm run build

# Build for Windows
npm run build:win
```

## How It Works

### Automatic Releases

1. **Push to main branch** - Any push to the main branch triggers the GitHub Actions workflow
2. **Version from package.json** - The workflow reads the version from `package.json`
3. **Create tag** - Creates a git tag in the format `v1-0-0` (uses hyphens instead of dots)
4. **Build artifacts** - Builds the app for Windows
5. **Create GitHub Release** - Publishes a new release with all build artifacts

### Auto-Update Flow

1. User clicks "Check for Updates" button
2. App checks GitHub Releases for new versions
3. If update available:
   - Shows current and latest version
   - User can click "Download Update"
   - Progress bar shows download status
   - Once downloaded, user can click "Restart and Install"
4. If no update available:
   - Shows "You're running the latest version"

## Version Management

### Updating the Version

1. Edit `package.json` and update the version:

```json
{
  "version": "1.0.1"
}
```

2. Commit and push to main:

```bash
git add package.json
git commit -m "Bump version to 1.0.1"
git push origin main
```

3. GitHub Actions will automatically:
   - Create tag `v1-0-1`
   - Build the app
   - Create a GitHub Release

### Tag Format

- Package.json: `1.0.0`
- Git tag: `v1-0-0` (dots replaced with hyphens)
- This ensures compatibility with various systems

## GitHub Actions Workflow

The workflow (`.github/workflows/release.yml`) does:

1. ✅ Runs on push to main branch
2. ✅ Checks if tag already exists (prevents duplicate releases)
3. ✅ Builds for Windows
4. ✅ Creates git tag with hyphenated version
5. ✅ Publishes GitHub Release with all artifacts
6. ✅ Auto-generates release notes

## Troubleshooting

### Windows Build Issues

If you encounter symbolic link errors on Windows:

**Option 1: Enable Developer Mode**

1. Open Windows Settings
2. Go to "Privacy & Security" > "For developers"
3. Enable "Developer Mode"

**Option 2: Run as Administrator**

- Run PowerShell as Administrator before building

### Clear Cache

If builds are failing, clear the electron-builder cache:

```powershell
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\electron-builder\Cache" -ErrorAction SilentlyContinue
```

## Project Structure

```
auto-update/
├── .github/
│   └── workflows/
│       └── release.yml          # GitHub Actions workflow
├── src/
│   ├── main/
│   │   └── index.ts            # Main process with auto-updater
│   ├── preload/
│   │   ├── index.ts            # Preload script with update API
│   │   └── index.d.ts          # TypeScript definitions
│   └── renderer/
│       └── src/
│           ├── App.tsx         # Main app component
│           └── components/
│               ├── UpdateChecker.tsx  # Update UI component
│               └── UpdateChecker.css  # Update UI styles
├── electron-builder.yml         # Build configuration
└── package.json                # Project metadata
```

## License

MIT
