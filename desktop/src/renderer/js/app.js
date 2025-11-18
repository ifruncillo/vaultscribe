/**
 * VaultScribe Desktop - Main Application
 *
 * Handles UI interactions and communication with Electron main process
 */

// State
let currentScreen = 'dashboard';
let currentSession = null;
let recordingInterval = null;
let waveformAnimationId = null;

// Audio recording state
let mediaRecorder = null;
let audioChunks = [];
let recordingState = 'idle'; // idle, recording, paused
let startTime = null;
let pausedDuration = 0;
let lastPauseTime = null;

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('VaultScribe app initialized');

  initializeNavigation();
  initializeDashboard();
  initializeRecording();
  initializeLibrary();
  initializeSettings();

  // Load initial data
  loadDashboardData();
  loadAudioSources();
  loadRecentCodes();
});

/**
 * Navigation
 */
function initializeNavigation() {
  const navItems = document.querySelectorAll('.nav-item');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const screen = item.dataset.screen;
      switchScreen(screen);

      // Update active nav item
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
    });
  });
}

function switchScreen(screenName) {
  // Hide all screens
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });

  // Show selected screen
  const screen = document.getElementById(`${screenName}-screen`);
  if (screen) {
    screen.classList.add('active');
    currentScreen = screenName;

    // Reload data when switching screens
    if (screenName === 'dashboard') {
      loadDashboardData();
    } else if (screenName === 'library') {
      loadLibrarySessions();
    }
  }
}

/**
 * Dashboard
 */
function initializeDashboard() {
  // Quick record button
  document.getElementById('quick-record-btn').addEventListener('click', () => {
    switchScreen('record');
    document.querySelector('[data-screen="record"]').click();
  });

  // View all sessions
  document.getElementById('view-all-sessions').addEventListener('click', () => {
    switchScreen('library');
    document.querySelector('[data-screen="library"]').click();
  });
}

async function loadDashboardData() {
  try {
    // Get all sessions
    const sessions = await window.electronAPI.getSessions();

    // Update stats
    updateDashboardStats(sessions);

    // Show recent sessions
    displayRecentSessions(sessions.slice(0, 5));

  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

function updateDashboardStats(sessions) {
  const totalSessions = sessions.length;
  const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  const totalStorage = sessions.reduce((sum, s) => sum + (s.fileSize || 0), 0);

  document.getElementById('total-sessions').textContent = totalSessions;
  document.getElementById('total-duration').textContent = formatDuration(totalDuration);
  document.getElementById('total-storage').textContent = formatFileSize(totalStorage);
}

function displayRecentSessions(sessions) {
  const container = document.getElementById('recent-sessions-list');

  if (sessions.length === 0) {
    container.innerHTML = '<p class="empty-state">No sessions yet. Start your first recording!</p>';
    return;
  }

  container.innerHTML = sessions.map(session => `
    <div class="session-item" onclick="viewSession('${session.sessionId}')">
      <div class="session-header">
        <span class="session-matter">${escapeHtml(session.matterCode || 'Untitled')}</span>
        <span class="session-date">${formatDate(session.createdAt)}</span>
      </div>
      <div class="session-meta">
        ${session.duration ? formatDuration(session.duration) : '0:00'} •
        ${session.status} •
        ${session.encrypted ? '🔒 Encrypted' : '🔓 Unencrypted'}
      </div>
    </div>
  `).join('');
}

/**
 * Recording
 */
function initializeRecording() {
  // Start recording button
  document.getElementById('start-recording-btn').addEventListener('click', startRecording);

  // Pause/resume button
  document.getElementById('pause-btn').addEventListener('click', togglePause);

  // Stop button
  document.getElementById('stop-btn').addEventListener('click', stopRecording);

  // System audio checkbox
  document.getElementById('include-system-audio').addEventListener('change', (e) => {
    document.getElementById('audio-source-group').style.display =
      e.target.checked ? 'block' : 'none';
  });
}

async function loadAudioSources() {
  try {
    const sources = await window.electronAPI.getAudioSources();
    const select = document.getElementById('audio-source');

    select.innerHTML = sources.map(source => `
      <option value="${source.id}">${escapeHtml(source.name)}</option>
    `).join('');

    // Select first option by default
    if (sources.length > 0) {
      select.selectedIndex = 0;
    }

  } catch (error) {
    console.error('Error loading audio sources:', error);
    showError('Failed to load audio sources. Make sure screen recording permission is granted.');
  }
}

async function loadRecentCodes() {
  try {
    const sessions = await window.electronAPI.getSessions();

    // Extract unique matter codes and client codes
    const matterCodes = [...new Set(sessions.map(s => s.matterCode).filter(Boolean))];
    const clientCodes = [...new Set(sessions.map(s => s.clientCode).filter(Boolean))];

    // Populate matter code datalist
    const matterDatalist = document.getElementById('matter-code-list');
    matterDatalist.innerHTML = matterCodes.map(code => `
      <option value="${escapeHtml(code)}">
    `).join('');

    // Populate client code datalist
    const clientDatalist = document.getElementById('client-code-list');
    clientDatalist.innerHTML = clientCodes.map(code => `
      <option value="${escapeHtml(code)}">
    `).join('');

  } catch (error) {
    console.error('Error loading recent codes:', error);
  }
}

async function startRecording() {
  const matterCode = document.getElementById('matter-code').value.trim();
  const clientCode = document.getElementById('client-code').value.trim();
  const description = document.getElementById('description').value.trim();
  const includeSystemAudio = document.getElementById('include-system-audio').checked;
  const includeMicrophone = document.getElementById('include-microphone').checked;
  const audioSourceId = includeSystemAudio ? document.getElementById('audio-source').value : null;

  // Validation
  if (!matterCode) {
    showError('Matter code is required');
    return;
  }

  if (!includeSystemAudio && !includeMicrophone) {
    showError('Please select at least one audio source');
    return;
  }

  try {
    // Create session
    currentSession = await window.electronAPI.createSession({
      matterCode,
      clientCode,
      description
    });

    console.log('Session created:', currentSession);

    // Get audio stream
    const stream = await getAudioStream(audioSourceId, includeMicrophone);

    // Set up MediaRecorder
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: 128000
    });

    audioChunks = [];
    recordingState = 'recording';
    startTime = Date.now();
    pausedDuration = 0;

    // Handle data availability
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    // Handle errors
    mediaRecorder.onerror = (error) => {
      console.error('MediaRecorder error:', error);
      showError('Recording error: ' + error.message);
    };

    // Start recording
    mediaRecorder.start(1000); // Collect data every second

    console.log('Recording started');

    // Update UI
    document.getElementById('record-setup').classList.add('hidden');
    document.getElementById('record-active').classList.remove('hidden');
    document.getElementById('session-matter-code').textContent = matterCode;

    // Start status updates
    startRecordingUpdates();

    // Start waveform visualization
    startWaveformVisualization();

  } catch (error) {
    console.error('Error starting recording:', error);
    showError('Failed to start recording: ' + error.message);
  }
}

async function getAudioStream(sourceId, includeMicrophone) {
  let audioTracks = [];

  // Get system audio if source ID provided
  if (sourceId) {
    try {
      const systemStream = await navigator.mediaDevices.getUserMedia({
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

      // Extract only audio track
      const systemAudioTrack = systemStream.getAudioTracks()[0];
      if (systemAudioTrack) {
        audioTracks.push(systemAudioTrack);
      }

      // Stop video track (we don't need it)
      systemStream.getVideoTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Error getting system audio:', error);
      throw new Error('Failed to capture system audio. Make sure screen recording permission is granted.');
    }
  }

  // Get microphone if requested
  if (includeMicrophone) {
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      });

      const micAudioTrack = micStream.getAudioTracks()[0];
      if (micAudioTrack) {
        audioTracks.push(micAudioTrack);
      }
    } catch (error) {
      console.error('Error getting microphone:', error);
      console.warn('Continuing without microphone');
    }
  }

  if (audioTracks.length === 0) {
    throw new Error('No audio sources available');
  }

  // Create combined stream
  return new MediaStream(audioTracks);
}

async function togglePause() {
  const btn = document.getElementById('pause-btn');

  try {
    if (recordingState === 'recording') {
      mediaRecorder.pause();
      recordingState = 'paused';
      lastPauseTime = Date.now();
      btn.textContent = '▶️ Resume';
      btn.classList.remove('btn-secondary');
      btn.classList.add('btn-success');
    } else if (recordingState === 'paused') {
      mediaRecorder.resume();
      recordingState = 'recording';
      if (lastPauseTime) {
        pausedDuration += Date.now() - lastPauseTime;
        lastPauseTime = null;
      }
      btn.textContent = '⏸️ Pause';
      btn.classList.remove('btn-success');
      btn.classList.add('btn-secondary');
    }
  } catch (error) {
    console.error('Error toggling pause:', error);
    showError('Failed to pause/resume recording');
  }
}

async function stopRecording() {
  if (!confirm('Stop recording? The audio will be saved and encrypted.')) {
    return;
  }

  try {
    // Stop the MediaRecorder
    mediaRecorder.stop();

    // Wait for the recording to finish processing
    await new Promise((resolve) => {
      mediaRecorder.onstop = resolve;
    });

    // Calculate duration
    const endTime = Date.now();
    const duration = endTime - startTime - pausedDuration;

    // Create blob from chunks
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

    // Convert blob to array buffer
    const arrayBuffer = await audioBlob.arrayBuffer();

    // Save recording to file system via IPC
    const saveResult = await window.electronAPI.saveRecording(arrayBuffer, currentSession.sessionId);

    // Send to main process for encryption
    const result = await window.electronAPI.stopRecording({
      audioPath: saveResult.audioPath,
      duration: duration,
      fileSize: saveResult.fileSize
    });

    console.log('Recording stopped:', result);

    // Update session
    await window.electronAPI.updateSession(currentSession.sessionId, {
      audioPath: result.audioPath,
      duration: duration,
      fileSize: result.fileSize,
      encrypted: result.encrypted || false,
      status: 'recorded'
    });

    // Stop media tracks
    if (mediaRecorder && mediaRecorder.stream) {
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }

    // Reset state
    mediaRecorder = null;
    audioChunks = [];
    recordingState = 'idle';
    startTime = null;
    pausedDuration = 0;
    lastPauseTime = null;

    // Stop updates
    stopRecordingUpdates();

    // Reset UI
    document.getElementById('record-setup').classList.remove('hidden');
    document.getElementById('record-active').classList.add('hidden');

    // Clear form
    document.getElementById('matter-code').value = '';
    document.getElementById('client-code').value = '';
    document.getElementById('description').value = '';

    // Show success message with transcription option
    const shouldTranscribe = confirm(`Recording saved successfully!\n\nDuration: ${formatDuration(duration)}\nFile size: ${formatFileSize(result.fileSize)}\nEncrypted: ${result.encrypted ? 'Yes' : 'No'}\n\nWould you like to transcribe this recording now?\n(This uses local AI - no data leaves your computer)`);

    if (shouldTranscribe) {
      // Start transcription
      startTranscription(currentSession.sessionId, result.audioPath);
    }

    // Refresh dashboard
    loadDashboardData();

    currentSession = null;

  } catch (error) {
    console.error('Error stopping recording:', error);
    showError('Failed to stop recording: ' + error.message);
  }
}

function startRecordingUpdates() {
  recordingInterval = setInterval(() => {
    try {
      if (recordingState !== 'idle' && startTime) {
        const currentPausedDuration = recordingState === 'paused' && lastPauseTime
          ? pausedDuration + (Date.now() - lastPauseTime)
          : pausedDuration;

        const duration = Date.now() - startTime - currentPausedDuration;

        // Update duration
        document.getElementById('recording-duration').textContent = formatDuration(duration);

        // Estimate file size (rough estimate: 16KB per second for webm)
        const fileSize = Math.floor((duration / 1000) * 16 * 1024);
        document.getElementById('recording-filesize').textContent = formatFileSize(fileSize);
      }
    } catch (error) {
      console.error('Error updating recording status:', error);
    }
  }, 1000);
}

function stopRecordingUpdates() {
  if (recordingInterval) {
    clearInterval(recordingInterval);
    recordingInterval = null;
  }

  if (waveformAnimationId) {
    cancelAnimationFrame(waveformAnimationId);
    waveformAnimationId = null;
  }
}

function startWaveformVisualization() {
  const canvas = document.getElementById('waveform-canvas');
  const ctx = canvas.getContext('2d');

  // Set canvas size
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  function draw() {
    // Clear canvas
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw simple animated waveform (placeholder)
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const time = Date.now() / 1000;
    const amplitude = 30;
    const frequency = 2;

    for (let x = 0; x < canvas.width; x++) {
      const y = canvas.height / 2 +
        Math.sin(x / 50 + time * frequency) * amplitude +
        Math.sin(x / 30 + time * frequency * 1.5) * (amplitude / 2);

      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();

    waveformAnimationId = requestAnimationFrame(draw);
  }

  draw();
}

/**
 * Library
 */
function initializeLibrary() {
  // Search
  document.getElementById('library-search').addEventListener('input', (e) => {
    searchSessions(e.target.value);
  });

  // Status filter
  document.getElementById('status-filter').addEventListener('change', () => {
    loadLibrarySessions();
  });
}

async function loadLibrarySessions() {
  try {
    const sessions = await window.electronAPI.getSessions();
    const statusFilter = document.getElementById('status-filter').value;

    let filtered = sessions;

    // Apply status filter
    if (statusFilter) {
      filtered = sessions.filter(s => s.status === statusFilter);
    }

    displaySessions(filtered);

  } catch (error) {
    console.error('Error loading sessions:', error);
  }
}

async function searchSessions(query) {
  try {
    const sessions = await window.electronAPI.getSessions();

    if (!query) {
      displaySessions(sessions);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const filtered = sessions.filter(s =>
      s.matterCode.toLowerCase().includes(lowerQuery) ||
      s.clientCode.toLowerCase().includes(lowerQuery) ||
      s.description.toLowerCase().includes(lowerQuery)
    );

    displaySessions(filtered);

  } catch (error) {
    console.error('Error searching sessions:', error);
  }
}

function displaySessions(sessions) {
  const container = document.getElementById('sessions-list');

  if (sessions.length === 0) {
    container.innerHTML = '<p class="empty-state">No sessions found</p>';
    return;
  }

  container.innerHTML = sessions.map(session => `
    <div class="session-item" onclick="viewSession('${session.sessionId}')">
      <div class="session-header">
        <span class="session-matter">${escapeHtml(session.matterCode || 'Untitled')}</span>
        <span class="session-date">${formatDate(session.createdAt)}</span>
      </div>
      <div class="session-meta">
        ${session.clientCode ? `Client: ${escapeHtml(session.clientCode)} • ` : ''}
        ${session.duration ? formatDuration(session.duration) : '0:00'} •
        ${session.status} •
        ${session.encrypted ? '🔒 Encrypted' : '🔓 Unencrypted'}
      </div>
      ${session.description ? `<p class="hint">${escapeHtml(session.description)}</p>` : ''}
    </div>
  `).join('');
}

/**
 * Settings
 */
function initializeSettings() {
  // Set passphrase button
  document.getElementById('set-passphrase-btn').addEventListener('click', setEncryptionPassphrase);
}

async function setEncryptionPassphrase() {
  const passphrase = document.getElementById('encryption-passphrase').value;
  const statusDiv = document.getElementById('passphrase-status');

  if (!passphrase) {
    statusDiv.textContent = 'Please enter a passphrase';
    statusDiv.className = 'passphrase-status error';
    return;
  }

  if (passphrase.length < 8) {
    statusDiv.textContent = 'Passphrase must be at least 8 characters';
    statusDiv.className = 'passphrase-status error';
    return;
  }

  try {
    await window.electronAPI.setEncryptionPassphrase(passphrase);

    statusDiv.textContent = '✅ Encryption passphrase set successfully! All recordings will now be encrypted.';
    statusDiv.className = 'passphrase-status success';

    // Update status in sidebar
    document.getElementById('encryption-status').textContent = '🔒 Enabled';

    // Clear password field
    document.getElementById('encryption-passphrase').value = '';

  } catch (error) {
    console.error('Error setting passphrase:', error);
    statusDiv.textContent = 'Failed to set passphrase: ' + error.message;
    statusDiv.className = 'passphrase-status error';
  }
}

/**
 * Utility Functions
 */
function formatDuration(ms) {
  if (!ms) return '0:00';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }

  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function formatFileSize(bytes) {
  if (!bytes) return '0 KB';

  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  const mb = kb / 1024;
  if (mb < 1024) {
    return `${mb.toFixed(1)} MB`;
  }

  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showError(message) {
  alert('Error: ' + message);
}

function showSuccess(message) {
  alert(message);
}

/**
 * Transcription
 */
async function startTranscription(sessionId, audioPath) {
  try {
    console.log('Starting transcription for session:', sessionId);

    // Show loading message
    showSuccess('Transcription started!\n\nThis will take a few minutes. The first time you transcribe, the AI model will be downloaded (~140MB).\n\nYou can continue using the app while transcription runs in the background.');

    // Listen for progress updates
    window.electronAPI.onTranscriptionProgress((progress) => {
      console.log('Transcription progress:', progress);

      if (progress.sessionId === sessionId) {
        if (progress.status === 'completed') {
          showSuccess('Transcription complete! View it in the session details.');
          loadDashboardData();
        } else if (progress.status === 'failed') {
          showError('Transcription failed: ' + progress.error);
        }
      }
    });

    // Start transcription
    await window.electronAPI.transcribeAudio(audioPath, sessionId);

  } catch (error) {
    console.error('Error starting transcription:', error);
    showError('Failed to start transcription: ' + error.message);
  }
}

async function viewSession(sessionId) {
  try {
    const session = await window.electronAPI.getSession(sessionId);

    // Get transcript if available
    let transcriptText = 'No transcript available';
    if (session.transcriptionStatus === 'completed') {
      const transcript = await window.electronAPI.getTranscript(sessionId);
      if (transcript) {
        transcriptText = transcript.text;
      }
    } else if (session.transcriptionStatus === 'processing') {
      transcriptText = 'Transcription in progress...';
    } else if (session.transcriptionStatus === 'failed') {
      transcriptText = 'Transcription failed: ' + (session.transcriptionError || 'Unknown error');
    }

    // Show session details (will improve this UI later)
    alert(`Session: ${session.matterCode}\n\nStatus: ${session.status}\nDuration: ${formatDuration(session.duration)}\nFile size: ${formatFileSize(session.fileSize)}\nEncrypted: ${session.encrypted ? 'Yes' : 'No'}\n\n--- TRANSCRIPT ---\n${transcriptText.substring(0, 500)}${transcriptText.length > 500 ? '...' : ''}`);

    // Option to transcribe if not already done
    if (!session.transcriptionStatus || session.transcriptionStatus === 'pending') {
      const shouldTranscribe = confirm('Would you like to transcribe this recording now?');
      if (shouldTranscribe && session.audioPath) {
        startTranscription(sessionId, session.audioPath);
      }
    }

  } catch (error) {
    console.error('Error viewing session:', error);
    showError('Failed to load session: ' + error.message);
  }
}

console.log('VaultScribe app.js loaded');
