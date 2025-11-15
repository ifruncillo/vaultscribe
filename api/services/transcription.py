"""
AssemblyAI Transcription Service
"""
import os
import time
import assemblyai as aai
from typing import Dict, List, Optional


class TranscriptionService:
    """Service for transcribing audio using AssemblyAI"""

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize transcription service

        Args:
            api_key: AssemblyAI API key (defaults to env var)
        """
        self.api_key = api_key or os.getenv('ASSEMBLYAI_API_KEY')
        if not self.api_key:
            raise ValueError("AssemblyAI API key not provided")

        aai.settings.api_key = self.api_key

    def transcribe_file(
        self,
        audio_path: str,
        speaker_labels: bool = True,
        auto_highlights: bool = True
    ) -> Dict:
        """
        Transcribe an audio file

        Args:
            audio_path: Path to audio file or URL
            speaker_labels: Enable speaker diarization
            auto_highlights: Enable automatic key phrase detection

        Returns:
            Dictionary containing transcript data
        """
        config = aai.TranscriptionConfig(
            speaker_labels=speaker_labels,
            auto_highlights=auto_highlights,
            language_code="en"
        )

        transcriber = aai.Transcriber()
        transcript = transcriber.transcribe(audio_path, config=config)

        # Wait for completion
        while transcript.status not in [aai.TranscriptStatus.completed, aai.TranscriptStatus.error]:
            time.sleep(3)
            transcript = transcriber.get_transcript(transcript.id)

        if transcript.status == aai.TranscriptStatus.error:
            raise Exception(f"Transcription failed: {transcript.error}")

        return self._format_transcript(transcript)

    def _format_transcript(self, transcript) -> Dict:
        """
        Format AssemblyAI transcript into our standard format

        Args:
            transcript: AssemblyAI transcript object

        Returns:
            Formatted transcript dictionary
        """
        result = {
            "text": transcript.text,
            "id": transcript.id,
            "status": str(transcript.status),
            "duration": transcript.audio_duration,
            "words": []
        }

        # Format utterances with speaker labels
        if transcript.utterances:
            result["utterances"] = [
                {
                    "speaker": f"Speaker {utterance.speaker}",
                    "text": utterance.text,
                    "start": utterance.start,
                    "end": utterance.end,
                    "confidence": utterance.confidence
                }
                for utterance in transcript.utterances
            ]
        else:
            # Fallback to plain text
            result["utterances"] = []

        # Format words with timestamps
        if transcript.words:
            result["words"] = [
                {
                    "text": word.text,
                    "start": word.start,
                    "end": word.end,
                    "confidence": word.confidence
                }
                for word in transcript.words
            ]

        # Extract auto highlights
        if hasattr(transcript, 'auto_highlights') and transcript.auto_highlights:
            result["highlights"] = [
                {
                    "text": highlight.text,
                    "count": highlight.count,
                    "rank": highlight.rank,
                    "timestamps": [
                        {"start": ts.start, "end": ts.end}
                        for ts in highlight.timestamps
                    ]
                }
                for highlight in transcript.auto_highlights.results
            ]
        else:
            result["highlights"] = []

        return result

    def get_transcript(self, transcript_id: str) -> Dict:
        """
        Retrieve a transcript by ID

        Args:
            transcript_id: AssemblyAI transcript ID

        Returns:
            Formatted transcript dictionary
        """
        transcriber = aai.Transcriber()
        transcript = transcriber.get_transcript(transcript_id)

        return self._format_transcript(transcript)
