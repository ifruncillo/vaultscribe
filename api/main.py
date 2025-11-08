from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import hashlib
import secrets

app = FastAPI(title="VaultScribe API", version="0.1.0")

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
