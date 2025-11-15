// VaultScribe - Recording and Transcription Application

const API_BASE = 'http://localhost:8000';

// State management
let currentSession = null;
let mediaRecorder = null;
let audioChunks = [];
let recordingStartTime = null;
let durationInterval = null;
let audioContext = null;
let analyser = null;
let visualizerAnimationId = null;

// DOM elements
const sessionSetup = document.getElementById('session-setup');
const recordingControls = document.getElementById('recording-controls');
const sessionInfo = document.getElementById('session-info');
const recordingInfo = document.getElementById('recording-info');
const transcribeSection = document.getElementById('transcribe-section');

const matterCodeInput = document.getElementById('matter-code');
const clientCodeInput = document.getElementById('client-code');
const descriptionInput = document.getElementById('description');

const startSessionBtn = document.getElementById('start-session-btn');
const startRecordingBtn = document.getElementById('start-recording-btn');
const stopRecordingBtn = document.getElementById('stop-recording-btn');
const transcribeBtn = document.getElementById('transcribe-btn');

const durationDisplay = document.getElementById('duration');
const fileSizeDisplay = document.getElementById('file-size');
const transcribeStatus = document.getElementById('transcribe-status');

// Event Listeners
startSessionBtn.addEventListener('click', createSession);
startRecordingBtn.addEventListener('click', startRecording);
stopRecordingBtn.addEventListener('click', stopRecording);
transcribeBtn.addEventListener('click', transcribeRecording);

// Create recording session
async function createSession() {
  const matterCode = matterCodeInput.value.trim();

  if (!matterCode) {
    alert('Matter code is required');
    return;
  }

  const sessionData = {
    matter_code: matterCode,
    client_code: clientCodeInput.value.trim() || null,
    description: descriptionInput.value.trim() || null
  };

  try {
    startSessionBtn.disabled = true;
    startSessionBtn.textContent = 'Creating session...';

    const response = await fetch(`${API_BASE}/api/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sessionData)
    });

    if (!response.ok) {
      throw new Error('Failed to create session');
    }

    currentSession = await response.json();

    // Show session info
    sessionInfo.innerHTML = `
      <p><strong>Session ID:</strong> ${currentSession.session_id}</p>
      <p><strong>Matter Code:</strong> ${currentSession.matter_code}</p>
      <p><strong>Created:</strong> ${new Date(currentSession.created_at).toLocaleString()}</p>
    `;

    // Switch to recording view
    sessionSetup.classList.add('hidden');
    recordingControls.classList.remove('hidden');

  } catch (error) {
    console.error('Error creating session:', error);
    alert('Failed to create session. Please try again.');
    startSessionBtn.disabled = false;
    startSessionBtn.textContent = 'Start Recording Session';
  }
}

// Start audio recording
async function startRecording() {
  try {
    // Request microphone access
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true
      }
    });

    // Set up MediaRecorder
    const options = { mimeType: 'audio/webm;codecs=opus' };
    mediaRecorder = new MediaRecorder(stream, options);
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
        updateFileSize();
      }
    };

    mediaRecorder.onstop = handleRecordingStop;

    // Set up audio visualization
    setupVisualizer(stream);

    // Start recording
    mediaRecorder.start(1000); // Collect data every second
    recordingStartTime = Date.now();

    // Update UI
    startRecordingBtn.classList.add('hidden');
    stopRecordingBtn.classList.remove('hidden');
    recordingInfo.classList.remove('hidden');

    // Start duration counter
    updateDuration();
    durationInterval = setInterval(updateDuration, 1000);

  } catch (error) {
    console.error('Error starting recording:', error);
    alert('Failed to access microphone. Please check permissions.');
  }
}

// Stop recording
function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();

    // Stop all tracks
    mediaRecorder.stream.getTracks().forEach(track => track.stop());

    // Clear duration interval
    if (durationInterval) {
      clearInterval(durationInterval);
      durationInterval = null;
    }

    // Stop visualizer
    if (visualizerAnimationId) {
      cancelAnimationFrame(visualizerAnimationId);
    }
    if (audioContext) {
      audioContext.close();
    }

    // Update UI
    stopRecordingBtn.classList.add('hidden');
    recordingInfo.querySelector('.recording-indicator').textContent = '✅ Recording completed';
  }
}

// Handle recording stop
function handleRecordingStop() {
  const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
  currentSession.audioBlob = audioBlob;
  currentSession.audioFile = new File([audioBlob], `recording-${currentSession.session_id}.webm`, {
    type: 'audio/webm'
  });

  // Show transcribe button
  transcribeSection.classList.remove('hidden');
}

// Update duration display
function updateDuration() {
  if (!recordingStartTime) return;

  const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  durationDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Update file size display
function updateFileSize() {
  const totalSize = audioChunks.reduce((acc, chunk) => acc + chunk.size, 0);
  const sizeInKB = (totalSize / 1024).toFixed(2);
  const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);

  fileSizeDisplay.textContent = totalSize > 1024 * 1024
    ? `${sizeInMB} MB`
    : `${sizeInKB} KB`;
}

// Set up audio visualizer
function setupVisualizer(stream) {
  const canvas = document.getElementById('visualizer');
  const canvasCtx = canvas.getContext('2d');

  // Set canvas size
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  // Create audio context
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  const source = audioContext.createMediaStreamSource(stream);
  source.connect(analyser);

  analyser.fftSize = 256;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  // Animation loop
  function draw() {
    visualizerAnimationId = requestAnimationFrame(draw);

    analyser.getByteFrequencyData(dataArray);

    canvasCtx.fillStyle = '#1f2937';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      barHeight = (dataArray[i] / 255) * canvas.height;

      const gradient = canvasCtx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
      gradient.addColorStop(0, '#3b82f6');
      gradient.addColorStop(1, '#1e40af');

      canvasCtx.fillStyle = gradient;
      canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

      x += barWidth + 1;
    }
  }

  draw();
}

// Transcribe recording
async function transcribeRecording() {
  if (!currentSession || !currentSession.audioFile) {
    alert('No recording available');
    return;
  }

  try {
    transcribeBtn.disabled = true;
    transcribeBtn.textContent = 'Uploading and transcribing...';

    showStatus('Uploading audio file...', 'info');

    // Upload audio file
    const formData = new FormData();
    formData.append('audio', currentSession.audioFile);
    formData.append('session_id', currentSession.session_id);

    const uploadResponse = await fetch(`${API_BASE}/api/upload`, {
      method: 'POST',
      body: formData
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload audio');
    }

    showStatus('Audio uploaded. Starting transcription...', 'info');

    // Start transcription
    const transcribeResponse = await fetch(`${API_BASE}/api/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        session_id: currentSession.session_id
      })
    });

    if (!transcribeResponse.ok) {
      throw new Error('Failed to start transcription');
    }

    const result = await transcribeResponse.json();

    showStatus('Transcription completed! Redirecting to transcript...', 'success');

    // Redirect to transcript viewer
    setTimeout(() => {
      window.location.href = `transcript.html?session=${currentSession.session_id}`;
    }, 2000);

  } catch (error) {
    console.error('Error transcribing:', error);
    showStatus('Failed to transcribe recording. Please try again.', 'error');
    transcribeBtn.disabled = false;
    transcribeBtn.textContent = '📝 Transcribe Recording';
  }
}

// Show status message
function showStatus(message, type = 'info') {
  transcribeStatus.innerHTML = `
    <div class="status-message status-${type}">
      ${message}
    </div>
  `;
}

// Format bytes to human readable
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
