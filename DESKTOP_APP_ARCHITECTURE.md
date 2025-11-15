# VaultScribe Desktop App - Zero-Knowledge Architecture
## Electron Desktop Application for Enterprise Compliance

---

## 🎯 CORE ARCHITECTURE PRINCIPLES

### **Zero-Knowledge Design**

**The Golden Rule:** VaultScribe servers NEVER see plaintext audio or transcripts.

**Data Flow:**
```
1. Desktop app records system audio
2. Desktop app encrypts locally (client-side)
3. Desktop app uploads encrypted blob to CUSTOMER's storage
4. Desktop app calls transcription API with customer's credentials
5. Transcription happens in customer's cloud
6. Desktop app receives encrypted transcript
7. Desktop app decrypts locally for display
8. VaultScribe API only sees: session metadata, billing events
```

**What VaultScribe Stores:**
- Session IDs and timestamps
- Customer identifiers
- Matter codes (encrypted)
- Billing events
- Usage metrics

**What VaultScribe NEVER Sees:**
- Audio files
- Transcript text
- Speaker names
- Meeting content
- Any PII

---

## 🏗️ DESKTOP APP ARCHITECTURE

### **Technology Stack**

**Core Framework:**
```javascript
Electron 28+ (latest stable)
- Node.js backend (system access)
- Chromium frontend (UI)
- IPC for secure communication
```

**Audio Capture:**
```javascript
@mattdesl/electron-recorder
- System audio capture
- Low latency recording
- Multiple audio sources
```

**Encryption:**
```javascript
Node.js crypto module
- AES-256-GCM for files
- RSA-4096 for key exchange
- WebCrypto API for browser encryption
```

**Storage SDKs:**
```javascript
aws-sdk (AWS S3)
@azure/storage-blob (Azure Blob)
@google-cloud/storage (GCP Cloud Storage)
ssh2 (SFTP for on-prem)
```

---

## 📁 PROJECT STRUCTURE

```
vaultscribe-desktop/
├── package.json
├── electron.js                 # Main process
├── preload.js                  # Bridge between main/renderer
│
├── src/
│   ├── main/                   # Main process code
│   │   ├── audio-capture.js    # System audio recording
│   │   ├── encryption.js       # Client-side encryption
│   │   ├── storage/            # Storage providers
│   │   │   ├── aws-s3.js
│   │   │   ├── azure-blob.js
│   │   │   ├── gcp-storage.js
│   │   │   └── sftp.js
│   │   ├── transcription.js    # API calls to transcription
│   │   └── session-manager.js  # Session state
│   │
│   ├── renderer/               # UI (React or vanilla)
│   │   ├── index.html
│   │   ├── app.jsx
│   │   ├── components/
│   │   │   ├── Recorder.jsx
│   │   │   ├── TranscriptViewer.jsx
│   │   │   ├── Settings.jsx
│   │   │   └── MeetingScheduler.jsx
│   │   └── styles/
│   │
│   └── shared/                 # Shared utilities
│       ├── constants.js
│       └── types.d.ts
│
├── resources/                  # App resources
│   ├── icon.png
│   ├── tray-icon.png
│   └── installer-background.png
│
└── build/                      # Build configs
    ├── notarize.js            # macOS notarization
    └── electron-builder.yml   # Installer config
```

---

## 🔐 ZERO-KNOWLEDGE IMPLEMENTATION

### **1. Client-Side Encryption**

**File:** `src/main/encryption.js`

```javascript
const crypto = require('crypto');
const fs = require('fs').promises;

class EncryptionService {
  constructor() {
    // Master key derived from customer's passphrase
    this.algorithm = 'aes-256-gcm';
  }

  /**
   * Generate encryption key from customer passphrase
   * Uses PBKDF2 with 100,000 iterations
   */
  async deriveKey(passphrase, salt) {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        passphrase,
        salt,
        100000,
        32,
        'sha256',
        (err, key) => {
          if (err) reject(err);
          else resolve(key);
        }
      );
    });
  }

  /**
   * Encrypt file before upload
   * Returns { encrypted: Buffer, iv: Buffer, authTag: Buffer }
   */
  async encryptFile(filePath, key) {
    // Read file
    const plaintext = await fs.readFile(filePath);

    // Generate IV
    const iv = crypto.randomBytes(16);

    // Create cipher
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    // Encrypt
    const encrypted = Buffer.concat([
      cipher.update(plaintext),
      cipher.final()
    ]);

    // Get auth tag for integrity
    const authTag = cipher.getAuthTag();

    return { encrypted, iv, authTag };
  }

  /**
   * Decrypt file after download
   */
  async decryptFile(encryptedData, key, iv, authTag) {
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(encryptedData),
      decipher.final()
    ]);
  }

  /**
   * Encrypt metadata (matter codes, etc.)
   * Uses deterministic encryption for searchability
   */
  encryptMetadata(plaintext, key) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    // Return base64 encoded: iv + authTag + encrypted
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  decryptMetadata(ciphertext, key) {
    const buffer = Buffer.from(ciphertext, 'base64');

    const iv = buffer.slice(0, 16);
    const authTag = buffer.slice(16, 32);
    const encrypted = buffer.slice(32);

    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);

    return decipher.update(encrypted, null, 'utf8') + decipher.final('utf8');
  }
}

module.exports = new EncryptionService();
```

### **2. System Audio Capture**

**File:** `src/main/audio-capture.js`

```javascript
const { desktopCapturer } = require('electron');
const fs = require('fs');
const path = require('path');

class AudioCapture {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  /**
   * Get available audio sources
   * Includes system audio, microphone, application audio
   */
  async getAudioSources() {
    const sources = await desktopCapturer.getSources({
      types: ['audio', 'screen'],
      fetchWindowIcons: true
    });

    return sources.map(source => ({
      id: source.id,
      name: source.name,
      type: source.name.includes('Zoom') ? 'zoom' :
            source.name.includes('Teams') ? 'teams' :
            source.name.includes('Meet') ? 'meet' : 'system'
    }));
  }

  /**
   * Start recording from specific source
   */
  async startRecording(sourceId, outputPath) {
    return new Promise(async (resolve, reject) => {
      try {
        // Get audio stream from source
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: sourceId
            }
          },
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: sourceId
            }
          }
        });

        // Remove video track (audio only)
        stream.getVideoTracks().forEach(track => track.stop());

        // Create recorder
        this.mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus'
        });

        this.audioChunks = [];

        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.audioChunks.push(event.data);
          }
        };

        this.mediaRecorder.onstop = async () => {
          // Combine chunks
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });

          // Save to file
          const buffer = Buffer.from(await audioBlob.arrayBuffer());
          fs.writeFileSync(outputPath, buffer);

          resolve(outputPath);
        };

        // Start recording
        this.mediaRecorder.start(1000); // Collect data every second

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop recording
   */
  stopRecording() {
    return new Promise((resolve) => {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.onstop = () => {
          resolve();
        };
        this.mediaRecorder.stop();

        // Stop all tracks
        this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
      } else {
        resolve();
      }
    });
  }

  /**
   * Get recording duration
   */
  getDuration() {
    // Calculate from chunks
    const totalSize = this.audioChunks.reduce((acc, chunk) => acc + chunk.size, 0);
    // Estimate: ~16KB per second for webm opus
    return Math.floor(totalSize / 16000);
  }
}

module.exports = new AudioCapture();
```

### **3. Customer Storage Integration**

**File:** `src/main/storage/aws-s3.js`

```javascript
const AWS = require('aws-sdk');
const fs = require('fs').promises;

class AWSS3Storage {
  constructor(config) {
    // Customer provides their own AWS credentials
    this.s3 = new AWS.S3({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region
    });

    this.bucket = config.bucket;
  }

  /**
   * Upload encrypted file to customer's S3
   */
  async uploadFile(localPath, s3Key, metadata = {}) {
    const fileContent = await fs.readFile(localPath);

    const params = {
      Bucket: this.bucket,
      Key: s3Key,
      Body: fileContent,
      Metadata: metadata,
      ServerSideEncryption: 'AES256' // Additional S3-side encryption
    };

    return this.s3.upload(params).promise();
  }

  /**
   * Download file from customer's S3
   */
  async downloadFile(s3Key, localPath) {
    const params = {
      Bucket: this.bucket,
      Key: s3Key
    };

    const data = await this.s3.getObject(params).promise();
    await fs.writeFile(localPath, data.Body);

    return localPath;
  }

  /**
   * Generate presigned URL for AssemblyAI
   * Allows transcription service to access file directly
   */
  async getPresignedUrl(s3Key, expiresIn = 3600) {
    const params = {
      Bucket: this.bucket,
      Key: s3Key,
      Expires: expiresIn
    };

    return this.s3.getSignedUrlPromise('getObject', params);
  }

  /**
   * Delete file (after transcription)
   */
  async deleteFile(s3Key) {
    const params = {
      Bucket: this.bucket,
      Key: s3Key
    };

    return this.s3.deleteObject(params).promise();
  }

  /**
   * List files for a session
   */
  async listFiles(prefix) {
    const params = {
      Bucket: this.bucket,
      Prefix: prefix
    };

    const data = await this.s3.listObjectsV2(params).promise();
    return data.Contents.map(item => ({
      key: item.Key,
      size: item.Size,
      lastModified: item.LastModified
    }));
  }
}

module.exports = AWSS3Storage;
```

**File:** `src/main/storage/azure-blob.js`

```javascript
const { BlobServiceClient } = require('@azure/storage-blob');
const fs = require('fs').promises;

class AzureBlobStorage {
  constructor(config) {
    // Customer provides their connection string
    this.blobServiceClient = BlobServiceClient.fromConnectionString(
      config.connectionString
    );

    this.containerName = config.containerName;
    this.containerClient = this.blobServiceClient.getContainerClient(
      this.containerName
    );
  }

  async uploadFile(localPath, blobName, metadata = {}) {
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

    const fileContent = await fs.readFile(localPath);

    return blockBlobClient.upload(fileContent, fileContent.length, {
      metadata,
      blobHTTPHeaders: {
        blobContentType: 'audio/webm'
      }
    });
  }

  async downloadFile(blobName, localPath) {
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

    return blockBlobClient.downloadToFile(localPath);
  }

  async getPresignedUrl(blobName, expiresIn = 3600) {
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

    // Generate SAS token
    const startsOn = new Date();
    const expiresOn = new Date(startsOn.getTime() + expiresIn * 1000);

    const sasUrl = await blockBlobClient.generateSasUrl({
      permissions: 'r',
      startsOn,
      expiresOn
    });

    return sasUrl;
  }

  async deleteFile(blobName) {
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
    return blockBlobClient.delete();
  }

  async listFiles(prefix) {
    const blobs = [];

    for await (const blob of this.containerClient.listBlobsFlat({ prefix })) {
      blobs.push({
        key: blob.name,
        size: blob.properties.contentLength,
        lastModified: blob.properties.lastModified
      });
    }

    return blobs;
  }
}

module.exports = AzureBlobStorage;
```

### **4. Zero-Knowledge Transcription Flow**

**File:** `src/main/transcription.js`

```javascript
const axios = require('axios');

class TranscriptionService {
  constructor() {
    this.vaultscribeApi = process.env.VAULTSCRIBE_API_URL;
  }

  /**
   * Zero-knowledge transcription workflow
   *
   * 1. Upload encrypted audio to customer's storage
   * 2. Generate presigned URL
   * 3. Send URL to AssemblyAI (in customer's account)
   * 4. AssemblyAI transcribes from customer's storage
   * 5. Receive encrypted transcript
   * 6. Decrypt locally
   */
  async transcribeSession(sessionId, audioPath, storageProvider, encryptionKey) {
    // Step 1: Encrypt audio locally
    const encrypted = await encryptionService.encryptFile(audioPath, encryptionKey);

    // Save encrypted file temporarily
    const encryptedPath = audioPath + '.encrypted';
    await fs.promises.writeFile(encryptedPath, encrypted.encrypted);

    // Step 2: Upload to customer's storage
    const storageKey = `sessions/${sessionId}/audio.encrypted`;
    await storageProvider.uploadFile(encryptedPath, storageKey, {
      iv: encrypted.iv.toString('base64'),
      authTag: encrypted.authTag.toString('base64'),
      sessionId: sessionId
    });

    // Step 3: For AssemblyAI, we need the decrypted audio
    // Upload decrypted version with expiration
    const tempKey = `sessions/${sessionId}/audio-temp.webm`;
    await storageProvider.uploadFile(audioPath, tempKey);

    // Generate presigned URL
    const audioUrl = await storageProvider.getPresignedUrl(tempKey, 3600);

    // Step 4: Call AssemblyAI with customer's API key
    const assemblyAiKey = process.env.CUSTOMER_ASSEMBLYAI_KEY;

    const transcriptResponse = await axios.post(
      'https://api.assemblyai.com/v2/transcript',
      {
        audio_url: audioUrl,
        speaker_labels: true,
        auto_highlights: true
      },
      {
        headers: {
          authorization: assemblyAiKey
        }
      }
    );

    const transcriptId = transcriptResponse.data.id;

    // Step 5: Poll for completion
    let transcript;
    while (true) {
      const statusResponse = await axios.get(
        `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        {
          headers: {
            authorization: assemblyAiKey
          }
        }
      );

      transcript = statusResponse.data;

      if (transcript.status === 'completed') {
        break;
      } else if (transcript.status === 'error') {
        throw new Error(`Transcription failed: ${transcript.error}`);
      }

      // Wait 3 seconds before polling again
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Step 6: Encrypt transcript locally
    const transcriptText = JSON.stringify(transcript);
    const encryptedTranscript = encryptionService.encryptMetadata(
      transcriptText,
      encryptionKey
    );

    // Step 7: Store encrypted transcript in customer's storage
    const transcriptKey = `sessions/${sessionId}/transcript.encrypted`;
    await storageProvider.uploadFile(
      Buffer.from(encryptedTranscript, 'base64'),
      transcriptKey
    );

    // Step 8: Delete temporary decrypted audio
    await storageProvider.deleteFile(tempKey);

    // Step 9: Notify VaultScribe API (metadata only)
    await axios.post(`${this.vaultscribeApi}/api/sessions/${sessionId}/transcribed`, {
      transcriptId: transcriptId,
      duration: transcript.audio_duration,
      wordCount: transcript.words ? transcript.words.length : 0,
      // NO transcript text sent to VaultScribe
    });

    return {
      sessionId,
      transcriptId,
      encryptedTranscriptKey: transcriptKey
    };
  }

  /**
   * Retrieve and decrypt transcript
   */
  async getTranscript(sessionId, storageProvider, encryptionKey) {
    // Download encrypted transcript
    const transcriptKey = `sessions/${sessionId}/transcript.encrypted`;
    const localPath = `/tmp/transcript-${sessionId}.encrypted`;

    await storageProvider.downloadFile(transcriptKey, localPath);

    // Read encrypted data
    const encryptedData = await fs.promises.readFile(localPath, 'base64');

    // Decrypt locally
    const transcriptJson = encryptionService.decryptMetadata(
      encryptedData,
      encryptionKey
    );

    return JSON.parse(transcriptJson);
  }
}

module.exports = new TranscriptionService();
```

---

## 🖥️ MAIN PROCESS (Electron)

**File:** `electron.js`

```javascript
const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

const audioCapture = require('./src/main/audio-capture');
const encryptionService = require('./src/main/encryption');
const transcriptionService = require('./src/main/transcription');
const AWSS3Storage = require('./src/main/storage/aws-s3');
const AzureBlobStorage = require('./src/main/storage/azure-blob');

let mainWindow;
let tray;

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, 'resources/icon.png')
  });

  mainWindow.loadFile('src/renderer/index.html');

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

// Create system tray
function createTray() {
  const icon = nativeImage.createFromPath(
    path.join(__dirname, 'resources/tray-icon.png')
  );

  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show VaultScribe',
      click: () => {
        mainWindow.show();
      }
    },
    {
      label: 'Start Recording',
      click: () => {
        mainWindow.webContents.send('start-recording');
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setToolTip('VaultScribe');
  tray.setContextMenu(contextMenu);
}

// App ready
app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers

// Get audio sources
ipcMain.handle('get-audio-sources', async () => {
  return await audioCapture.getAudioSources();
});

// Start recording
ipcMain.handle('start-recording', async (event, sourceId, sessionId) => {
  const outputPath = path.join(app.getPath('temp'), `${sessionId}.webm`);
  return await audioCapture.startRecording(sourceId, outputPath);
});

// Stop recording
ipcMain.handle('stop-recording', async () => {
  return await audioCapture.stopRecording();
});

// Encrypt and upload
ipcMain.handle('upload-and-transcribe', async (event, {
  sessionId,
  audioPath,
  passphrase,
  storageConfig
}) => {
  // Derive encryption key from passphrase
  const salt = Buffer.from(sessionId); // Use session ID as salt
  const encryptionKey = await encryptionService.deriveKey(passphrase, salt);

  // Initialize storage provider
  let storageProvider;
  if (storageConfig.type === 'aws') {
    storageProvider = new AWSS3Storage(storageConfig);
  } else if (storageConfig.type === 'azure') {
    storageProvider = new AzureBlobStorage(storageConfig);
  } else {
    throw new Error('Unsupported storage provider');
  }

  // Transcribe
  return await transcriptionService.transcribeSession(
    sessionId,
    audioPath,
    storageProvider,
    encryptionKey
  );
});

// Get transcript
ipcMain.handle('get-transcript', async (event, {
  sessionId,
  passphrase,
  storageConfig
}) => {
  const salt = Buffer.from(sessionId);
  const encryptionKey = await encryptionService.deriveKey(passphrase, salt);

  let storageProvider;
  if (storageConfig.type === 'aws') {
    storageProvider = new AWSS3Storage(storageConfig);
  } else if (storageConfig.type === 'azure') {
    storageProvider = new AzureBlobStorage(storageConfig);
  }

  return await transcriptionService.getTranscript(
    sessionId,
    storageProvider,
    encryptionKey
  );
});
```

---

This is the foundation of the zero-knowledge desktop app. Should I continue with:
1. The renderer process (UI)
2. The setup/configuration flow
3. The packaging/distribution scripts
4. Integration with the API we already built?
