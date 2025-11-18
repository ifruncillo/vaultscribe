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
  stopRecording: (recordingData) => ipcRenderer.invoke('stop-recording', recordingData),
  pauseRecording: () => ipcRenderer.invoke('pause-recording'),
  resumeRecording: () => ipcRenderer.invoke('resume-recording'),
  getRecordingStatus: () => ipcRenderer.invoke('get-recording-status'),

  // File system operations
  saveRecording: (audioBlob, sessionId) => ipcRenderer.invoke('save-recording', audioBlob, sessionId),

  // Encryption
  setEncryptionPassphrase: (passphrase) => ipcRenderer.invoke('set-encryption-passphrase', passphrase),
  encryptFile: (filePath) => ipcRenderer.invoke('encrypt-file', filePath),
  decryptFile: (encryptedPath) => ipcRenderer.invoke('decrypt-file', encryptedPath),

  // Transcription
  transcribeAudio: (audioPath, sessionId) => ipcRenderer.invoke('transcribe-audio', audioPath, sessionId),
  getTranscript: (sessionId) => ipcRenderer.invoke('get-transcript', sessionId),

  // Event listeners
  onRecordingUpdate: (callback) => {
    ipcRenderer.on('recording-update', (event, data) => callback(data));
  },

  removeRecordingUpdateListener: () => {
    ipcRenderer.removeAllListeners('recording-update');
  },

  onTranscriptionProgress: (callback) => {
    ipcRenderer.on('transcription-progress', (event, data) => callback(data));
  },

  removeTranscriptionProgressListener: () => {
    ipcRenderer.removeAllListeners('transcription-progress');
  }
});

console.log('Preload script loaded');
