"""
AI Summary Service using Claude
"""
import os
from typing import Dict, List, Optional
from anthropic import Anthropic


class AISummaryService:
    """Service for generating AI summaries and extracting insights"""

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize AI summary service

        Args:
            api_key: Anthropic API key (defaults to env var)
        """
        self.api_key = api_key or os.getenv('ANTHROPIC_API_KEY')
        if not self.api_key:
            raise ValueError("Anthropic API key not provided")

        self.client = Anthropic(api_key=self.api_key)

    def generate_summary(
        self,
        transcript: str,
        matter_code: Optional[str] = None,
        context: Optional[str] = None
    ) -> Dict:
        """
        Generate comprehensive summary and extract action items

        Args:
            transcript: Full transcript text
            matter_code: Optional matter code for context
            context: Optional additional context

        Returns:
            Dictionary containing summary and action items
        """
        prompt = self._build_summary_prompt(transcript, matter_code, context)

        try:
            message = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2000,
                temperature=0.3,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )

            # Parse response
            response_text = message.content[0].text
            return self._parse_summary_response(response_text)

        except Exception as e:
            raise Exception(f"Failed to generate AI summary: {str(e)}")

    def _build_summary_prompt(
        self,
        transcript: str,
        matter_code: Optional[str] = None,
        context: Optional[str] = None
    ) -> str:
        """Build the prompt for summary generation"""
        prompt = f"""You are a legal transcription assistant analyzing a meeting or deposition transcript for a law firm.

{f'Matter Code: {matter_code}' if matter_code else ''}
{f'Context: {context}' if context else ''}

Please analyze the following transcript and provide:

1. EXECUTIVE SUMMARY: A concise 2-3 paragraph summary of the key discussion points and outcomes
2. ACTION ITEMS: A numbered list of specific action items, tasks, or follow-ups mentioned
3. KEY TOPICS: Main topics discussed
4. PARTICIPANTS: Identified speakers and their roles (if discernible)

Format your response exactly as follows:

EXECUTIVE SUMMARY:
[Your summary here]

ACTION ITEMS:
1. [First action item]
2. [Second action item]
...

KEY TOPICS:
- [Topic 1]
- [Topic 2]
...

PARTICIPANTS:
- [Speaker/Role 1]
- [Speaker/Role 2]
...

TRANSCRIPT:
{transcript}
"""
        return prompt

    def _parse_summary_response(self, response: str) -> Dict:
        """Parse the structured response from Claude"""
        result = {
            "summary": "",
            "action_items": [],
            "key_topics": [],
            "participants": []
        }

        sections = {
            "EXECUTIVE SUMMARY:": "summary",
            "ACTION ITEMS:": "action_items",
            "KEY TOPICS:": "key_topics",
            "PARTICIPANTS:": "participants"
        }

        current_section = None
        lines = response.split('\n')

        for line in lines:
            line = line.strip()

            # Check if line is a section header
            if line in sections:
                current_section = sections[line]
                continue

            if not line:
                continue

            # Append to appropriate section
            if current_section == "summary":
                result["summary"] += line + " "
            elif current_section == "action_items":
                # Remove numbering (1. 2. etc.)
                item = line.lstrip('0123456789. ')
                if item:
                    result["action_items"].append(item)
            elif current_section == "key_topics":
                # Remove bullet points
                topic = line.lstrip('- •*')
                if topic:
                    result["key_topics"].append(topic)
            elif current_section == "participants":
                # Remove bullet points
                participant = line.lstrip('- •*')
                if participant:
                    result["participants"].append(participant)

        # Clean up summary
        result["summary"] = result["summary"].strip()

        return result

    def extract_key_quotes(self, transcript: str, num_quotes: int = 5) -> List[str]:
        """
        Extract key quotes from transcript

        Args:
            transcript: Full transcript text
            num_quotes: Number of key quotes to extract

        Returns:
            List of key quotes
        """
        prompt = f"""Extract the {num_quotes} most important or notable quotes from this transcript.
Return only the quotes, one per line, without additional commentary.

TRANSCRIPT:
{transcript}
"""

        try:
            message = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1000,
                temperature=0.3,
                messages=[{"role": "user", "content": prompt}]
            )

            quotes = message.content[0].text.strip().split('\n')
            return [q.strip('"\'- ') for q in quotes if q.strip()]

        except Exception as e:
            raise Exception(f"Failed to extract quotes: {str(e)}")
