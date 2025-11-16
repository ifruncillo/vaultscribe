const { app, BrowserWindow, ipcMain, desktopCapturer } = require('electron');
const path = require('path');
const fs = require('fs');

// Services
// Note: AudioCapture is handled in renderer process due to browser API requirements
const EncryptionService = require('./src/main/services/encryption');
const SessionManager = require('./src/main/services/session-manager');

let mainWindow;
let encryptionService;
let sessionManager;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    title: 'VaultScribe',
    backgroundColor: '#1e3a8a',
    show: false
  });

  mainWindow.loadFile('src/renderer/index.html');

  // Show window when ready to avoid flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools only in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Log renderer errors
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer ${level}]:`, message, `(${sourceId}:${line})`);
  });

  mainWindow.webContents.on('crashed', (event, killed) => {
    console.error('Renderer process crashed:', { killed });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialize services
function initializeServices() {
  encryptionService = new EncryptionService();
  sessionManager = new SessionManager();

  console.log('VaultScribe services initialized');
}

// App lifecycle
app.whenReady().then(() => {
  initializeServices();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers

// Get available audio sources
ipcMain.handle('get-audio-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      fetchWindowIcons: true
    });

    return sources.map(source => {
      // Determine source type
      const isScreen = source.id.startsWith('screen:');

      // Detect browser windows for better labeling
      const browserNames = ['Chrome', 'Firefox', 'Edge', 'Safari', 'Brave', 'Opera'];
      const isBrowser = browserNames.some(browser => source.name.includes(browser));

      let displayName = source.name;

      if (isBrowser) {
        // Extract browser name
        const browserName = browserNames.find(b => source.name.includes(b)) || 'Browser';
        displayName = `🌐 ${browserName} (all tabs with audio)`;
      } else if (isScreen) {
        displayName = `📺 ${source.name} (all audio on this screen)`;
      } else {
        displayName = `🪟 ${source.name}`;
      }

      return {
        id: source.id,
        name: source.name,
        displayName: displayName,
        isScreen: isScreen,
        isBrowser: isBrowser,
        thumbnail: source.thumbnail.toDataURL()
      };
    });
  } catch (error) {
    console.error('Error getting audio sources:', error);
    throw error;
  }
});

// Create new session
ipcMain.handle('create-session', async (event, sessionData) => {
  try {
    const session = await sessionManager.createSession(sessionData);
    return session;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
});

// Audio recording handlers
// Note: Audio capture is handled in renderer process due to browser API requirements
// These handlers provide file encryption after recording is complete in renderer

let pendingRecordingData = null;

ipcMain.handle('start-recording', async (event, options) => {
  try {
    // Store session info for later use
    pendingRecordingData = {
      sessionId: options.sessionId,
      startTime: Date.now()
    };

    // Return success - actual recording happens in renderer process
    return {
      success: true,
      sessionId: options.sessionId,
      startTime: pendingRecordingData.startTime
    };
  } catch (error) {
    console.error('Error starting recording:', error);
    throw error;
  }
});

ipcMain.handle('stop-recording', async (event, recordingData) => {
  try {
    // recordingData should include: { audioPath, duration, fileSize }
    let result = { ...recordingData };

    // Encrypt the recorded file if encryption is enabled
    if (result.audioPath && encryptionService.isEnabled()) {
      const encryptedPath = await encryptionService.encryptFile(result.audioPath);

      // Delete original unencrypted file
      fs.unlinkSync(result.audioPath);

      result.audioPath = encryptedPath;
      result.encrypted = true;
    }

    pendingRecordingData = null;
    return result;
  } catch (error) {
    console.error('Error stopping recording:', error);
    throw error;
  }
});

ipcMain.handle('pause-recording', async () => {
  // Handled in renderer process
  return { success: true, state: 'paused' };
});

ipcMain.handle('resume-recording', async () => {
  // Handled in renderer process
  return { success: true, state: 'recording' };
});

ipcMain.handle('get-recording-status', () => {
  // Handled in renderer process
  return { state: 'idle', duration: 0, fileSize: 0 };
});

// File system handler for saving recordings from renderer
ipcMain.handle('save-recording', async (event, audioBuffer, sessionId) => {
  try {
    const recordingsDir = path.join(process.cwd(), 'recordings');

    // Create recordings directory if it doesn't exist
    if (!fs.existsSync(recordingsDir)) {
      fs.mkdirSync(recordingsDir, { recursive: true });
    }

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `recording-${sessionId}-${timestamp}.webm`;
    const audioPath = path.join(recordingsDir, filename);

    // Save the buffer
    fs.writeFileSync(audioPath, Buffer.from(audioBuffer));

    console.log('Recording saved:', audioPath);

    return {
      success: true,
      audioPath,
      fileSize: fs.statSync(audioPath).size
    };
  } catch (error) {
    console.error('Error saving recording:', error);
    throw error;
  }
});

// Encryption handlers
ipcMain.handle('set-encryption-passphrase', async (event, passphrase) => {
  try {
    await encryptionService.setPassphrase(passphrase);
    return { success: true };
  } catch (error) {
    console.error('Error setting passphrase:', error);
    throw error;
  }
});

ipcMain.handle('encrypt-file', async (event, filePath) => {
  try {
    const encryptedPath = await encryptionService.encryptFile(filePath);
    return { encryptedPath };
  } catch (error) {
    console.error('Error encrypting file:', error);
    throw error;
  }
});

ipcMain.handle('decrypt-file', async (event, encryptedPath) => {
  try {
    const decryptedPath = await encryptionService.decryptFile(encryptedPath);
    return { decryptedPath };
  } catch (error) {
    console.error('Error decrypting file:', error);
    throw error;
  }
});

// Session management handlers
ipcMain.handle('get-sessions', async () => {
  try {
    return await sessionManager.getAllSessions();
  } catch (error) {
    console.error('Error getting sessions:', error);
    throw error;
  }
});

ipcMain.handle('get-session', async (event, sessionId) => {
  try {
    return await sessionManager.getSession(sessionId);
  } catch (error) {
    console.error('Error getting session:', error);
    throw error;
  }
});

ipcMain.handle('update-session', async (event, sessionId, updates) => {
  try {
    return await sessionManager.updateSession(sessionId, updates);
  } catch (error) {
    console.error('Error updating session:', error);
    throw error;
  }
});

ipcMain.handle('delete-session', async (event, sessionId) => {
  try {
    return await sessionManager.deleteSession(sessionId);
  } catch (error) {
    console.error('Error deleting session:', error);
    throw error;
  }
});

// Playback handler
ipcMain.handle('get-audio-url', async (event, audioPath) => {
  try {
    // Check if file exists
    if (!fs.existsSync(audioPath)) {
      throw new Error('Audio file not found: ' + audioPath);
    }

    // Check file size
    const stats = fs.statSync(audioPath);
    console.log('Audio file size:', stats.size, 'bytes');

    if (stats.size === 0) {
      throw new Error('Audio file is empty (0 bytes)');
    }

    // Convert absolute path to file:// URL
    // Use forward slashes for file URLs
    const normalizedPath = audioPath.replace(/\\/g, '/');
    const fileUrl = `file:///${normalizedPath}`;

    console.log('Returning audio URL:', fileUrl);
    return fileUrl;
  } catch (error) {
    console.error('Error loading audio file:', error);
    throw error;
  }
});

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});

console.log('VaultScribe Desktop started');
