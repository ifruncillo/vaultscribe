const { app, BrowserWindow, ipcMain, desktopCapturer } = require('electron');
const path = require('path');
const fs = require('fs');

// Services
const AudioCapture = require('./src/main/services/audio-capture');
const EncryptionService = require('./src/main/services/encryption');
const SessionManager = require('./src/main/services/session-manager');

let mainWindow;
let audioCapture;
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
      sandbox: true
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

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialize services
function initializeServices() {
  audioCapture = new AudioCapture();
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

    return sources.map(source => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL()
    }));
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

// Start recording
ipcMain.handle('start-recording', async (event, options) => {
  try {
    const result = await audioCapture.startRecording(options);
    return result;
  } catch (error) {
    console.error('Error starting recording:', error);
    throw error;
  }
});

// Stop recording
ipcMain.handle('stop-recording', async () => {
  try {
    const result = await audioCapture.stopRecording();

    // Encrypt the recorded file
    if (result.audioPath && encryptionService.isEnabled()) {
      const encryptedPath = await encryptionService.encryptFile(result.audioPath);

      // Delete original unencrypted file
      fs.unlinkSync(result.audioPath);

      result.audioPath = encryptedPath;
      result.encrypted = true;
    }

    return result;
  } catch (error) {
    console.error('Error stopping recording:', error);
    throw error;
  }
});

// Pause recording
ipcMain.handle('pause-recording', async () => {
  try {
    return await audioCapture.pauseRecording();
  } catch (error) {
    console.error('Error pausing recording:', error);
    throw error;
  }
});

// Resume recording
ipcMain.handle('resume-recording', async () => {
  try {
    return await audioCapture.resumeRecording();
  } catch (error) {
    console.error('Error resuming recording:', error);
    throw error;
  }
});

// Get recording status
ipcMain.handle('get-recording-status', () => {
  return audioCapture.getStatus();
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

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});

console.log('VaultScribe Desktop started');
