#!/bin/bash
# VaultScribe API Server Startup Script

echo "🚀 Starting VaultScribe API Server..."
echo ""

# Check if .env file exists
if [ ! -f "api/.env" ]; then
    echo "⚠️  Warning: api/.env file not found"
    echo "📝 Creating from .env.example..."
    cp api/.env.example api/.env
    echo ""
    echo "❗ IMPORTANT: Edit api/.env and add your API keys:"
    echo "   - ASSEMBLYAI_API_KEY (required for transcription)"
    echo "   - ANTHROPIC_API_KEY (required for AI summaries)"
    echo ""
    echo "Get your keys from:"
    echo "   • AssemblyAI: https://www.assemblyai.com/"
    echo "   • Anthropic: https://console.anthropic.com/"
    echo ""
fi

cd api

echo "Starting FastAPI server on http://localhost:8000"
echo "API docs available at http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop"
echo ""

uvicorn main:app --reload --host 0.0.0.0 --port 8000
