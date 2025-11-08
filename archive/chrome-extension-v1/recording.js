// recording.js - Separate file to avoid CSP issues
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

// Check microphone permission on load
navigator.permissions.query({name: 'microphone'}).then(result => {
  console.log('Microphone permission:', result.state);
  if (result.state === 'denied') {
    document.getElementById('error').textContent = 'Microphone access denied. Please enable in browser settings.';
    document.getElementById('error').style.display = 'block';
  }
});

document.getElementById('recordBtn').addEventListener('click', async () => {
  console.log('Button clicked, isRecording:', isRecording);
  
  if (!isRecording) {
    try {
      console.log('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true,
        video: false 
      });
      
      console.log('Got stream:', stream);
      
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      
      mediaRecorder.ondataavailable = (event) => {
        console.log('Data chunk:', event.data.size, 'bytes');
        audioChunks.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        console.log('Recording stopped, total chunks:', audioChunks.length);
        const audioBlob = new Blob(audioChunks, {type: 'audio/webm'});
        const url = URL.createObjectURL(audioBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'vaultscribe_recording.webm';
        link.textContent = 'Download Recording (' + (audioBlob.size / 1024).toFixed(2) + ' KB)';
        link.style.display = 'block';
        link.style.marginTop = '10px';
        document.getElementById('recordings').appendChild(link);
      };
      
      mediaRecorder.start();
      isRecording = true;
      
      document.getElementById('recordBtn').textContent = 'Stop Recording';
      document.getElementById('recordBtn').className = 'recording';
      document.getElementById('status').textContent = 'Recording... (speak now)';
      
    } catch (error) {
      console.error('Error:', error);
      document.getElementById('error').textContent = 'Error: ' + error.message;
      document.getElementById('error').style.display = 'block';
    }
  } else {
    console.log('Stopping recording...');
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
    isRecording = false;
    
    document.getElementById('recordBtn').textContent = 'Start Recording';
    document.getElementById('recordBtn').className = 'ready';
    document.getElementById('status').textContent = 'Recording saved! Click link below to download.';
  }
});
