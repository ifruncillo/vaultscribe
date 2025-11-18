const { pipeline } = require('@xenova/transformers');
const fs = require('fs');
const path = require('path');

/**
 * Local Transcription Service
 *
 * Uses Whisper AI running locally on the user's machine.
 * Zero cloud dependencies - all processing happens on-device.
 * Maintains zero-knowledge privacy architecture.
 */
class TranscriptionService {
  constructor() {
    this.transcriber = null;
    this.isInitialized = false;
    this.currentTask = null;
  }

  /**
   * Initialize the Whisper model
   * Downloads model on first run (~140MB for base model)
   * Model is cached locally for future use
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    console.log('Initializing Whisper model...');
    console.log('Note: First run will download model (~140MB). This is stored locally.');

    try {
      // Use Whisper base model (good balance of speed/accuracy)
      // Options: tiny (~75MB, fast), base (~140MB), small (~460MB), medium (~1.5GB)
      this.transcriber = await pipeline(
        'automatic-speech-recognition',
        'Xenova/whisper-base',
        {
          // Cache model locally
          cache_dir: path.join(process.cwd(), '.cache', 'whisper-models')
        }
      );

      this.isInitialized = true;
      console.log('Whisper model initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Whisper:', error);
      throw new Error(`Transcription service initialization failed: ${error.message}`);
    }
  }

  /**
   * Transcribe an audio file
   *
   * @param {string} audioPath - Path to audio file (webm, mp3, wav, etc.)
   * @param {object} options - Transcription options
   * @param {boolean} options.timestamps - Include word-level timestamps (default: true)
   * @param {string} options.language - Language code (default: 'en')
   * @param {function} options.onProgress - Progress callback
   * @returns {Promise<object>} Transcription result
   */
  async transcribe(audioPath, options = {}) {
    // Ensure model is initialized
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!fs.existsSync(audioPath)) {
      throw new Error(`Audio file not found: ${audioPath}`);
    }

    console.log('Starting transcription:', audioPath);

    const {
      timestamps = true,
      language = 'en',
      onProgress = null
    } = options;

    try {
      // Transcribe the audio
      const result = await this.transcriber(audioPath, {
        language: language,
        return_timestamps: timestamps ? 'word' : false,
        chunk_length_s: 30, // Process in 30-second chunks
        stride_length_s: 5,  // 5-second overlap between chunks
        callback_function: onProgress ? (progress) => {
          onProgress({
            status: 'processing',
            progress: progress
          });
        } : null
      });

      console.log('Transcription complete');

      // Format the result
      return this.formatTranscript(result);

    } catch (error) {
      console.error('Transcription error:', error);
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  /**
   * Format transcription result into standard format
   */
  formatTranscript(result) {
    const formatted = {
      text: result.text || '',
      chunks: [],
      words: []
    };

    // Handle word-level timestamps
    if (result.chunks && Array.isArray(result.chunks)) {
      formatted.chunks = result.chunks.map(chunk => ({
        text: chunk.text,
        timestamp: chunk.timestamp
      }));

      // Extract individual words with timestamps
      result.chunks.forEach(chunk => {
        if (chunk.timestamp && chunk.timestamp.length === 2) {
          formatted.words.push({
            text: chunk.text,
            start: chunk.timestamp[0],
            end: chunk.timestamp[1]
          });
        }
      });
    }

    return formatted;
  }

  /**
   * Cancel ongoing transcription
   */
  cancel() {
    if (this.currentTask) {
      this.currentTask.cancel();
      this.currentTask = null;
      console.log('Transcription cancelled');
    }
  }

  /**
   * Get model info and status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      model: 'Whisper Base',
      size: '~140MB',
      privacy: 'Local processing - data never leaves device'
    };
  }
}

module.exports = TranscriptionService;
