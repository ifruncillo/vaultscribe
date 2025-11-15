# VaultScribe Desktop App - Complete Implementation Guide
## Build the Zero-Knowledge Electron App in 2 Weeks

---

## 📅 2-WEEK BUILD PLAN

### **Week 1: Core Functionality**

#### **Day 1: Project Setup**

**Morning: Initialize Electron App**
```bash
# Create new Electron project
mkdir vaultscribe-desktop
cd vaultscribe-desktop

# Initialize package.json
npm init -y

# Install Electron
npm install electron --save-dev

# Install core dependencies
npm install @azure/storage-blob aws-sdk axios dotenv

# Install dev tools
npm install electron-builder --save-dev
npm install concurrently --save-dev
```

**Afternoon: Project Structure**
```bash
# Create directory structure
mkdir -p src/main src/renderer src/shared resources build

# Create files
touch electron.js preload.js
touch src/main/{audio-capture,encryption,transcription,session-manager}.js
touch src/main/storage/{aws-s3,azure-blob,gcp-storage}.js
touch src/renderer/index.html
touch .env.example
**package.json:**
```json
{
  "name": "vaultscribe-desktop",
  "version": "1.0.0",
  "description": "Zero-knowledge meeting intelligence for regulated industries",
  "main": "electron.js",
  "scripts": {
    "start": "electron .",
    "dev": "NODE_ENV=development electron .",
    "build": "electron-builder",
    "build:mac": "electron-builder --mac",
    "build:win": "electron-builder --win",
    "build:linux": "electron-builder --linux"
  },
  "build": {
    "appId": "com.vaultscribe.desktop",
    "productName": "VaultScribe",
    "directories": {
      "output": "dist"
    },
    "files": [
      "electron.js",
      "preload.js",
      "src/**/*",
      "resources/**/*"
    ],
    "mac": {
      "category": "public.app-category.business",
      "target": ["dmg", "zip"],
      "icon": "resources/icon.icns"
    },
    "win": {
      "target": ["nsis", "portable"],
      "icon": "resources/icon.ico"
    },
    "linux": {
      "target": ["AppImage", "deb"],
      "category": "Office"
    }
  }
}
```

---

#### **Day 2: Audio Capture** (Copy from DESKTOP_APP_ARCHITECTURE.md)

1. Implement `src/main/audio-capture.js`
2. Test system audio detection
3. Test recording from Zoom/Teams

**Test Script:**
```javascript
// test-audio.js
const audioCapture = require('./src/main/audio-capture');

async function test() {
  const sources = await audioCapture.getAudioSources();
  console.log('Audio sources:', sources);

  if (sources.length > 0) {
    console.log('Starting recording...');
    await audioCapture.startRecording(sources[0].id, './test-recording.webm');

    setTimeout(async () => {
      await audioCapture.stopRecording();
      console.log('Recording saved to test-recording.webm');
    }, 5000);
  }
}

test();
```

---

#### **Day 3: Encryption**

1. Implement `src/main/encryption.js` (from architecture doc)
2. Test file encryption/decryption
3. Test metadata encryption

**Test Script:**
```javascript
// test-encryption.js
const encryptionService = require('./src/main/encryption');
const fs = require('fs').promises;

async function test() {
  const passphrase = 'test-passphrase-12345';
  const salt = Buffer.from('test-session-id');

  // Derive key
  const key = await encryptionService.deriveKey(passphrase, salt);
  console.log('Encryption key derived');

  // Create test file
  await fs.writeFile('test.txt', 'Confidential meeting content');

  // Encrypt
  const encrypted = await encryptionService.encryptFile('test.txt', key);
  await fs.writeFile('test.txt.encrypted', encrypted.encrypted);
  console.log('File encrypted');

  // Decrypt
  const decrypted = await encryptionService.decryptFile(
    encrypted.encrypted,
    key,
    encrypted.iv,
    encrypted.authTag
  );
  await fs.writeFile('test-decrypted.txt', decrypted);
  console.log('File decrypted - check test-decrypted.txt');
}

test();
```

---

#### **Day 4: Storage Providers**

**AWS S3:**
1. Implement `src/main/storage/aws-s3.js`
2. Test upload/download
3. Test presigned URLs

**Azure Blob:**
1. Implement `src/main/storage/azure-blob.js`
2. Test upload/download
3. Test SAS tokens

**Test with real customer credentials:**
```javascript
// test-storage.js
const AWSS3Storage = require('./src/main/storage/aws-s3');

async function test() {
  const storage = new AWSS3Storage({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: 'us-east-1',
    bucket: 'vaultscribe-test'
  });

  // Upload test file
  await storage.uploadFile('./test.txt', 'test/test.txt');
  console.log('File uploaded');

  // Generate presigned URL
  const url = await storage.getPresignedUrl('test/test.txt');
  console.log('Presigned URL:', url);

  // Download
  await storage.downloadFile('test/test.txt', './downloaded.txt');
  console.log('File downloaded');
}

test();
```

---

#### **Day 5: Transcription Integration**

1. Implement `src/main/transcription.js`
2. Test with AssemblyAI
3. Integrate encryption + storage + transcription

**Complete Workflow Test:**
```javascript
// test-full-workflow.js
const audioCapture = require('./src/main/audio-capture');
const encryptionService = require('./src/main/encryption');
const transcriptionService = require('./src/main/transcription');
const AWSS3Storage = require('./src/main/storage/aws-s3');

async function testFullWorkflow() {
  console.log('1. Recording audio...');
  const sources = await audioCapture.getAudioSources();
  await audioCapture.startRecording(sources[0].id, './recording.webm');

  setTimeout(async () => {
    console.log('2. Stopping recording...');
    await audioCapture.stopRecording();

    console.log('3. Setting up encryption...');
    const passphrase = 'customer-passphrase';
    const sessionId = 'test-session-123';
    const salt = Buffer.from(sessionId);
    const key = await encryptionService.deriveKey(passphrase, salt);

    console.log('4. Setting up storage...');
    const storage = new AWSS3Storage({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: 'us-east-1',
      bucket: 'customer-bucket'
    });

    console.log('5. Transcribing (zero-knowledge)...');
    const result = await transcriptionService.transcribeSession(
      sessionId,
      './recording.webm',
      storage,
      key
    );

    console.log('6. Transcript created:', result);

    console.log('7. Retrieving transcript...');
    const transcript = await transcriptionService.getTranscript(
      sessionId,
      storage,
      key
    );

    console.log('8. Transcript text:', transcript.text);
    console.log('SUCCESS! Zero-knowledge workflow complete.');

  }, 10000); // Record for 10 seconds
}

testFullWorkflow();
```

---

### **Week 1: Weekend**

**Review & Testing:**
- Run all test scripts
- Fix bugs
- Verify zero-knowledge (VaultScribe API sees no plaintext)
- Document any issues

---

### **Week 2: User Interface**

#### **Day 6-7: Main UI**

**Create React Setup:**
```bash
cd src/renderer
npm install react react-dom
npm install @vitejs/plugin-react --save-dev
```

**Or use Vanilla JS (faster for MVP):**

**File:** `src/renderer/index.html`

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>VaultScribe</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="app">
    <!-- Header -->
    <header class="header">
      <div class="logo">
        <img src="../resources/icon.png" alt="VaultScribe" width="32">
        <h1>VaultScribe</h1>
      </div>
      <div class="status">
        <span class="status-indicator" id="status"></span>
      </div>
    </header>

    <!-- Main Content -->
    <main class="main">
      <!-- Setup View (First Time) -->
      <div id="setup-view" class="view">
        <h2>Welcome to VaultScribe</h2>
        <p>Configure your zero-knowledge deployment</p>

        <div class="form-group">
          <label>Storage Provider</label>
          <select id="storage-provider">
            <option value="aws">AWS S3</option>
            <option value="azure">Azure Blob Storage</option>
            <option value="gcp">Google Cloud Storage</option>
            <option value="sftp">On-Premise (SFTP)</option>
          </select>
        </div>

        <!-- AWS Config -->
        <div id="aws-config" class="storage-config">
          <div class="form-group">
            <label>AWS Access Key ID</label>
            <input type="text" id="aws-key" placeholder="AKIAIOSFODNN7EXAMPLE">
          </div>
          <div class="form-group">
            <label>AWS Secret Access Key</label>
            <input type="password" id="aws-secret">
          </div>
          <div class="form-group">
            <label>AWS Region</label>
            <input type="text" id="aws-region" value="us-east-1">
          </div>
          <div class="form-group">
            <label>S3 Bucket</label>
            <input type="text" id="aws-bucket" placeholder="vaultscribe-recordings">
          </div>
        </div>

        <!-- Azure Config -->
        <div id="azure-config" class="storage-config" style="display: none;">
          <div class="form-group">
            <label>Azure Connection String</label>
            <input type="text" id="azure-connection">
          </div>
          <div class="form-group">
            <label>Container Name</label>
            <input type="text" id="azure-container" placeholder="vaultscribe">
          </div>
        </div>

        <div class="form-group">
          <label>Encryption Passphrase</label>
          <input type="password" id="passphrase" placeholder="Strong passphrase for encryption">
          <small>This encrypts all your data. Never share this. We cannot recover it if lost.</small>
        </div>

        <div class="form-group">
          <label>AssemblyAI API Key (Optional - use your own)</label>
          <input type="text" id="assemblyai-key">
          <small>Leave blank to use VaultScribe's shared key (less private)</small>
        </div>

        <button class="btn btn-primary" id="save-config">Save Configuration</button>
      </div>

      <!-- Recording View -->
      <div id="recording-view" class="view" style="display: none;">
        <div class="recorder">
          <h2>New Recording Session</h2>

          <div class="form-group">
            <label>Matter Code / Project ID</label>
            <input type="text" id="matter-code" placeholder="2024-001">
          </div>

          <div class="form-group">
            <label>Description</label>
            <input type="text" id="description" placeholder="Client meeting - Project kickoff">
          </div>

          <div class="form-group">
            <label>Audio Source</label>
            <select id="audio-source">
              <option value="">Select audio source...</option>
            </select>
            <button class="btn-small" id="refresh-sources">Refresh</button>
          </div>

          <div class="recording-controls">
            <button class="btn btn-primary btn-large" id="start-recording">
              <span class="icon">🎙️</span>
              Start Recording
            </button>
            <button class="btn btn-danger btn-large" id="stop-recording" disabled>
              <span class="icon">⏹️</span>
              Stop Recording
            </button>
          </div>

          <div id="recording-status" class="recording-status" style="display: none;">
            <div class="recording-indicator">
              <span class="dot"></span> Recording in progress
            </div>
            <div class="recording-time" id="recording-time">00:00</div>
            <div class="recording-size" id="recording-size">0 KB</div>
          </div>
        </div>

        <!-- Sessions List -->
        <div class="sessions">
          <h3>Recent Sessions</h3>
          <div id="sessions-list">
            <!-- Populated by JavaScript -->
          </div>
        </div>
      </div>

      <!-- Transcript View -->
      <div id="transcript-view" class="view" style="display: none;">
        <div class="transcript-header">
          <button class="btn-back" id="back-to-sessions">← Back</button>
          <h2 id="transcript-title">Transcript</h2>
        </div>

        <div class="transcript-meta" id="transcript-meta">
          <!-- Metadata -->
        </div>

        <div class="transcript-content">
          <div class="summary" id="summary">
            <!-- AI Summary -->
          </div>

          <div class="transcript-text" id="transcript-text">
            <!-- Transcript -->
          </div>
        </div>

        <div class="transcript-actions">
          <button class="btn btn-primary" id="export-pdf">Export PDF</button>
          <button class="btn btn-secondary" id="export-txt">Export TXT</button>
        </div>
      </div>
    </main>
  </div>

  <script src="app.js"></script>
</body>
</html>
```

**File:** `src/renderer/app.js`

```javascript
// Renderer Process - UI Logic

const { ipcRenderer } = window.electron;

let currentSession = null;
let recordingStartTime = null;
let recordingInterval = null;
let config = null;

// Load configuration
async function loadConfig() {
  config = await ipcRenderer.invoke('get-config');

  if (!config || !config.storageProvider) {
    showView('setup-view');
  } else {
    showView('recording-view');
    loadAudioSources();
    loadSessions();
  }
}

// Save configuration
document.getElementById('save-config')?.addEventListener('click', async () => {
  const provider = document.getElementById('storage-provider').value;

  const config = {
    storageProvider: provider,
    passphrase: document.getElementById('passphrase').value,
    assemblyAiKey: document.getElementById('assemblyai-key').value || null
  };

  if (provider === 'aws') {
    config.aws = {
      accessKeyId: document.getElementById('aws-key').value,
      secretAccessKey: document.getElementById('aws-secret').value,
      region: document.getElementById('aws-region').value,
      bucket: document.getElementById('aws-bucket').value
    };
  } else if (provider === 'azure') {
    config.azure = {
      connectionString: document.getElementById('azure-connection').value,
      containerName: document.getElementById('azure-container').value
    };
  }

  await ipcRenderer.invoke('save-config', config);
  alert('Configuration saved!');
  showView('recording-view');
});

// Load audio sources
async function loadAudioSources() {
  const sources = await ipcRenderer.invoke('get-audio-sources');
  const select = document.getElementById('audio-source');

  select.innerHTML = '<option value="">Select audio source...</option>';

  sources.forEach(source => {
    const option = document.createElement('option');
    option.value = source.id;
    option.textContent = `${source.name} (${source.type})`;
    select.appendChild(option);
  });
}

// Refresh audio sources
document.getElementById('refresh-sources')?.addEventListener('click', loadAudioSources);

// Start recording
document.getElementById('start-recording')?.addEventListener('click', async () => {
  const matterCode = document.getElementById('matter-code').value;
  const description = document.getElementById('description').value;
  const sourceId = document.getElementById('audio-source').value;

  if (!matterCode || !sourceId) {
    alert('Please enter matter code and select audio source');
    return;
  }

  // Create session
  const session = await ipcRenderer.invoke('create-session', {
    matterCode,
    description
  });

  currentSession = session;

  // Start recording
  await ipcRenderer.invoke('start-recording', sourceId, session.id);

  // Update UI
  document.getElementById('start-recording').disabled = true;
  document.getElementById('stop-recording').disabled = false;
  document.getElementById('recording-status').style.display = 'block';

  // Start timer
  recordingStartTime = Date.now();
  recordingInterval = setInterval(updateRecordingTime, 1000);
});

// Stop recording
document.getElementById('stop-recording')?.addEventListener('click', async () => {
  await ipcRenderer.invoke('stop-recording');

  // Clear timer
  clearInterval(recordingInterval);

  // Update UI
  document.getElementById('start-recording').disabled = false;
  document.getElementById('stop-recording').disabled = true;
  document.getElementById('recording-status').style.display = 'none';

  // Start transcription
  const result = await ipcRenderer.invoke('upload-and-transcribe', {
    sessionId: currentSession.id,
    audioPath: currentSession.audioPath,
    passphrase: config.passphrase,
    storageConfig: config[config.storageProvider]
  });

  alert('Transcription started! Check back in a few minutes.');

  // Reload sessions
  loadSessions();
  currentSession = null;
});

// Update recording time
function updateRecordingTime() {
  const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  document.getElementById('recording-time').textContent =
    `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Load sessions
async function loadSessions() {
  const sessions = await ipcRenderer.invoke('get-sessions');
  const list = document.getElementById('sessions-list');

  list.innerHTML = '';

  sessions.forEach(session => {
    const div = document.createElement('div');
    div.className = 'session-item';
    div.innerHTML = `
      <div class="session-info">
        <strong>${session.matterCode}</strong>
        <span>${session.description}</span>
        <small>${new Date(session.createdAt).toLocaleString()}</small>
      </div>
      <button class="btn-small" onclick="viewTranscript('${session.id}')">
        View Transcript
      </button>
    `;
    list.appendChild(div);
  });
}

// View transcript
async function viewTranscript(sessionId) {
  const transcript = await ipcRenderer.invoke('get-transcript', {
    sessionId,
    passphrase: config.passphrase,
    storageConfig: config[config.storageProvider]
  });

  document.getElementById('transcript-title').textContent =
    `Transcript - ${transcript.matterCode}`;

  document.getElementById('summary').innerHTML = `
    <h3>Summary</h3>
    <p>${transcript.summary || 'Generating...'}</p>
  `;

  document.getElementById('transcript-text').innerHTML = transcript.text;

  showView('transcript-view');
}

// Navigation
function showView(viewId) {
  document.querySelectorAll('.view').forEach(view => {
    view.style.display = 'none';
  });
  document.getElementById(viewId).style.display = 'block';
}

document.getElementById('back-to-sessions')?.addEventListener('click', () => {
  showView('recording-view');
});

// Initialize
loadConfig();
```

---

## ⚙️ IPC HANDLERS (Complete electron.js)

Add session management:

```javascript
// In electron.js

const Store = require('electron-store');
const store = new Store();

// Get configuration
ipcMain.handle('get-config', () => {
  return store.get('config');
});

// Save configuration
ipcMain.handle('save-config', (event, config) => {
  store.set('config', config);
  return true;
});

// Create session
ipcMain.handle('create-session', async (event, { matterCode, description }) => {
  const sessionId = require('crypto').randomBytes(16).toString('hex');

  const session = {
    id: sessionId,
    matterCode,
    description,
    createdAt: new Date().toISOString(),
    status: 'recording'
  };

  // Save to store
  const sessions = store.get('sessions', []);
  sessions.push(session);
  store.set('sessions', sessions);

  return session;
});

// Get sessions
ipcMain.handle('get-sessions', () => {
  return store.get('sessions', []);
});
```

---

This gives you the complete desktop app. Should I continue with:
1. Packaging scripts (electron-builder config)
2. Auto-updater implementation
3. Code signing setup
4. Distribution strategy

