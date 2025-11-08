// Background.js - Fixed for Manifest V3
console.log('Background script loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request.action);
  
  if (request.action === 'startRecording') {
    // Forward to content script
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'startCapture',
        sessionId: request.sessionId
      });
    });
    
    chrome.action.setBadgeText({text: 'REC'});
    chrome.action.setBadgeBackgroundColor({color: '#FF0000'});
    
  } else if (request.action === 'stopRecording') {
    // Forward to content script
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'stopCapture'});
    });
    
    chrome.action.setBadgeText({text: ''});
    
  } else if (request.action === 'saveAudio') {
    // Save the audio data
    saveAudioData(request.sessionId, request.audioData);
  }
  
  sendResponse({status: 'ok'});
  return true;
});

async function saveAudioData(sessionId, audioDataUrl) {
  try {
    console.log('Saving audio for session:', sessionId);
    
    // Download directly using the data URL
    chrome.downloads.download({
      url: audioDataUrl,  // Use the data URL directly
      filename: 'vaultscribe_' + sessionId + '.webm',
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('Download failed:', chrome.runtime.lastError);
      } else {
        console.log('Download started with ID:', downloadId);
      }
    });
    
  } catch (error) {
    console.error('Error saving audio:', error);
  }
}
