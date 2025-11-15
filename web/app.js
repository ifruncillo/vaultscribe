const API_URL = 'http://localhost:8000';

// State
let currentSession = null;
let mediaRecorder = null;
let audioChunks = [];
let recordingStartTime = null;
let recordingInterval = null;
let audioStream = null;

// DOM elements
const setupCard = document.getElementById('setup-card');
const recordingCard = document.getElementById('recording-card');
const sessionForm = document.getElementById('session-form');
const startRecordingBtn = document.getElementById('start-recording-btn');
const stopRecordingBtn = document.getElementById('stop-recording-btn');
const newSessionBtn = document.getElementById('new-session-btn');
const alertContainer = document.getElementById('alert-container');

// Form inputs
const matterCodeInput = document.getElementById('matter-code');
const clientCodeInput = document.getElementById('client-code');
const descriptionInput = document.getElementById('description');

// Display elements
const sessionIdDisplay = document.getElementById('session-id');
const displayMatterCodeEl = document.getElementById('display-matter-code');
const statusEl = document.getElementById('status');
const durationEl = document.getElementById('duration');
const fileSizeEl = document.getElementById('file-size');
const recordingInfo = document.getElementById('recording-info');
const apiStatus = document.getElementById('api-status');
const visualizer = document.getElementById('visualizer');

// Utility functions
function showAlert(message, type = 'success') {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  alertContainer.appendChild(alert);

  setTimeout(() => {
    alert.remove();
  }, 5000);
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function updateDuration() {
  if (recordingStartTime) {
    const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
    durationEl.textContent = formatDuration(elapsed);
  }
}

// Check API status
async function checkAPIStatus() {
  try {
    const response = await fetch(`${API_URL}/health`);
    if (response.ok) {
      apiStatus.textContent = 'Connected ✓';
      apiStatus.style.color = '#10b981';
      return true;
    }
  } catch (error) {
    apiStatus.textContent = 'Disconnected ✗';
    apiStatus.style.color = '#ef4444';
    return false;
  }
}

// Audio visualization
function setupVisualizer() {
  if (!audioStream || !visualizer) return;

  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const analyser = audioContext.createAnalyser();
  const source = audioContext.createMediaStreamSource(audioStream);
  source.connect(analyser);

  analyser.fftSize = 256;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  const canvas = visualizer;
  const canvasCtx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  function draw() {
    if (!mediaRecorder || mediaRecorder.state !== 'recording') return;

    requestAnimationFrame(draw);

    analyser.getByteFrequencyData(dataArray);

    canvasCtx.fillStyle = '#1f2937';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      barHeight = (dataArray[i] / 255) * canvas.height;

      const gradient = canvasCtx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
      gradient.addColorStop(0, '#ef4444');
      gradient.addColorStop(1, '#dc2626');

      canvasCtx.fillStyle = gradient;
      canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

      x += barWidth + 1;
    }
  }

  draw();
}

// Create session
sessionForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const sessionData = {
    matter_code: matterCodeInput.value,
    client_code: clientCodeInput.value || null,
    description: descriptionInput.value || null
  };

  try {
    const response = await fetch(`${API_URL}/api/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sessionData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    currentSession = await response.json();
    sessionIdDisplay.textContent = currentSession.session_id;
    displayMatterCodeEl.textContent = currentSession.matter_code || 'N/A';

    // Switch to recording view
    setupCard.classList.add('hidden');
    recordingCard.classList.remove('hidden');

    showAlert('Session created successfully!', 'success');
  } catch (error) {
    showAlert(`Error creating session: ${error.message}`, 'error');
  }
});

// Start recording
startRecordingBtn.addEventListener('click', async () => {
  try {
    // Request microphone access
    audioStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    // Create MediaRecorder
    const options = { mimeType: 'audio/webm' };
    mediaRecorder = new MediaRecorder(audioStream, options);

    audioChunks = [];

    mediaRecorder.addEventListener('dataavailable', (event) => {
      audioChunks.push(event.data);
      const totalSize = audioChunks.reduce((acc, chunk) => acc + chunk.size, 0);
      fileSizeEl.textContent = formatFileSize(totalSize);
    });

    mediaRecorder.addEventListener('stop', () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

      // Create download link
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `vaultscribe-${currentSession.session_id}.webm`;
      document.body.appendChild(a);

      showAlert(`Recording saved! Click to download (${formatFileSize(audioBlob.size)})`, 'success');

      // Auto-download
      a.click();

      setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
      }, 100);

      // Stop all tracks
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        audioStream = null;
      }
    });

    // Start recording
    mediaRecorder.start(1000); // Collect data every second
    recordingStartTime = Date.now();
    recordingInterval = setInterval(updateDuration, 1000);

    // Update UI
    startRecordingBtn.classList.add('hidden');
    stopRecordingBtn.classList.remove('hidden');
    recordingInfo.classList.remove('hidden');
    statusEl.textContent = 'Recording';
    statusEl.style.background = '#ef4444';

    // Setup visualizer
    setupVisualizer();

    showAlert('Recording started!', 'success');
  } catch (error) {
    showAlert(`Error starting recording: ${error.message}`, 'error');
    console.error('Recording error:', error);
  }
});

// Stop recording
stopRecordingBtn.addEventListener('click', () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();

    if (recordingInterval) {
      clearInterval(recordingInterval);
      recordingInterval = null;
    }

    recordingStartTime = null;

    // Update UI
    startRecordingBtn.classList.remove('hidden');
    stopRecordingBtn.classList.add('hidden');
    recordingInfo.classList.add('hidden');
    statusEl.textContent = 'Completed';
    statusEl.style.background = '#10b981';
    durationEl.textContent = '00:00';
    fileSizeEl.textContent = '0 KB';
  }
});

// New session
newSessionBtn.addEventListener('click', () => {
  currentSession = null;
  setupCard.classList.remove('hidden');
  recordingCard.classList.add('hidden');

  // Reset form
  sessionForm.reset();

  // Clear recording state
  if (recordingInterval) {
    clearInterval(recordingInterval);
    recordingInterval = null;
  }
  recordingStartTime = null;
  durationEl.textContent = '00:00';
  fileSizeEl.textContent = '0 KB';
  audioChunks = [];
});

// Initialize
checkAPIStatus();
setInterval(checkAPIStatus, 10000); // Check every 10 seconds
