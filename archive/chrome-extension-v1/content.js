// content.js - Simple recording for meeting pages
console.log('VaultScribe content script loaded');

let mediaRecorder = null;
let audioChunks = [];

// Listen for messages from extension
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  console.log('Content script received:', request.action);
  
  if (request.action === 'startCapture') {
    try {
      // This will prompt user to share screen/tab WITH audio
      const stream = await navigator.mediaDevices.getDisplayMedia({
        audio: true,
        video: false  // We only want audio
      });
      
      // Check if we got audio
      if (stream.getAudioTracks().length === 0) {
        console.error('No audio track in stream');
        alert('Please make sure to check "Share tab audio" when prompted');
        return;
      }
      
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, {type: 'audio/webm'});
        const reader = new FileReader();
        reader.onloadend = () => {
          chrome.runtime.sendMessage({
            action: 'saveAudio',
            sessionId: request.sessionId,
            audioData: reader.result
          });
        };
        reader.readAsDataURL(audioBlob);
      };
      
      mediaRecorder.start();
      console.log('Recording started');
      sendResponse({status: 'started'});
      
    } catch (error) {
      console.error('Error starting capture:', error);
      alert('Failed to start recording. Please try again.');
    }
    
  } else if (request.action === 'stopCapture') {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      console.log('Recording stopped');
    }
    sendResponse({status: 'stopped'});
  }
  
  return true; // Keep message channel open
});
