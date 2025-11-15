from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict
import hashlib
import secrets
import os
import aiofiles
from pathlib import Path
from dotenv import load_dotenv

from services.transcription import TranscriptionService
from services.ai_summary import AISummaryService

# Load environment variables
load_dotenv()

app = FastAPI(title="VaultScribe API", version="0.1.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

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
transcripts = {}

# Initialize services (will be lazy-loaded)
_transcription_service = None
_ai_summary_service = None


def get_transcription_service() -> TranscriptionService:
    """Get or create transcription service instance"""
    global _transcription_service
    if _transcription_service is None:
        _transcription_service = TranscriptionService()
    return _transcription_service


def get_ai_summary_service() -> AISummaryService:
    """Get or create AI summary service instance"""
    global _ai_summary_service
    if _ai_summary_service is None:
        _ai_summary_service = AISummaryService()
    return _ai_summary_service

@app.get("/")
def root():
    return {
        "name": "VaultScribe", 
        "status": "running",
        "time": datetime.now().isoformat()
    }

@app.get("/health")
def health():
    return {"status": "healthy"}

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
    
    # TODO: Generate real presigned URL from S3/Azure
    upload_url = f"https://storage.vaultscribe.com/upload/{session_id}"
    
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


@app.post("/api/upload")
async def upload_audio(
    audio: UploadFile = File(...),
    session_id: str = Form(...)
):
    """
    Upload audio file for a session
    """
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        # Save audio file
        file_extension = audio.filename.split('.')[-1] if '.' in audio.filename else 'webm'
        audio_filename = f"{session_id}.{file_extension}"
        audio_path = UPLOAD_DIR / audio_filename

        # Write file
        async with aiofiles.open(audio_path, 'wb') as out_file:
            content = await audio.read()
            await out_file.write(content)

        # Update session
        sessions[session_id]["audio_path"] = str(audio_path)
        sessions[session_id]["audio_filename"] = audio_filename
        sessions[session_id]["uploaded_at"] = datetime.now()

        return {
            "message": "Audio uploaded successfully",
            "session_id": session_id,
            "filename": audio_filename,
            "size": len(content)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@app.post("/api/transcribe")
async def transcribe_audio(request: dict):
    """
    Transcribe uploaded audio file
    """
    session_id = request.get("session_id")

    if not session_id or session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = sessions[session_id]

    if "audio_path" not in session:
        raise HTTPException(status_code=400, detail="No audio file uploaded for this session")

    try:
        # Get services
        transcription_service = get_transcription_service()
        ai_service = get_ai_summary_service()

        # Transcribe audio
        audio_path = session["audio_path"]
        transcript_data = transcription_service.transcribe_file(audio_path)

        # Generate AI summary
        summary_data = ai_service.generate_summary(
            transcript=transcript_data["text"],
            matter_code=session.get("matter_code"),
            context=session.get("description")
        )

        # Combine results
        full_transcript = {
            "session_id": session_id,
            "matter_code": session.get("matter_code"),
            "client_code": session.get("client_code"),
            "description": session.get("description"),
            "text": transcript_data["text"],
            "utterances": transcript_data.get("utterances", []),
            "words": transcript_data.get("words", []),
            "highlights": transcript_data.get("highlights", []),
            "duration": transcript_data.get("duration"),
            "summary": summary_data.get("summary"),
            "action_items": summary_data.get("action_items", []),
            "key_topics": summary_data.get("key_topics", []),
            "participants": summary_data.get("participants", []),
            "transcribed_at": datetime.now().isoformat(),
            "assemblyai_id": transcript_data.get("id")
        }

        # Store transcript
        transcripts[session_id] = full_transcript

        # Update session
        sessions[session_id]["transcribed"] = True
        sessions[session_id]["transcribed_at"] = datetime.now()

        return {
            "message": "Transcription completed",
            "session_id": session_id,
            "transcript_preview": transcript_data["text"][:200] + "..."
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@app.get("/api/transcript/{session_id}")
def get_transcript(session_id: str):
    """
    Retrieve transcript for a session
    """
    if session_id not in transcripts:
        raise HTTPException(status_code=404, detail="Transcript not found")

    return transcripts[session_id]


@app.get("/api/sessions")
def list_sessions():
    """
    List all sessions
    """
    return {
        "sessions": list(sessions.values()),
        "count": len(sessions)
    }
