const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Store = require('electron-store');

/**
 * Encryption Service
 *
 * Provides zero-knowledge encryption for audio files and transcripts.
 * Uses AES-256-GCM encryption with PBKDF2 key derivation.
 *
 * Features:
 * - Client-side encryption (data never leaves device unencrypted)
 * - AES-256-GCM (military-grade encryption)
 * - PBKDF2 key derivation (100,000 iterations)
 * - Unique salt and IV per file
 * - Authentication tags for integrity verification
 */
class EncryptionService {
  constructor() {
    // Secure storage for encryption metadata (NOT the passphrase)
    this.store = new Store({
      name: 'encryption-config',
      encryptionKey: this.getDeviceKey()
    });

    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits
    this.saltLength = 32; // 256 bits
    this.iterations = 100000; // PBKDF2 iterations
    this.digest = 'sha256';

    // In-memory passphrase (never stored on disk)
    this.passphrase = null;
    this.derivedKey = null;
  }

  /**
   * Get device-specific key for config encryption
   * This is NOT the user's passphrase - it's just for protecting config
   */
  getDeviceKey() {
    // In production, this should be derived from machine-specific data
    // For now, use a placeholder
    return 'vaultscribe-device-key-' + require('os').hostname();
  }

  /**
   * Check if encryption is enabled
   */
  isEnabled() {
    return this.passphrase !== null;
  }

  /**
   * Set encryption passphrase
   *
   * @param {string} passphrase - User's encryption passphrase
   */
  async setPassphrase(passphrase) {
    if (!passphrase || passphrase.length < 8) {
      throw new Error('Passphrase must be at least 8 characters');
    }

    this.passphrase = passphrase;
    this.derivedKey = null; // Will be derived per-file with unique salt

    console.log('Encryption passphrase set');

    return { success: true };
  }

  /**
   * Clear passphrase from memory
   */
  clearPassphrase() {
    this.passphrase = null;
    this.derivedKey = null;
    console.log('Encryption passphrase cleared');
  }

  /**
   * Derive encryption key from passphrase
   *
   * @param {string} passphrase - User's passphrase
   * @param {Buffer} salt - Unique salt for this file
   * @returns {Promise<Buffer>} Derived key
   */
  deriveKey(passphrase, salt) {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        passphrase,
        salt,
        this.iterations,
        this.keyLength,
        this.digest,
        (err, key) => {
          if (err) reject(err);
          else resolve(key);
        }
      );
    });
  }

  /**
   * Encrypt a file
   *
   * @param {string} filePath - Path to file to encrypt
   * @param {string} outputPath - Optional output path (default: same dir with .enc extension)
   * @returns {Promise<string>} Path to encrypted file
   */
  async encryptFile(filePath, outputPath = null) {
    if (!this.passphrase) {
      throw new Error('Encryption passphrase not set. Call setPassphrase() first.');
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    try {
      // Read the file
      const plaintext = fs.readFileSync(filePath);

      // Generate unique salt and IV for this file
      const salt = crypto.randomBytes(this.saltLength);
      const iv = crypto.randomBytes(this.ivLength);

      // Derive key from passphrase and salt
      const key = await this.deriveKey(this.passphrase, salt);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      // Encrypt the data
      const encrypted = Buffer.concat([
        cipher.update(plaintext),
        cipher.final()
      ]);

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      // Determine output path
      if (!outputPath) {
        const dir = path.dirname(filePath);
        const filename = path.basename(filePath);
        outputPath = path.join(dir, filename + '.enc');
      }

      // Write encrypted file with metadata
      // Format: [salt][iv][authTag][encrypted data]
      const output = Buffer.concat([
        salt,
        iv,
        authTag,
        encrypted
      ]);

      fs.writeFileSync(outputPath, output);

      console.log('File encrypted:', {
        input: filePath,
        output: outputPath,
        originalSize: plaintext.length,
        encryptedSize: output.length
      });

      return outputPath;

    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error(`Failed to encrypt file: ${error.message}`);
    }
  }

  /**
   * Decrypt a file
   *
   * @param {string} encryptedPath - Path to encrypted file
   * @param {string} outputPath - Optional output path (default: same dir without .enc extension)
   * @returns {Promise<string>} Path to decrypted file
   */
  async decryptFile(encryptedPath, outputPath = null) {
    if (!this.passphrase) {
      throw new Error('Encryption passphrase not set. Call setPassphrase() first.');
    }

    if (!fs.existsSync(encryptedPath)) {
      throw new Error(`File not found: ${encryptedPath}`);
    }

    try {
      // Read encrypted file
      const encryptedData = fs.readFileSync(encryptedPath);

      // Extract metadata
      const salt = encryptedData.slice(0, this.saltLength);
      const iv = encryptedData.slice(this.saltLength, this.saltLength + this.ivLength);
      const authTag = encryptedData.slice(
        this.saltLength + this.ivLength,
        this.saltLength + this.ivLength + 16
      );
      const encrypted = encryptedData.slice(this.saltLength + this.ivLength + 16);

      // Derive key from passphrase and salt
      const key = await this.deriveKey(this.passphrase, salt);

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt the data
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);

      // Determine output path
      if (!outputPath) {
        if (encryptedPath.endsWith('.enc')) {
          outputPath = encryptedPath.slice(0, -4);
        } else {
          const dir = path.dirname(encryptedPath);
          const filename = path.basename(encryptedPath);
          outputPath = path.join(dir, 'decrypted-' + filename);
        }
      }

      // Write decrypted file
      fs.writeFileSync(outputPath, decrypted);

      console.log('File decrypted:', {
        input: encryptedPath,
        output: outputPath,
        encryptedSize: encryptedData.length,
        decryptedSize: decrypted.length
      });

      return outputPath;

    } catch (error) {
      console.error('Decryption error:', error);

      if (error.message.includes('Unsupported state or unable to authenticate data')) {
        throw new Error('Decryption failed: Invalid passphrase or corrupted file');
      }

      throw new Error(`Failed to decrypt file: ${error.message}`);
    }
  }

  /**
   * Encrypt data (string or buffer) - returns encrypted buffer
   *
   * @param {string|Buffer} data - Data to encrypt
   * @returns {Promise<Object>} { encrypted: Buffer, salt: Buffer, iv: Buffer, authTag: Buffer }
   */
  async encryptData(data) {
    if (!this.passphrase) {
      throw new Error('Encryption passphrase not set');
    }

    const plaintext = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');

    // Generate unique salt and IV
    const salt = crypto.randomBytes(this.saltLength);
    const iv = crypto.randomBytes(this.ivLength);

    // Derive key
    const key = await this.deriveKey(this.passphrase, salt);

    // Encrypt
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      salt,
      iv,
      authTag
    };
  }

  /**
   * Decrypt data - returns decrypted buffer
   *
   * @param {Buffer} encrypted - Encrypted data
   * @param {Buffer} salt - Salt used for encryption
   * @param {Buffer} iv - IV used for encryption
   * @param {Buffer} authTag - Authentication tag
   * @returns {Promise<Buffer>} Decrypted data
   */
  async decryptData(encrypted, salt, iv, authTag) {
    if (!this.passphrase) {
      throw new Error('Encryption passphrase not set');
    }

    // Derive key
    const key = await this.deriveKey(this.passphrase, salt);

    // Decrypt
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);

    return decrypted;
  }

  /**
   * Generate random passphrase
   *
   * @param {number} wordCount - Number of words (default: 6)
   * @returns {string} Random passphrase
   */
  generatePassphrase(wordCount = 6) {
    // Simple word list for passphrase generation
    const words = [
      'alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot',
      'golf', 'hotel', 'india', 'juliet', 'kilo', 'lima',
      'mike', 'november', 'oscar', 'papa', 'quebec', 'romeo',
      'sierra', 'tango', 'uniform', 'victor', 'whiskey', 'xray',
      'yankee', 'zulu', 'secure', 'vault', 'cipher', 'encrypt',
      'private', 'secret', 'guardian', 'shield', 'fortress', 'sentinel'
    ];

    const selected = [];
    for (let i = 0; i < wordCount; i++) {
      const randomIndex = crypto.randomInt(0, words.length);
      selected.push(words[randomIndex]);
    }

    return selected.join('-');
  }

  /**
   * Verify passphrase strength
   *
   * @param {string} passphrase - Passphrase to verify
   * @returns {Object} { valid: boolean, strength: string, message: string }
   */
  verifyPassphraseStrength(passphrase) {
    const result = {
      valid: false,
      strength: 'weak',
      message: ''
    };

    if (!passphrase) {
      result.message = 'Passphrase is required';
      return result;
    }

    if (passphrase.length < 8) {
      result.message = 'Passphrase must be at least 8 characters';
      return result;
    }

    result.valid = true;

    // Calculate strength
    let score = 0;
    if (passphrase.length >= 12) score++;
    if (passphrase.length >= 16) score++;
    if (/[a-z]/.test(passphrase)) score++;
    if (/[A-Z]/.test(passphrase)) score++;
    if (/[0-9]/.test(passphrase)) score++;
    if (/[^a-zA-Z0-9]/.test(passphrase)) score++;

    if (score <= 2) {
      result.strength = 'weak';
      result.message = 'Weak passphrase. Consider adding numbers, symbols, or making it longer.';
    } else if (score <= 4) {
      result.strength = 'medium';
      result.message = 'Medium strength passphrase.';
    } else {
      result.strength = 'strong';
      result.message = 'Strong passphrase!';
    }

    return result;
  }
}

module.exports = EncryptionService;
