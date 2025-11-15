# VaultScribe

**AI-Powered Legal Recording & Transcription Platform**

VaultScribe is a meeting recording and transcription application specifically designed for law firms. It combines high-accuracy speech-to-text transcription with AI-powered summaries, action item extraction, and speaker identification.

## Features

- 🎙️ **High-Quality Audio Recording** - Browser-based recording with real-time visualizer
- 📝 **Accurate Transcription** - Powered by AssemblyAI with speaker diarization
- 🤖 **AI Summaries** - Claude AI generates executive summaries and extracts action items
- 👥 **Speaker Identification** - Automatic speaker labeling and separation
- 📊 **Matter Code Tracking** - Organize recordings by legal matter codes
- 💾 **Multiple Export Formats** - Export as TXT, JSON, or PDF
- 🔍 **Key Topic Extraction** - Automatically identify main discussion topics
- ⚡ **Real-time Processing** - Fast transcription and analysis

## Architecture

```
vaultscribe/
├── api/                    # FastAPI backend
│   ├── main.py            # API endpoints
│   ├── services/          # Business logic
│   │   ├── transcription.py   # AssemblyAI integration
│   │   └── ai_summary.py      # Claude AI integration
│   ├── requirements.txt   # Python dependencies
│   └── .env.example       # Environment config template
│
├── web/                   # Frontend web application
│   ├── index.html        # Recording interface
│   ├── transcript.html   # Transcript viewer
│   └── app.js           # Frontend logic
│
└── archive/              # Previous experiments
```

## Quick Start

### Prerequisites

- Python 3.9+
- AssemblyAI API key ([Get one here](https://www.assemblyai.com/))
- Anthropic API key ([Get one here](https://console.anthropic.com/))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/vaultscribe.git
   cd vaultscribe
   ```

2. **Set up the backend**
   ```bash
   cd api
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys
   ```

4. **Start the API server**
   ```bash
   uvicorn main:app --reload --port 8000
   ```

5. **Open the web interface**
   ```bash
   # In a new terminal, serve the web directory
   cd ../web
   python -m http.server 8080
   ```

6. **Access the application**
   - Open http://localhost:8080 in your browser
   - API documentation: http://localhost:8000/docs

## Usage

### Recording a Session

1. **Start a new session**
   - Enter matter code (required)
   - Add client code (optional)
   - Provide description (optional)
   - Click "Start Recording Session"

2. **Record audio**
   - Grant microphone permissions when prompted
   - Click "🎙️ Start Recording"
   - Speak naturally - the visualizer shows audio levels
   - Click "⏹️ Stop Recording" when done

3. **Transcribe**
   - Click "📝 Transcribe Recording"
   - Wait for processing (typically 1-2 minutes)
   - Automatically redirected to transcript viewer

### Viewing Transcripts

The transcript viewer displays:

- **Session Metadata** - Matter code, duration, timestamp
- **Executive Summary** - AI-generated overview of key points
- **Action Items** - Extracted tasks and follow-ups
- **Key Topics** - Main discussion points
- **Full Transcript** - Speaker-labeled or plain text view

### Exporting

Export transcripts in multiple formats:
- **TXT** - Plain text for easy sharing
- **JSON** - Structured data with all metadata
- **PDF** - Formatted document (coming soon)

## API Endpoints

### Session Management

- `POST /api/session` - Create new recording session
- `GET /api/session/{session_id}` - Get session details
- `GET /api/sessions` - List all sessions

### Audio & Transcription

- `POST /api/upload` - Upload audio file
- `POST /api/transcribe` - Start transcription
- `GET /api/transcript/{session_id}` - Get transcript

### Health Check

- `GET /` - API status
- `GET /health` - Health check

## Configuration

Edit `api/.env` to configure:

```env
# Required
ASSEMBLYAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here

# Optional
ENVIRONMENT=development
HOST=0.0.0.0
PORT=8000
```

## Development Roadmap

See [ROADMAP.md](ROADMAP.md) and [TASKS.md](TASKS.md) for upcoming features.

### Planned Features

- Desktop application (Electron/Tauri)
- Database persistence (PostgreSQL)
- Azure Blob Storage integration
- Advanced search and filtering
- Team collaboration features
- Custom AI prompt templates

## Technical Stack

**Backend:**
- FastAPI - Modern Python web framework
- AssemblyAI - Speech-to-text transcription
- Anthropic Claude - AI summaries and analysis
- Python 3.9+

**Frontend:**
- Vanilla JavaScript - No framework dependencies
- MediaRecorder API - Browser-native audio recording
- Web Audio API - Real-time visualization
- Responsive CSS - Mobile-friendly design

## Security & Privacy

- Audio files stored locally (not in cloud by default)
- In-memory session storage (database coming soon)
- CORS configured for localhost development
- API keys stored in environment variables
- Audio files excluded from git commits

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: https://github.com/yourusername/vaultscribe/issues
- Email: support@vaultscribe.com

## Acknowledgments

- AssemblyAI for accurate transcription services
- Anthropic for Claude AI capabilities
- FastAPI for excellent Python web framework

---

**Built for law firms who need accurate, AI-enhanced transcription.**
