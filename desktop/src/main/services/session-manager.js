const Store = require('electron-store');
const { v4: uuidv4 } = require('crypto').randomUUID ? { v4: require('crypto').randomUUID } : require('uuid');
const path = require('path');
const fs = require('fs');

/**
 * Session Manager
 *
 * Manages recording sessions, metadata, and persistent storage.
 * Sessions track:
 * - Matter code, client code, description
 * - Recording duration, file paths
 * - Transcription status and results
 * - Encryption status
 * - Timestamps
 */
class SessionManager {
  constructor() {
    // Persistent storage for sessions
    this.store = new Store({
      name: 'sessions',
      defaults: {
        sessions: {}
      }
    });

    // In-memory cache of sessions
    this.sessions = this.store.get('sessions') || {};
  }

  /**
   * Create a new session
   *
   * @param {Object} data - Session data
   * @param {string} data.matterCode - Matter/case/client code
   * @param {string} data.clientCode - Optional client code
   * @param {string} data.description - Optional description
   * @param {Object} data.metadata - Optional additional metadata
   * @returns {Object} Created session
   */
  async createSession(data) {
    const sessionId = this.generateSessionId();

    const session = {
      sessionId,
      matterCode: data.matterCode || '',
      clientCode: data.clientCode || '',
      description: data.description || '',
      metadata: data.metadata || {},

      // Recording info
      audioPath: null,
      duration: 0,
      fileSize: 0,
      recordingStarted: null,
      recordingEnded: null,

      // Encryption info
      encrypted: false,
      encryptionMethod: null,

      // Transcription info
      transcriptPath: null,
      transcriptionStatus: 'pending', // pending, processing, completed, failed
      transcriptionError: null,

      // AI analysis
      summary: null,
      actionItems: [],
      keyTopics: [],

      // Timestamps
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),

      // Status
      status: 'created' // created, recording, recorded, transcribing, completed
    };

    // Save to store
    this.sessions[sessionId] = session;
    this.store.set('sessions', this.sessions);

    console.log('Session created:', sessionId);

    return session;
  }

  /**
   * Get a session by ID
   *
   * @param {string} sessionId - Session ID
   * @returns {Object|null} Session or null if not found
   */
  async getSession(sessionId) {
    return this.sessions[sessionId] || null;
  }

  /**
   * Get all sessions
   *
   * @param {Object} filters - Optional filters
   * @returns {Array<Object>} Array of sessions
   */
  async getAllSessions(filters = {}) {
    let sessions = Object.values(this.sessions);

    // Apply filters
    if (filters.matterCode) {
      sessions = sessions.filter(s =>
        s.matterCode.toLowerCase().includes(filters.matterCode.toLowerCase())
      );
    }

    if (filters.clientCode) {
      sessions = sessions.filter(s =>
        s.clientCode.toLowerCase().includes(filters.clientCode.toLowerCase())
      );
    }

    if (filters.status) {
      sessions = sessions.filter(s => s.status === filters.status);
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      sessions = sessions.filter(s => new Date(s.createdAt) >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      sessions = sessions.filter(s => new Date(s.createdAt) <= toDate);
    }

    // Sort by creation date (newest first)
    sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return sessions;
  }

  /**
   * Update a session
   *
   * @param {string} sessionId - Session ID
   * @param {Object} updates - Fields to update
   * @returns {Object} Updated session
   */
  async updateSession(sessionId, updates) {
    const session = this.sessions[sessionId];

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Merge updates
    Object.assign(session, updates);
    session.updatedAt = new Date().toISOString();

    // Save to store
    this.store.set('sessions', this.sessions);

    console.log('Session updated:', sessionId);

    return session;
  }

  /**
   * Delete a session
   *
   * @param {string} sessionId - Session ID
   * @param {boolean} deleteFiles - Also delete associated files
   * @returns {Object} Deletion result
   */
  async deleteSession(sessionId, deleteFiles = false) {
    const session = this.sessions[sessionId];

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Delete files if requested
    if (deleteFiles) {
      try {
        if (session.audioPath && fs.existsSync(session.audioPath)) {
          fs.unlinkSync(session.audioPath);
          console.log('Deleted audio file:', session.audioPath);
        }

        if (session.transcriptPath && fs.existsSync(session.transcriptPath)) {
          fs.unlinkSync(session.transcriptPath);
          console.log('Deleted transcript file:', session.transcriptPath);
        }
      } catch (error) {
        console.error('Error deleting files:', error);
        // Continue with session deletion even if file deletion fails
      }
    }

    // Remove from sessions
    delete this.sessions[sessionId];

    // Save to store
    this.store.set('sessions', this.sessions);

    console.log('Session deleted:', sessionId);

    return {
      success: true,
      sessionId,
      filesDeleted: deleteFiles
    };
  }

  /**
   * Search sessions
   *
   * @param {string} query - Search query
   * @returns {Array<Object>} Matching sessions
   */
  async searchSessions(query) {
    if (!query) {
      return this.getAllSessions();
    }

    const lowerQuery = query.toLowerCase();

    const sessions = Object.values(this.sessions).filter(session => {
      return (
        session.matterCode.toLowerCase().includes(lowerQuery) ||
        session.clientCode.toLowerCase().includes(lowerQuery) ||
        session.description.toLowerCase().includes(lowerQuery) ||
        (session.summary && session.summary.toLowerCase().includes(lowerQuery))
      );
    });

    // Sort by creation date (newest first)
    sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return sessions;
  }

  /**
   * Get session statistics
   *
   * @returns {Object} Statistics
   */
  async getStatistics() {
    const sessions = Object.values(this.sessions);

    const stats = {
      totalSessions: sessions.length,
      totalDuration: 0,
      totalFileSize: 0,
      byStatus: {},
      byMatterCode: {},
      recentSessions: []
    };

    // Calculate totals and group by status
    sessions.forEach(session => {
      stats.totalDuration += session.duration || 0;
      stats.totalFileSize += session.fileSize || 0;

      // Count by status
      stats.byStatus[session.status] = (stats.byStatus[session.status] || 0) + 1;

      // Count by matter code
      if (session.matterCode) {
        stats.byMatterCode[session.matterCode] = (stats.byMatterCode[session.matterCode] || 0) + 1;
      }
    });

    // Get recent sessions (last 5)
    stats.recentSessions = sessions
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(s => ({
        sessionId: s.sessionId,
        matterCode: s.matterCode,
        createdAt: s.createdAt,
        duration: s.duration,
        status: s.status
      }));

    return stats;
  }

  /**
   * Generate unique session ID
   *
   * @returns {string} Session ID
   */
  generateSessionId() {
    // Try to use crypto.randomUUID if available
    if (typeof require('crypto').randomUUID === 'function') {
      return require('crypto').randomUUID();
    }

    // Fallback to timestamp + random
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export session data
   *
   * @param {string} sessionId - Session ID
   * @param {string} format - Export format (json, txt)
   * @returns {string} Exported data
   */
  async exportSession(sessionId, format = 'json') {
    const session = this.sessions[sessionId];

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (format === 'json') {
      return JSON.stringify(session, null, 2);
    }

    if (format === 'txt') {
      let text = `VaultScribe Session: ${session.sessionId}\n`;
      text += `=======================================\n\n`;
      text += `Matter Code: ${session.matterCode}\n`;
      text += `Client Code: ${session.clientCode}\n`;
      text += `Description: ${session.description}\n`;
      text += `Created: ${session.createdAt}\n`;
      text += `Duration: ${this.formatDuration(session.duration)}\n`;
      text += `Status: ${session.status}\n\n`;

      if (session.summary) {
        text += `Summary:\n${session.summary}\n\n`;
      }

      if (session.actionItems && session.actionItems.length > 0) {
        text += `Action Items:\n`;
        session.actionItems.forEach((item, index) => {
          text += `${index + 1}. ${item}\n`;
        });
        text += `\n`;
      }

      return text;
    }

    throw new Error(`Unsupported export format: ${format}`);
  }

  /**
   * Format duration in milliseconds to readable string
   *
   * @param {number} ms - Duration in milliseconds
   * @returns {string} Formatted duration
   */
  formatDuration(ms) {
    if (!ms) return '0:00';

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    }

    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
  }

  /**
   * Clear all sessions (use with caution!)
   *
   * @returns {Object} Result
   */
  async clearAllSessions() {
    const count = Object.keys(this.sessions).length;

    this.sessions = {};
    this.store.set('sessions', {});

    console.log(`Cleared ${count} sessions`);

    return {
      success: true,
      clearedCount: count
    };
  }
}

module.exports = SessionManager;
