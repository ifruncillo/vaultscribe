from fastapi import FastAPI
from datetime import datetime

app = FastAPI(title="VaultScribe API", version="0.1.0")

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
