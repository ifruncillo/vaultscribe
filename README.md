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
- ✅ `GET /health` - Health check
- ✅ `GET /app` - Serve web application

## Current Status
- ✅ API: Fully functional with session management
- ✅ Web App: Complete with audio recording
- ✅ Audio Capture: Working via browser MediaRecorder API
- 📝 Next: S3/Azure integration for customer-controlled storage
- 📝 Future: Electron desktop app for system audio capture
