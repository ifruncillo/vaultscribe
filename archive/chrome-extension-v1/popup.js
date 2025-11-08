let isRecording = false;

document.getElementById('recordBtn').addEventListener('click', async () => {
  if (!isRecording) {
    startRecording();
  } else {
    stopRecording();
  }
});

async function startRecording() {
  const matterCode = document.getElementById('matterCode').value;
  const clientCode = document.getElementById('clientCode').value;
  
  if (!matterCode) {
    alert('Please enter a matter code');
    return;
  }
  
  try {
    // Create session via API
    const response = await fetch('http://localhost:8000/api/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        matter_code: matterCode,
        client_code: clientCode,
        description: 'Meeting recording'
      })
    });
    
    const session = await response.json();
    
    // Store session info
    chrome.storage.local.set({
      currentSession: session.session_id,
      matterCode: matterCode,
      isRecording: true
    });
    
    // Open the recording page in a new tab
    const recordingUrl = chrome.runtime.getURL('recording.html');
    chrome.tabs.create({ url: recordingUrl });
    
    isRecording = true;
    updateUI();
    
  } catch (error) {
    console.error('Failed to start recording:', error);
    alert('Failed to start recording. Make sure the API is running.');
  }
}

function stopRecording() {
  chrome.storage.local.set({isRecording: false});
  isRecording = false;
  updateUI();
}

function updateUI() {
  const status = document.getElementById('status');
  const button = document.getElementById('recordBtn');
  
  if (isRecording) {
    status.textContent = 'Recording page opened';
    status.classList.add('recording');
    button.textContent = 'Stop Session';
    button.classList.add('stop');
  } else {
    status.textContent = 'Ready to record';
    status.classList.remove('recording');
    button.textContent = 'Start Recording';
    button.classList.remove('stop');
  }
}
