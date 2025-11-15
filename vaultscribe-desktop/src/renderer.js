const { ipcRenderer } = require('electron');

let currentSession = null;
let recordingInterval = null;
let recordingStartTime = null;

// DOM elements
const setupCard = document.getElementById('setup-card');
const recordingCard = document.getElementById('recording-card');
const sessionForm = document.getElementById('session-form');
const startRecordingBtn = document.getElementById('start-recording-btn');
const stopRecordingBtn = document.getElementById('stop-recording-btn');
const newSessionBtn = document.getElementById('new-session-btn');
const statusMessage = document.getElementById('status-message');

// Form elements
const matterCodeInput = document.getElementById('matter-code');
const clientCodeInput = document.getElementById('client-code');
const descriptionInput = document.getElementById('description');

// Display elements
const sessionIdDisplay = document.getElementById('session-id');
const displayMatterCodeEl = document.getElementById('display-matter-code');
const statusEl = document.getElementById('status');
const durationEl = document.getElementById('duration');
const recordingInfo = document.getElementById('recording-info');

// Show status message
function showStatus(message, type = 'success') {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.style.display = 'block';

  setTimeout(() => {
    statusMessage.style.display = 'none';
  }, 5000);
}

// Format time in MM:SS
function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Update recording duration
function updateDuration() {
  if (recordingStartTime) {
    const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
    durationEl.textContent = formatDuration(elapsed);
  }
}

// Create new session
sessionForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const sessionData = {
    matter_code: matterCodeInput.value,
    client_code: clientCodeInput.value || null,
    description: descriptionInput.value || null
  };

  try {
    const result = await ipcRenderer.invoke('create-session', sessionData);

    if (result.success) {
      currentSession = result.data;
      sessionIdDisplay.textContent = currentSession.session_id;
      displayMatterCodeEl.textContent = currentSession.matter_code || 'N/A';

      // Switch to recording view
      setupCard.style.display = 'none';
      recordingCard.style.display = 'block';

      showStatus('Session created successfully!', 'success');
    } else {
      showStatus(`Error: ${result.error}`, 'error');
    }
  } catch (error) {
    showStatus(`Error: ${error.message}`, 'error');
  }
});

// Start recording
startRecordingBtn.addEventListener('click', async () => {
  try {
    const result = await ipcRenderer.invoke('start-recording');

    if (result.success) {
      recordingStartTime = Date.now();
      recordingInterval = setInterval(updateDuration, 1000);

      startRecordingBtn.style.display = 'none';
      stopRecordingBtn.style.display = 'block';
      recordingInfo.style.display = 'block';
      statusEl.textContent = 'Recording';
      statusEl.style.background = '#ef4444';

      showStatus('Recording started!', 'success');
    } else {
      showStatus(`Cannot start recording: ${result.error}`, 'error');
    }
  } catch (error) {
    showStatus(`Error: ${error.message}`, 'error');
  }
});

// Stop recording
stopRecordingBtn.addEventListener('click', async () => {
  try {
    const result = await ipcRenderer.invoke('stop-recording');

    if (recordingInterval) {
      clearInterval(recordingInterval);
      recordingInterval = null;
    }

    recordingStartTime = null;
    startRecordingBtn.style.display = 'block';
    stopRecordingBtn.style.display = 'none';
    recordingInfo.style.display = 'none';
    statusEl.textContent = 'Completed';
    statusEl.style.background = '#10b981';
    durationEl.textContent = '00:00';

    if (result.success) {
      showStatus('Recording stopped and saved!', 'success');
    } else {
      showStatus(`Recording stopped (save failed: ${result.error})`, 'error');
    }
  } catch (error) {
    showStatus(`Error: ${error.message}`, 'error');
  }
});

// New session
newSessionBtn.addEventListener('click', () => {
  currentSession = null;
  setupCard.style.display = 'block';
  recordingCard.style.display = 'none';

  // Reset form
  sessionForm.reset();

  // Clear recording state
  if (recordingInterval) {
    clearInterval(recordingInterval);
    recordingInterval = null;
  }
  recordingStartTime = null;
  durationEl.textContent = '00:00';
});
