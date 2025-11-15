#!/bin/bash
# VaultScribe Web Interface Startup Script

echo "🌐 Starting VaultScribe Web Interface..."
echo ""

cd web

echo "Web interface available at:"
echo "   📱 Recorder:   http://localhost:8080"
echo "   📅 Scheduler:  http://localhost:8080/schedule.html"
echo "   📝 Transcripts: http://localhost:8080/transcript.html"
echo ""
echo "Press Ctrl+C to stop"
echo ""

python3 -m http.server 8080
