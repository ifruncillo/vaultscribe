# VaultScribe Current Sprint

## Active Development: Desktop App
- [x] Electron app scaffolded
- [x] Professional UI created
- [ ] System audio capture
- [ ] Integration with API
- [ ] S3/Azure upload

## API Endpoints Needed
- [x] POST /api/session - Create recording session
- [x] GET /api/session/{id} - Get session details
- [ ] POST /api/session/{id}/upload-url - Get presigned URL
- [ ] POST /api/session/{id}/complete - Mark as complete
- [ ] POST /api/session/{id}/transcription - Store transcript

## Decisions Made
1. Desktop app over Chrome extension (better audio access)
2. Electron for cross-platform support
3. Customer-controlled storage (not our S3)
4. Zero-knowledge architecture

## Parking Lot (Don't Distract!)
- Mobile app
- Slack integration  
- Calendar integration
