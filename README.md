# VaultScribe

Zero-knowledge meeting intelligence for regulated industries.

## Project Structure

- /api - FastAPI backend for session management
- /vaultscribe-desktop - Electron desktop app (primary client)
- /archive - Deprecated experiments

## Current Focus
Building desktop app for law firms that:
- Records system audio from any meeting platform
- Transcribes with matter code tracking
- Stores in customer-controlled storage (Azure/AWS/on-prem)
- Never touches our servers (zero-knowledge)

## Status
- ✅ API: Session creation working
- 🔄 Desktop: UI complete, adding audio capture
- 📝 Next: S3/Azure integration
