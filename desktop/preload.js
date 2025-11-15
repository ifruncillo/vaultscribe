const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Audio sources
  getAudioSources: () => ipcRenderer.invoke('get-audio-sources'),

  // Session management
  createSession: (sessionData) => ipcRenderer.invoke('create-session', sessionData),
  getSessions: () => ipcRenderer.invoke('get-sessions'),
  getSession: (sessionId) => ipcRenderer.invoke('get-session', sessionId),
  updateSession: (sessionId, updates) => ipcRenderer.invoke('update-session', sessionId, updates),
  deleteSession: (sessionId) => ipcRenderer.invoke('delete-session', sessionId),

  // Recording controls
  startRecording: (options) => ipcRenderer.invoke('start-recording', options),
  stopRecording: () => ipcRenderer.invoke('stop-recording'),
  pauseRecording: () => ipcRenderer.invoke('pause-recording'),
  resumeRecording: () => ipcRenderer.invoke('resume-recording'),
  getRecordingStatus: () => ipcRenderer.invoke('get-recording-status'),

  // Encryption
  setEncryptionPassphrase: (passphrase) => ipcRenderer.invoke('set-encryption-passphrase', passphrase),
  encryptFile: (filePath) => ipcRenderer.invoke('encrypt-file', filePath),
  decryptFile: (encryptedPath) => ipcRenderer.invoke('decrypt-file', encryptedPath),

  // Event listeners
  onRecordingUpdate: (callback) => {
    ipcRenderer.on('recording-update', (event, data) => callback(data));
  },

  removeRecordingUpdateListener: () => {
    ipcRenderer.removeAllListeners('recording-update');
  }
});

console.log('Preload script loaded');
