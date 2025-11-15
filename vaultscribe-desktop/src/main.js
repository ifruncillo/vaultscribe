const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const axios = require('axios');

const API_URL = 'http://localhost:8000';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    title: 'VaultScribe - Zero-Knowledge Meeting Intelligence'
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open DevTools in development mode
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
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

// IPC handlers for API communication
ipcMain.handle('create-session', async (event, sessionData) => {
  try {
    const response = await axios.post(`${API_URL}/api/session`, sessionData);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-session', async (event, sessionId) => {
  try {
    const response = await axios.get(`${API_URL}/api/session/${sessionId}`);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Audio recording handler (to be implemented)
ipcMain.handle('start-recording', async (event) => {
  // TODO: Implement system audio capture
  return { success: false, error: 'Audio capture not yet implemented' };
});

ipcMain.handle('stop-recording', async (event) => {
  // TODO: Implement stop recording
  return { success: false, error: 'Audio capture not yet implemented' };
});
