# VaultScribe Quick Start Guide

Get VaultScribe running in 5 minutes!

## ✅ What You Need

1. **API Keys** (required for full functionality):
   - **AssemblyAI API Key** - For transcription → https://www.assemblyai.com/
   - **Anthropic API Key** - For AI summaries → https://console.anthropic.com/

2. **Optional** (for calendar integration):
   - Microsoft Azure App (for Teams) → https://portal.azure.com/
   - Google Calendar credentials → https://console.cloud.google.com/

## 🚀 Setup (2 minutes)

### Step 1: Configure API Keys

```bash
# Copy the example config
cp api/.env.example api/.env

# Edit the file and add your API keys
nano api/.env  # or use your favorite editor
```

**Minimum required in `api/.env`:**
```env
ASSEMBLYAI_API_KEY=your_actual_assemblyai_key_here
ANTHROPIC_API_KEY=your_actual_anthropic_key_here
```

### Step 2: Start the Servers

**Terminal 1 - API Server:**
```bash
./start-api.sh
```

**Terminal 2 - Web Interface:**
```bash
./start-web.sh
```

## 🎯 Using VaultScribe

### Open in Your Browser

- **Main App:** http://localhost:8080
- **Schedule Sessions:** http://localhost:8080/schedule.html
- **API Docs:** http://localhost:8000/docs

### Basic Workflow

#### Option A: Record Now

1. Go to http://localhost:8080
2. Enter **Matter Code** (e.g., "2024-001")
3. Click **"Start Recording Session"**
4. Click **🎙️ Start Recording**
5. Speak into your microphone
6. Click **⏹️ Stop Recording**
7. Click **📝 Transcribe Recording**
8. Wait 1-2 minutes for transcription
9. View transcript with AI summary!

#### Option B: Schedule Future Session

1. Go to http://localhost:8080/schedule.html
2. Fill in meeting details:
   - Matter Code
   - Meeting Title
   - Date & Time
   - Attendees
3. Toggle **"Create Microsoft Teams meeting"** if needed
4. Click **"Schedule Recording Session"**
5. Download the .ics calendar file
6. Import to Outlook/Google Calendar

## 📝 What Gets Generated

After transcription, you get:

✅ **Full Transcript** with speaker labels
✅ **AI Executive Summary** (2-3 paragraphs)
✅ **Action Items** extracted automatically
✅ **Key Topics** identified
✅ **Searchable Text** with highlighting
✅ **Export Options** (TXT, JSON, ICS)

## 🔍 Features Overview

### Recording
- Browser-based audio capture
- Real-time audio visualizer
- Duration and file size tracking
- Matter code organization

### Transcription
- Powered by AssemblyAI
- Speaker diarization (identifies who said what)
- High accuracy
- Timestamps for every word

### AI Analysis
- Claude AI generates summaries
- Extracts action items
- Identifies key topics
- Suggests participants/roles

### Search
- Real-time transcript search
- Highlights matching text
- Shows match count
- Auto-scrolls to results

### Calendar Integration
- Create Teams meetings
- Export .ics calendar files
- Schedule future sessions
- Auto-start recording

## 🎮 Testing Without Audio

Want to test the UI without recording?

1. Skip API keys for now
2. Start the servers
3. Explore the interface:
   - Recording UI at http://localhost:8080
   - Scheduling UI at http://localhost:8080/schedule.html
   - Check API docs at http://localhost:8000/docs

**Note:** Transcription won't work without valid API keys.

## 📊 API Endpoints

Full API documentation: http://localhost:8000/docs

**Key Endpoints:**
- `POST /api/session` - Create recording session
- `POST /api/upload` - Upload audio file
- `POST /api/transcribe` - Start transcription
- `GET /api/transcript/{id}` - Get transcript
- `POST /api/calendar/schedule-session` - Schedule meeting
- `GET /api/calendar/export-ics/{id}` - Export calendar

## 🔒 Security Notes

- `.env` file is git-ignored (safe)
- Audio files stored in `api/uploads/` (git-ignored)
- CORS configured for localhost only
- Webhook signatures verified for Teams integration

## 🐛 Troubleshooting

### "AssemblyAI API key not provided"
➜ Add your key to `api/.env`:
```env
ASSEMBLYAI_API_KEY=your_key_here
```

### "Anthropic API key not provided"
➜ Add your key to `api/.env`:
```env
ANTHROPIC_API_KEY=your_key_here
```

### "Microphone not accessible"
➜ Grant browser microphone permissions when prompted

### Transcription takes forever
➜ Normal for long recordings. AssemblyAI processes at ~1x speed (5 min audio = ~5 min processing)

### Can't access from other devices
➜ API server binds to 0.0.0.0, but you may need to:
1. Open firewall ports 8000 and 8080
2. Update CORS_ORIGINS in `.env`

## 📚 Next Steps

### For Production Use

1. **Set up database** - Replace in-memory storage with PostgreSQL
2. **Configure Azure Blob Storage** - For scalable audio storage
3. **Set up Teams app** - Register in Azure for full Teams integration
4. **Add authentication** - Protect API endpoints
5. **Configure HTTPS** - Use SSL certificates

### For Development

1. **Add unit tests** - Test transcription/AI services
2. **Add PDF export** - Currently shows placeholder
3. **Implement database models** - SQLAlchemy schemas
4. **Add user management** - Multi-tenant support
5. **Enhance search** - Add filters, date ranges, matter code search

## 💡 Tips

- **Best audio quality:** Use external microphone in quiet room
- **Matter codes:** Use consistent format (e.g., YEAR-NUMBER)
- **Scheduling:** Set up recurring depositions in advance
- **Search:** Search by speaker, topic, or specific terms
- **Export:** Download JSON for programmatic access

## 🆘 Need Help?

- **API Issues:** Check http://localhost:8000/health
- **Integration Status:** Visit http://localhost:8000/api/integrations/status
- **Browser Console:** Press F12 to see JavaScript errors
- **Server Logs:** Check terminal where `start-api.sh` is running

---

**Built for law firms who need accurate, AI-enhanced transcription.**

Enjoy VaultScribe! 🎉
