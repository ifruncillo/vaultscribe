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

    // Start recording
    const result = await window.electronAPI.startRecording({
      sessionId: currentSession.sessionId,
      sourceId: audioSourceId,
      includeMicrophone
    });

    console.log('Recording started:', result);

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

async function togglePause() {
  const btn = document.getElementById('pause-btn');

  try {
    const status = await window.electronAPI.getRecordingStatus();

    if (status.state === 'recording') {
      await window.electronAPI.pauseRecording();
      btn.textContent = '▶️ Resume';
      btn.classList.remove('btn-secondary');
      btn.classList.add('btn-success');
    } else if (status.state === 'paused') {
      await window.electronAPI.resumeRecording();
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
    // Stop recording
    const result = await window.electronAPI.stopRecording();

    console.log('Recording stopped:', result);

    // Update session
    await window.electronAPI.updateSession(currentSession.sessionId, {
      audioPath: result.audioPath,
      duration: result.duration,
      fileSize: result.fileSize,
      encrypted: result.encrypted || false,
      status: 'recorded'
    });

    // Stop updates
    stopRecordingUpdates();

    // Reset UI
    document.getElementById('record-setup').classList.remove('hidden');
    document.getElementById('record-active').classList.add('hidden');

    // Clear form
    document.getElementById('matter-code').value = '';
    document.getElementById('client-code').value = '';
    document.getElementById('description').value = '';

    // Show success message
    showSuccess(`Recording saved successfully!\n\nDuration: ${formatDuration(result.duration)}\nFile size: ${formatFileSize(result.fileSize)}\nEncrypted: ${result.encrypted ? 'Yes' : 'No'}`);

    // Refresh dashboard
    loadDashboardData();

    currentSession = null;

  } catch (error) {
    console.error('Error stopping recording:', error);
    showError('Failed to stop recording: ' + error.message);
  }
}

function startRecordingUpdates() {
  recordingInterval = setInterval(async () => {
    try {
      const status = await window.electronAPI.getRecordingStatus();

      // Update duration
      document.getElementById('recording-duration').textContent = formatDuration(status.duration);

      // Update file size
      document.getElementById('recording-filesize').textContent = formatFileSize(status.fileSize);

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

async function viewSession(sessionId) {
  try {
    const session = await window.electronAPI.getSession(sessionId);
    alert(`Session: ${session.matterCode}\n\nStatus: ${session.status}\nDuration: ${formatDuration(session.duration)}\nFile size: ${formatFileSize(session.fileSize)}\nEncrypted: ${session.encrypted ? 'Yes' : 'No'}\n\n(Full viewer coming in Phase 2)`);
  } catch (error) {
    console.error('Error viewing session:', error);
  }
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

console.log('VaultScribe app.js loaded');
