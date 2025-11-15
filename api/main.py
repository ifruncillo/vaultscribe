from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import hashlib
import secrets
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from api.storage import get_storage_service

app = FastAPI(title="VaultScribe API", version="0.1.0")

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Get the base directory
BASE_DIR = Path(__file__).resolve().parent.parent
WEB_DIR = BASE_DIR / "web"
UPLOADS_DIR = BASE_DIR / "uploads"

# Create uploads directory if it doesn't exist
UPLOADS_DIR.mkdir(exist_ok=True)

# Data models
class SessionRequest(BaseModel):
    matter_code: Optional[str] = None
    client_code: Optional[str] = None
    description: Optional[str] = None

class SessionResponse(BaseModel):
    session_id: str
    created_at: datetime
    upload_url: str
    matter_code: Optional[str]

# In-memory storage for now (will use database later)
sessions = {}

@app.get("/")
def root():
    return {
        "name": "VaultScribe", 
        "status": "running",
        "time": datetime.now().isoformat()
    }

@app.get("/health")
def health():
    try:
        storage = get_storage_service()
        storage_info = storage.get_storage_info()
        return {
            "status": "healthy",
            "storage": storage_info
        }
    except Exception as e:
        return {
            "status": "healthy",
            "storage": {
                "backend": "unknown",
                "error": str(e)
            }
        }

@app.get("/api/storage/info")
def storage_info():
    """Get information about the configured storage backend"""
    try:
        storage = get_storage_service()
        return storage.get_storage_info()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage service error: {str(e)}")

@app.post("/api/session", response_model=SessionResponse)
def create_session(request: SessionRequest):
    # Generate unique session ID
    session_id = hashlib.sha256(
        f"{datetime.now().isoformat()}-{secrets.token_hex(8)}".encode()
    ).hexdigest()[:16]

    # Create session record
    session = {
        "session_id": session_id,
        "created_at": datetime.now(),
        "matter_code": request.matter_code,
        "client_code": request.client_code,
        "description": request.description,
        "status": "ready"
    }

    # Store in memory (temporary)
    sessions[session_id] = session

    # Generate presigned upload URL using configured storage backend
    try:
        storage = get_storage_service()
        upload_url = storage.generate_upload_url(session_id, "recording.webm")
    except Exception as e:
        # Fallback to local upload if storage service fails
        upload_url = f"/api/session/{session_id}/upload"
        print(f"Warning: Failed to generate cloud storage URL: {e}")

    return SessionResponse(
        session_id=session_id,
        created_at=session["created_at"],
        upload_url=upload_url,
        matter_code=request.matter_code
    )

@app.get("/api/session/{session_id}")
def get_session(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    return sessions[session_id]

@app.post("/api/session/{session_id}/upload")
async def upload_recording(session_id: str, file: UploadFile = File(...)):
    """Upload audio recording for a session"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    # Save the file
    file_path = UPLOADS_DIR / f"{session_id}_{file.filename}"

    try:
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)

        # Update session
        sessions[session_id]["file_path"] = str(file_path)
        sessions[session_id]["file_size"] = len(contents)
        sessions[session_id]["status"] = "uploaded"

        return {
            "success": True,
            "session_id": session_id,
            "file_size": len(contents),
            "message": "File uploaded successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

# Serve the web app
@app.get("/app")
async def serve_app():
    """Serve the web application"""
    index_path = WEB_DIR / "index.html"
    if not index_path.exists():
        raise HTTPException(status_code=404, detail="Web app not found")
    return FileResponse(index_path)

# Mount static files
if WEB_DIR.exists():
    app.mount("/static", StaticFiles(directory=WEB_DIR), name="static")
