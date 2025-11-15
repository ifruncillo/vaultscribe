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
from services.calendar_integration import CalendarIntegrationService, TeamsWebhookHandler

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
_calendar_service = None
_teams_webhook_handler = None


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


def get_calendar_service() -> CalendarIntegrationService:
    """Get or create calendar integration service instance"""
    global _calendar_service
    if _calendar_service is None:
        _calendar_service = CalendarIntegrationService()
    return _calendar_service


def get_teams_webhook_handler() -> TeamsWebhookHandler:
    """Get or create Teams webhook handler instance"""
    global _teams_webhook_handler
    if _teams_webhook_handler is None:
        _teams_webhook_handler = TeamsWebhookHandler()
    return _teams_webhook_handler

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


# ============================================================================
# Calendar and Teams Integration Endpoints
# ============================================================================

@app.post("/api/calendar/create-meeting")
async def create_calendar_meeting(request: dict):
    """
    Create a Teams meeting or calendar event

    Request body:
    {
        "subject": "Deposition - Smith v. Jones",
        "start_time": "2024-01-15T10:00:00",
        "end_time": "2024-01-15T12:00:00",
        "attendees": ["attorney@lawfirm.com"],
        "matter_code": "2024-001",
        "description": "Client deposition",
        "create_teams_meeting": true
    }
    """
    try:
        calendar_service = get_calendar_service()

        # Parse times
        start_time = datetime.fromisoformat(request["start_time"])
        end_time = datetime.fromisoformat(request["end_time"])

        if request.get("create_teams_meeting"):
            # Create Teams meeting
            meeting = calendar_service.create_teams_meeting(
                subject=request["subject"],
                start_time=start_time,
                end_time=end_time,
                attendees=request.get("attendees", []),
                matter_code=request.get("matter_code"),
                description=request.get("description")
            )

            return {
                "success": True,
                "meeting": meeting,
                "join_url": meeting["join_url"]
            }
        else:
            # Create regular calendar event
            event = calendar_service.create_calendar_event(
                title=request["subject"],
                start_time=start_time,
                end_time=end_time,
                location=request.get("location"),
                description=request.get("description"),
                attendees=request.get("attendees", [])
            )

            return {
                "success": True,
                "event": event
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create meeting: {str(e)}")


@app.post("/api/calendar/schedule-session")
async def schedule_recording_session(request: dict):
    """
    Schedule a VaultScribe recording session with calendar integration

    Request body:
    {
        "matter_code": "2024-001",
        "client_code": "CLIENT-001",
        "title": "Client Deposition",
        "start_time": "2024-01-15T10:00:00",
        "end_time": "2024-01-15T12:00:00",
        "attendees": ["attorney@lawfirm.com"],
        "auto_start_recording": true
    }
    """
    try:
        # Create VaultScribe session
        session_id = hashlib.sha256(
            f"{datetime.now().isoformat()}-{secrets.token_hex(8)}".encode()
        ).hexdigest()[:16]

        session = {
            "session_id": session_id,
            "created_at": datetime.now(),
            "matter_code": request.get("matter_code"),
            "client_code": request.get("client_code"),
            "description": request.get("title"),
            "status": "scheduled",
            "scheduled_start": request["start_time"],
            "scheduled_end": request["end_time"],
            "auto_start": request.get("auto_start_recording", False)
        }

        sessions[session_id] = session

        # Create calendar meeting
        calendar_service = get_calendar_service()
        meeting_data = calendar_service.create_meeting_with_recording_session(
            session_id=session_id,
            meeting_config={
                "title": request.get("title", "VaultScribe Recording"),
                "start_time": datetime.fromisoformat(request["start_time"]),
                "end_time": datetime.fromisoformat(request["end_time"]),
                "matter_code": request.get("matter_code"),
                "attendees": request.get("attendees", []),
                "location": f"VaultScribe Session: {session_id}"
            }
        )

        # Update session with meeting info
        session["calendar_event_id"] = meeting_data["calendar_event"]["id"]

        return {
            "success": True,
            "session_id": session_id,
            "meeting": meeting_data,
            "message": "Recording session scheduled successfully"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to schedule session: {str(e)}")


@app.get("/api/calendar/export-ics/{session_id}")
def export_calendar_event(session_id: str):
    """
    Export calendar event as .ics file

    Returns an iCalendar file for the session
    """
    from fastapi.responses import Response

    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = sessions[session_id]

    if "scheduled_start" not in session:
        raise HTTPException(status_code=400, detail="Session is not scheduled")

    try:
        calendar_service = get_calendar_service()

        event_data = calendar_service.create_calendar_event(
            title=f"VaultScribe Recording - {session.get('matter_code', session_id)}",
            start_time=datetime.fromisoformat(session["scheduled_start"]),
            end_time=datetime.fromisoformat(session["scheduled_end"]),
            description=f"Matter: {session.get('matter_code')}\nSession ID: {session_id}",
            attendees=session.get("attendees", [])
        )

        ics_content = calendar_service.generate_ics_file(event_data)

        return Response(
            content=ics_content,
            media_type="text/calendar",
            headers={
                "Content-Disposition": f"attachment; filename=vaultscribe-{session_id}.ics"
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export calendar: {str(e)}")


@app.post("/api/webhooks/teams")
async def teams_webhook(request: dict):
    """
    Webhook endpoint for Microsoft Teams events

    Handles:
    - Meeting started/ended events
    - Bot commands
    - Recording notifications
    """
    try:
        webhook_handler = get_teams_webhook_handler()

        event_type = request.get("type")

        if event_type == "meeting.started":
            response = webhook_handler.handle_meeting_started(request.get("data", {}))

            # Auto-start recording if configured
            if response.get("auto_start"):
                meeting_id = response["meeting_id"]
                # Find session by meeting_id (would need to add this mapping)
                # For now, return the action
                return {
                    "acknowledged": True,
                    "action_taken": "recording_started",
                    "meeting_id": meeting_id
                }

        elif event_type == "meeting.ended":
            response = webhook_handler.handle_meeting_ended(request.get("data", {}))

            return {
                "acknowledged": True,
                "action_taken": "recording_stopped_transcription_queued"
            }

        elif event_type == "bot.command":
            command = request.get("data", {}).get("command")
            params = request.get("data", {}).get("params", {})

            response = webhook_handler.handle_bot_command(command, params)

            return {
                "acknowledged": True,
                "response": response.get("response"),
                "action": response.get("action")
            }

        else:
            return {
                "acknowledged": True,
                "message": "Event type not handled"
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Webhook processing failed: {str(e)}")


@app.get("/api/integrations/status")
def get_integrations_status():
    """
    Check status of calendar and Teams integrations
    """
    return {
        "microsoft_teams": {
            "enabled": bool(os.getenv('MICROSOFT_CLIENT_ID')),
            "configured": bool(os.getenv('MICROSOFT_TENANT_ID'))
        },
        "google_calendar": {
            "enabled": bool(os.getenv('GOOGLE_CALENDAR_CREDENTIALS')),
            "configured": bool(os.getenv('GOOGLE_CALENDAR_CREDENTIALS'))
        },
        "webhooks": {
            "teams_webhook": bool(os.getenv('TEAMS_WEBHOOK_SECRET'))
        }
    }
