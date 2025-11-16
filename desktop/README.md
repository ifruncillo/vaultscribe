# VaultScribe Desktop - Core Recording Module

**Zero-Knowledge Meeting Intelligence for Everyone**

This is the Electron desktop application for VaultScribe - Phase 1: Core Recording functionality.

---

## Features (Phase 1 - MVP)

✅ **Core Recording**
- System audio capture (record Zoom/Teams/Meet calls)
- Microphone input support
- Mixed audio (system + microphone)
- Pause/resume recording
- Real-time waveform visualization
- Duration and file size tracking

✅ **Client-Side Encryption**
- AES-256-GCM encryption
- PBKDF2 key derivation (100,000 iterations)
- Files encrypted before storage
- Zero-knowledge architecture (data never leaves device unencrypted)

✅ **Session Management**
- Matter code organization
- Client code tracking
- Session descriptions
- Persistent storage of sessions
- Search and filter sessions

✅ **User Interface**
- Dashboard with stats and recent sessions
- Recording screen with controls
- Session library
- Settings for encryption configuration

---

## Installation

### Prerequisites

- Node.js 18+ (Download from https://nodejs.org/)
- npm (comes with Node.js)

### Setup

1. **Navigate to the desktop directory:**
   ```bash
   cd desktop
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

4. **Configure settings in `.env`:**
   - Set storage provider (local, aws, azure, etc.)
   - Add API keys if needed (for future transcription features)

---

## Running the App

### Development Mode

```bash
npm start
```

**Windows Users:** If `npm start` exits immediately without launching the app, use:
```powershell
.\node_modules\.bin\electron.cmd .
```
or
```powershell
npx electron .
```
See [Troubleshooting](#npm-start-exits-immediately-on-windows-no-output) for details.

Or with development tools:

```bash
npm run dev
```

This will open the VaultScribe desktop app with DevTools enabled.

---

## Usage

### 1. Set Encryption Passphrase (Recommended)

1. Go to **Settings** screen
2. Enter a strong passphrase (minimum 8 characters)
3. Click "Set Passphrase"
4. **Important:** Remember this passphrase! It cannot be recovered.

All recordings will be encrypted with this passphrase before being saved.

### 2. Start Recording

#### Quick Start:
1. Go to **Dashboard**
2. Click "Start Recording Now"
3. Enter matter code (required)
4. Click "Start Recording"

#### With Options:
1. Go to **Record** screen
2. Enter session information:
   - **Matter Code** (required): Case number, client ID, project code
   - **Client Code** (optional): Additional identifier
   - **Description** (optional): Notes about this session

3. Configure audio sources:
   - ✅ **Capture system audio**: Records Zoom/Teams/Meet calls
     - Select the window/screen to record from
   - ✅ **Include microphone**: Records your voice

4. Click "🎙️ Start Recording"

### 3. During Recording

The recording screen shows:
- **Duration**: Elapsed recording time
- **File Size**: Estimated file size
- **Waveform**: Real-time audio visualization
- **Controls**:
  - ⏸️ **Pause**: Temporarily pause recording
  - ⏹️ **Stop**: End and save recording

You can minimize the window - recording continues in the background.

### 4. View Recordings

1. Go to **Library** screen
2. Browse all sessions
3. Search by matter code, client code, or description
4. Filter by status
5. Click a session to view details

---

## Project Structure

```
desktop/
├── electron.js              # Main Electron process
├── preload.js               # Preload script (security bridge)
├── package.json             # Dependencies and build config
├── .env.example             # Environment config template
├── src/
│   ├── main/                # Main process code
│   │   └── services/
│   │       ├── audio-capture.js    # System audio recording
│   │       ├── encryption.js       # AES-256-GCM encryption
│   │       └── session-manager.js  # Session storage & management
│   └── renderer/            # Renderer process (UI)
│       ├── index.html       # Main HTML
│       ├── css/
│       │   └── main.css     # Styles
│       └── js/
│           └── app.js       # Frontend logic
├── recordings/              # Stored recordings (encrypted)
└── resources/               # App icons and resources
```

---

## Architecture

### Security Model

**Zero-Knowledge Architecture:**
1. Audio captured locally on your computer
2. Encrypted with your passphrase (never sent to server)
3. Encrypted file saved to local storage
4. VaultScribe never has access to:
   - Your passphrase
   - Unencrypted audio
   - Unencrypted transcripts

**Encryption Details:**
- Algorithm: AES-256-GCM (military-grade)
- Key Derivation: PBKDF2 with 100,000 iterations
- Unique salt and IV per file
- Authentication tags for integrity verification

### Audio Capture

Uses Electron's `desktopCapturer` API to capture:
- **System Audio**: Entire system sound (records Zoom/Teams/Meet)
- **Microphone**: Your voice input
- **Mixed**: Both system audio and microphone combined

Format: WebM audio codec (Opus), 16kHz sample rate

---

## Permissions Required

### macOS
- **Screen Recording**: Required for system audio capture
  - System Preferences → Security & Privacy → Screen Recording
  - Enable permission for VaultScribe

### Windows
- No special permissions required

### Linux
- Audio access permissions may be required depending on distribution

---

## Building for Production

Build installers for distribution:

### macOS (DMG)
```bash
npm run build:mac
```

Output: `dist/VaultScribe-1.0.0.dmg`

### Windows (NSIS Installer)
```bash
npm run build:win
```

Output: `dist/VaultScribe Setup 1.0.0.exe`

### Linux (AppImage, DEB)
```bash
npm run build:linux
```

Output:
- `dist/VaultScribe-1.0.0.AppImage`
- `dist/vaultscribe_1.0.0_amd64.deb`

---

## File Storage

### Local Storage (Default)

Recordings are saved to: `./recordings/`

**File naming:**
- Format: `recording-{sessionId}-{timestamp}.webm.enc`
- `.enc` extension indicates encrypted file

**Encrypted file structure:**
```
[salt (32 bytes)][iv (16 bytes)][authTag (16 bytes)][encrypted data]
```

To decrypt a file, you need:
1. The encrypted file
2. The original passphrase

### Cloud Storage (Phase 4)

Future versions will support:
- AWS S3
- Azure Blob Storage
- Google Cloud Storage
- On-premise SFTP

---

## Troubleshooting

### "Failed to capture system audio"
- **macOS**: Grant Screen Recording permission in System Preferences
- **Windows**: Try selecting a different audio source
- Make sure "Capture system audio" is checked and a source is selected

### "Encryption passphrase not set"
- Go to Settings and set an encryption passphrase
- Or uncheck encryption to save without encryption (not recommended)

### Recording is silent
- Check that the correct audio source is selected
- Make sure the application/meeting you're recording has audio
- Test with "Include microphone" to verify recording works

### App won't start
- Make sure Node.js 18+ is installed: `node --version`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check for errors in the console

### `npm start` exits immediately on Windows (no output)
**Known Issue:** On Windows, `npm start` may exit silently without launching the app. This is a PATH resolution issue where Windows finds `electron.js` instead of the Electron executable.

**Workaround:** Use the full path to the Electron binary:
```powershell
.\node_modules\.bin\electron.cmd .
```

Or use npx:
```powershell
npx electron .
```

**Root Cause:** Windows PATH resolution finds the `electron.js` source file before the Electron CLI executable, causing the command to fail silently.

### Can't find recordings
- Check the `recordings/` folder in the app directory
- Recordings are encrypted with `.enc` extension
- You need the passphrase to decrypt them

---

## Development

### Adding Features

1. **Main Process** (backend logic):
   - Add services to `src/main/services/`
   - Register IPC handlers in `electron.js`

2. **Renderer Process** (frontend UI):
   - Update `src/renderer/index.html` for UI
   - Update `src/renderer/css/main.css` for styles
   - Update `src/renderer/js/app.js` for logic
   - Call main process via `window.electronAPI.*`

3. **Preload Script**:
   - Expose new IPC channels in `preload.js`

### Security Best Practices

- Never store passphrases on disk
- Never send unencrypted audio over network
- Use `contextIsolation: true` in BrowserWindow
- Validate all user input
- Use HTTPS for all network requests

---

## Roadmap

### ✅ Phase 1 (Current - MVP)
- Core recording
- Client-side encryption
- Session management
- Basic UI

### 🔄 Phase 2 (Weeks 3-4)
- AssemblyAI transcription integration
- AI summaries (Claude)
- Full-text search
- PDF export
- Audio playback with sync

### 📋 Phase 3 (Weeks 5-6)
- System tray integration
- Global hotkeys
- Offline mode
- Auto-updates

### 🚀 Phase 4 (Weeks 7-10)
- Multi-cloud storage (AWS/Azure/GCP)
- Real-time transcription
- Calendar integration
- Meeting detection

See `IMPLEMENTATION_ROADMAP_PHASED.md` in the root directory for complete roadmap.

---

## Support

For issues, feature requests, or questions:
1. Check the documentation in the root directory
2. Review the troubleshooting section above
3. Check the console for error messages
4. Report issues with detailed steps to reproduce

---

## License

Proprietary - VaultScribe

All rights reserved. This software is for authorized use only.

---

**Built with:**
- Electron 28+ (Desktop framework)
- Node.js crypto (Encryption)
- HTML/CSS/JavaScript (UI)
- electron-store (Persistent storage)

**Zero-knowledge. Private by design. Secure by default.**
