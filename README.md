# VaultScribe

Zero-knowledge meeting intelligence for regulated industries.

## Quick Start

1. **Install dependencies:**
   ```bash
   cd api
   pip install -r requirements.txt
   ```

2. **Start the API server:**
   ```bash
   cd /path/to/vaultscribe
   uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
   ```

3. **Open the web app:**
   - Navigate to http://localhost:8000/app in your browser
   - Or access the API docs at http://localhost:8000/docs

## Project Structure

- **/api** - FastAPI backend for session management
- **/web** - Browser-based recording interface (READY)
- **/vaultscribe-desktop** - Electron desktop app (in development)
- **/uploads** - Local storage for recorded audio files
- **/archive** - Deprecated experiments

## Features

**Web Recording App:**
- ✅ Create recording sessions with matter codes
- ✅ Browser-based microphone recording
- ✅ Real-time audio visualization
- ✅ Automatic file download after recording
- ✅ Session management via REST API

**API Endpoints:**
- ✅ `POST /api/session` - Create new recording session
- ✅ `GET /api/session/{id}` - Get session details
- ✅ `POST /api/session/{id}/upload` - Upload audio file
- ✅ `GET /api/storage/info` - Get storage backend info
- ✅ `GET /health` - Health check with storage status
- ✅ `GET /app` - Serve web application

## Storage Configuration

VaultScribe supports multiple storage backends for customer-controlled, zero-knowledge architecture:

- **Local** - Files stored on server (default, good for development)
- **AWS S3** - Customer-controlled S3 bucket with presigned URLs
- **Azure Blob Storage** - Customer-controlled Azure storage with SAS tokens

**📖 See [STORAGE_SETUP.md](STORAGE_SETUP.md) for detailed configuration instructions.**

## Current Status
- ✅ API: Fully functional with session management
- ✅ Web App: Complete with audio recording
- ✅ Audio Capture: Working via browser MediaRecorder API
- ✅ Cloud Storage: S3 and Azure integration complete
- 📝 Future: Electron desktop app for system audio capture
- 📝 Future: Transcription with AssemblyAI
- 📝 Future: Database persistence (currently in-memory)
