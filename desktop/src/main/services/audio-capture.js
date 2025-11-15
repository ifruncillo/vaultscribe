const { desktopCapturer } = require('electron');
const fs = require('fs');
const path = require('path');
const { PassThrough } = require('stream');

/**
 * AudioCapture Service
 *
 * Handles system audio and microphone recording using Electron's desktopCapturer API.
 * Supports:
 * - System audio (capture Zoom/Teams/Meet calls)
 * - Microphone input
 * - Mixed audio (system + microphone)
 * - Pause/resume
 * - Real-time waveform data
 */
class AudioCapture {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.recordingState = 'idle'; // idle, recording, paused
    this.startTime = null;
    this.pausedDuration = 0;
    this.lastPauseTime = null;
    this.recordingOptions = null;
    this.outputPath = null;

    // Audio context for visualization
    this.audioContext = null;
    this.analyser = null;
    this.sourceNode = null;

    // Create recordings directory
    this.recordingsDir = path.join(process.cwd(), 'recordings');
    if (!fs.existsSync(this.recordingsDir)) {
      fs.mkdirSync(this.recordingsDir, { recursive: true });
    }
  }

  /**
   * Start recording audio
   *
   * @param {Object} options - Recording options
   * @param {string} options.sourceId - Desktop capturer source ID (for system audio)
   * @param {boolean} options.includeMicrophone - Include microphone input
   * @param {number} options.sampleRate - Audio sample rate (default: 16000)
   * @param {string} options.sessionId - Session ID for file naming
   * @returns {Promise<Object>} Recording start result
   */
  async startRecording(options = {}) {
    if (this.recordingState !== 'idle') {
      throw new Error('Recording already in progress');
    }

    this.recordingOptions = {
      sampleRate: options.sampleRate || 16000,
      sessionId: options.sessionId || Date.now().toString(),
      includeMicrophone: options.includeMicrophone !== false,
      sourceId: options.sourceId
    };

    try {
      // Get audio stream
      const stream = await this.getAudioStream();

      // Set up MediaRecorder
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      });

      this.audioChunks = [];

      // Handle data availability
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // Handle recording stop
      this.mediaRecorder.onstop = async () => {
        await this.saveRecording();
        this.cleanup();
      };

      // Handle errors
      this.mediaRecorder.onerror = (error) => {
        console.error('MediaRecorder error:', error);
        this.cleanup();
        throw error;
      };

      // Set up audio context for visualization
      await this.setupAudioVisualization(stream);

      // Start recording
      this.mediaRecorder.start(1000); // Collect data every second
      this.recordingState = 'recording';
      this.startTime = Date.now();
      this.pausedDuration = 0;

      console.log('Recording started:', this.recordingOptions);

      return {
        success: true,
        sessionId: this.recordingOptions.sessionId,
        startTime: this.startTime
      };

    } catch (error) {
      console.error('Error starting recording:', error);
      this.cleanup();
      throw error;
    }
  }

  /**
   * Get audio stream from system or microphone
   */
  async getAudioStream() {
    const { sourceId, includeMicrophone } = this.recordingOptions;

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
            sampleRate: this.recordingOptions.sampleRate
          }
        });

        const micAudioTrack = micStream.getAudioTracks()[0];
        if (micAudioTrack) {
          audioTracks.push(micAudioTrack);
        }
      } catch (error) {
        console.error('Error getting microphone:', error);
        // Don't throw - microphone is optional
        console.warn('Continuing without microphone');
      }
    }

    if (audioTracks.length === 0) {
      throw new Error('No audio sources available');
    }

    // Create combined stream
    const combinedStream = new MediaStream(audioTracks);
    return combinedStream;
  }

  /**
   * Set up audio visualization (waveform, volume levels)
   */
  async setupAudioVisualization(stream) {
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Create analyser node
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;

      // Create source from stream
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      this.sourceNode.connect(this.analyser);

      console.log('Audio visualization setup complete');
    } catch (error) {
      console.error('Error setting up audio visualization:', error);
      // Don't throw - visualization is optional
    }
  }

  /**
   * Get current waveform data for visualization
   * @returns {Uint8Array} Waveform data
   */
  getWaveformData() {
    if (!this.analyser) {
      return new Uint8Array(0);
    }

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteTimeDomainData(dataArray);

    return dataArray;
  }

  /**
   * Get current volume level (0-100)
   * @returns {number} Volume level
   */
  getVolumeLevel() {
    if (!this.analyser) {
      return 0;
    }

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      const normalized = (dataArray[i] - 128) / 128;
      sum += normalized * normalized;
    }

    const rms = Math.sqrt(sum / bufferLength);
    const volume = Math.min(100, Math.floor(rms * 100));

    return volume;
  }

  /**
   * Stop recording
   * @returns {Promise<Object>} Recording result with file path
   */
  async stopRecording() {
    if (this.recordingState === 'idle') {
      throw new Error('No recording in progress');
    }

    return new Promise((resolve, reject) => {
      const endTime = Date.now();
      const duration = endTime - this.startTime - this.pausedDuration;

      this.mediaRecorder.onstop = async () => {
        try {
          const audioPath = await this.saveRecording();
          const fileSize = fs.statSync(audioPath).size;

          this.cleanup();

          resolve({
            success: true,
            audioPath,
            duration,
            fileSize,
            sessionId: this.recordingOptions.sessionId
          });
        } catch (error) {
          reject(error);
        }
      };

      this.mediaRecorder.stop();
      this.recordingState = 'idle';
    });
  }

  /**
   * Pause recording
   */
  pauseRecording() {
    if (this.recordingState !== 'recording') {
      throw new Error('No active recording to pause');
    }

    this.mediaRecorder.pause();
    this.recordingState = 'paused';
    this.lastPauseTime = Date.now();

    console.log('Recording paused');

    return {
      success: true,
      state: 'paused'
    };
  }

  /**
   * Resume recording
   */
  resumeRecording() {
    if (this.recordingState !== 'paused') {
      throw new Error('Recording is not paused');
    }

    this.mediaRecorder.resume();
    this.recordingState = 'recording';

    // Track paused duration
    if (this.lastPauseTime) {
      this.pausedDuration += Date.now() - this.lastPauseTime;
      this.lastPauseTime = null;
    }

    console.log('Recording resumed');

    return {
      success: true,
      state: 'recording'
    };
  }

  /**
   * Save recorded audio to file
   */
  async saveRecording() {
    if (this.audioChunks.length === 0) {
      throw new Error('No audio data to save');
    }

    // Create blob from chunks
    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });

    // Generate output path
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `recording-${this.recordingOptions.sessionId}-${timestamp}.webm`;
    this.outputPath = path.join(this.recordingsDir, filename);

    // Convert blob to buffer and save
    const buffer = Buffer.from(await audioBlob.arrayBuffer());
    fs.writeFileSync(this.outputPath, buffer);

    console.log('Recording saved:', this.outputPath);

    return this.outputPath;
  }

  /**
   * Get current recording status
   */
  getStatus() {
    const status = {
      state: this.recordingState,
      duration: 0,
      fileSize: 0
    };

    if (this.recordingState !== 'idle' && this.startTime) {
      const currentPausedDuration = this.recordingState === 'paused' && this.lastPauseTime
        ? this.pausedDuration + (Date.now() - this.lastPauseTime)
        : this.pausedDuration;

      status.duration = Date.now() - this.startTime - currentPausedDuration;

      // Estimate file size (rough estimate: 16KB per second for webm)
      status.fileSize = Math.floor((status.duration / 1000) * 16 * 1024);
    }

    return status;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.mediaRecorder) {
      const tracks = this.mediaRecorder.stream?.getTracks();
      tracks?.forEach(track => track.stop());
      this.mediaRecorder = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this.sourceNode = null;
    this.audioChunks = [];
    this.recordingState = 'idle';
    this.startTime = null;
    this.pausedDuration = 0;
    this.lastPauseTime = null;
  }
}

module.exports = AudioCapture;
