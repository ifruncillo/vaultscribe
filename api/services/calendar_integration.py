"""
Calendar and Teams Integration Service
Supports Microsoft Teams, Outlook Calendar, and Google Calendar
"""
import os
import json
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import hashlib


class CalendarIntegrationService:
    """
    Service for integrating with calendar systems and scheduling meetings
    Supports Microsoft Graph API (Teams/Outlook) and Google Calendar
    """

    def __init__(self):
        """Initialize calendar integration service"""
        self.ms_client_id = os.getenv('MICROSOFT_CLIENT_ID')
        self.ms_client_secret = os.getenv('MICROSOFT_CLIENT_SECRET')
        self.ms_tenant_id = os.getenv('MICROSOFT_TENANT_ID')

        self.google_credentials = os.getenv('GOOGLE_CALENDAR_CREDENTIALS')

    def create_teams_meeting(
        self,
        subject: str,
        start_time: datetime,
        end_time: datetime,
        attendees: List[str],
        matter_code: Optional[str] = None,
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a Microsoft Teams meeting with calendar invite

        Args:
            subject: Meeting subject/title
            start_time: Meeting start time
            end_time: Meeting end time
            attendees: List of email addresses
            matter_code: Optional matter code for legal tracking
            description: Optional meeting description

        Returns:
            Dictionary with meeting details and join URL
        """
        # NOTE: This is a placeholder implementation
        # Real implementation requires Microsoft Graph API authentication

        meeting_id = hashlib.sha256(
            f"{subject}{start_time.isoformat()}".encode()
        ).hexdigest()[:16]

        meeting_data = {
            "id": meeting_id,
            "subject": f"[{matter_code}] {subject}" if matter_code else subject,
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "attendees": attendees,
            "matter_code": matter_code,
            "description": description,
            "join_url": f"https://teams.microsoft.com/l/meetup-join/{meeting_id}",
            "organizer_url": f"https://teams.microsoft.com/l/meetup-join/{meeting_id}/organizer",
            "calendar_uid": f"{meeting_id}@vaultscribe.com",
            "recording_enabled": True,
            "vaultscribe_session_id": None  # Will be linked when recording starts
        }

        return meeting_data

    async def create_teams_meeting_with_graph_api(
        self,
        access_token: str,
        meeting_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create Teams meeting using Microsoft Graph API

        Args:
            access_token: Microsoft Graph API access token
            meeting_data: Meeting configuration

        Returns:
            Microsoft Graph API response with meeting details
        """
        # Implementation would use Microsoft Graph API
        # POST https://graph.microsoft.com/v1.0/me/onlineMeetings

        # Example request body:
        request_body = {
            "startDateTime": meeting_data["start_time"],
            "endDateTime": meeting_data["end_time"],
            "subject": meeting_data["subject"],
            "participants": {
                "attendees": [
                    {"identity": {"user": {"id": email}}}
                    for email in meeting_data.get("attendees", [])
                ]
            },
            "allowMeetingChat": "enabled",
            "allowTeamworkReactions": True,
            "recordAutomatically": True  # Auto-record for VaultScribe
        }

        # TODO: Implement actual API call
        # For now, return mock response
        return {
            "id": "mock_meeting_id",
            "joinUrl": "https://teams.microsoft.com/l/meetup-join/...",
            "subject": meeting_data["subject"],
            "startDateTime": meeting_data["start_time"],
            "endDateTime": meeting_data["end_time"]
        }

    def create_calendar_event(
        self,
        title: str,
        start_time: datetime,
        end_time: datetime,
        location: Optional[str] = None,
        description: Optional[str] = None,
        attendees: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Create a calendar event (generic format)
        Can be exported to .ics or used with calendar APIs

        Args:
            title: Event title
            start_time: Event start
            end_time: Event end
            location: Event location or meeting URL
            description: Event description
            attendees: List of attendee emails

        Returns:
            Calendar event data
        """
        event_id = hashlib.sha256(
            f"{title}{start_time.isoformat()}".encode()
        ).hexdigest()[:16]

        return {
            "id": event_id,
            "title": title,
            "start": start_time.isoformat(),
            "end": end_time.isoformat(),
            "location": location,
            "description": description,
            "attendees": attendees or [],
            "uid": f"{event_id}@vaultscribe.com",
            "created": datetime.now().isoformat(),
            "status": "confirmed"
        }

    def generate_ics_file(self, event_data: Dict[str, Any]) -> str:
        """
        Generate iCalendar (.ics) file content

        Args:
            event_data: Event data from create_calendar_event()

        Returns:
            ICS file content as string
        """
        start = datetime.fromisoformat(event_data["start"])
        end = datetime.fromisoformat(event_data["end"])

        # Format times for iCal (YYYYMMDDTHHMMSSZ)
        start_ical = start.strftime("%Y%m%dT%H%M%SZ")
        end_ical = end.strftime("%Y%m%dT%H%M%SZ")
        created_ical = datetime.now().strftime("%Y%m%dT%H%M%SZ")

        ics_content = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//VaultScribe//Legal Recording//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:{event_data["uid"]}
DTSTAMP:{created_ical}
DTSTART:{start_ical}
DTEND:{end_ical}
SUMMARY:{event_data["title"]}
DESCRIPTION:{event_data.get("description", "")}
LOCATION:{event_data.get("location", "")}
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
DESCRIPTION:Reminder: {event_data["title"]}
END:VALARM
END:VEVENT
END:VCALENDAR"""

        return ics_content

    def create_meeting_with_recording_session(
        self,
        session_id: str,
        meeting_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Link a VaultScribe recording session with a calendar meeting

        Args:
            session_id: VaultScribe session ID
            meeting_config: Meeting configuration

        Returns:
            Combined meeting and session data
        """
        # Create calendar event
        event = self.create_calendar_event(
            title=meeting_config.get("title", "Deposition Recording"),
            start_time=meeting_config["start_time"],
            end_time=meeting_config["end_time"],
            location=meeting_config.get("location"),
            description=f"VaultScribe Recording Session\nMatter: {meeting_config.get('matter_code', 'N/A')}\nSession ID: {session_id}",
            attendees=meeting_config.get("attendees", [])
        )

        return {
            "session_id": session_id,
            "calendar_event": event,
            "matter_code": meeting_config.get("matter_code"),
            "recording_scheduled": True,
            "notification_sent": False
        }

    def get_upcoming_meetings(
        self,
        access_token: str,
        days_ahead: int = 7
    ) -> List[Dict[str, Any]]:
        """
        Get upcoming meetings from calendar

        Args:
            access_token: Microsoft Graph or Google Calendar token
            days_ahead: Number of days to look ahead

        Returns:
            List of upcoming meetings
        """
        # TODO: Implement with real calendar API
        # For now, return placeholder
        return []

    def send_meeting_reminder(
        self,
        meeting_id: str,
        recipient_email: str,
        minutes_before: int = 15
    ) -> bool:
        """
        Send meeting reminder notification

        Args:
            meeting_id: Meeting identifier
            recipient_email: Email to send reminder to
            minutes_before: Minutes before meeting to send

        Returns:
            Success status
        """
        # TODO: Implement email/Teams notification
        return True


class TeamsWebhookHandler:
    """
    Handle incoming webhooks from Microsoft Teams
    For notifications, bot commands, and meeting events
    """

    def __init__(self):
        self.webhook_secret = os.getenv('TEAMS_WEBHOOK_SECRET')

    def verify_webhook_signature(self, payload: str, signature: str) -> bool:
        """
        Verify Teams webhook signature

        Args:
            payload: Request payload
            signature: Provided signature

        Returns:
            True if signature is valid
        """
        if not self.webhook_secret:
            return False

        expected_signature = hashlib.sha256(
            f"{self.webhook_secret}{payload}".encode()
        ).hexdigest()

        return signature == expected_signature

    def handle_meeting_started(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle Teams meeting started event

        Args:
            event_data: Teams event payload

        Returns:
            Action to take (e.g., start VaultScribe recording)
        """
        return {
            "action": "start_recording",
            "meeting_id": event_data.get("meeting_id"),
            "matter_code": event_data.get("matter_code"),
            "auto_start": True
        }

    def handle_meeting_ended(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle Teams meeting ended event

        Args:
            event_data: Teams event payload

        Returns:
            Action to take (e.g., stop recording, trigger transcription)
        """
        return {
            "action": "stop_and_transcribe",
            "meeting_id": event_data.get("meeting_id"),
            "trigger_transcription": True,
            "notify_participants": True
        }

    def handle_bot_command(self, command: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle bot commands from Teams chat

        Args:
            command: Command name (e.g., "start", "stop", "status")
            params: Command parameters

        Returns:
            Bot response
        """
        commands = {
            "start": self._start_recording_command,
            "stop": self._stop_recording_command,
            "status": self._status_command,
            "help": self._help_command
        }

        handler = commands.get(command.lower(), self._unknown_command)
        return handler(params)

    def _start_recording_command(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Start recording via bot command"""
        return {
            "response": "Starting VaultScribe recording...",
            "action": "start_recording",
            "matter_code": params.get("matter_code")
        }

    def _stop_recording_command(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Stop recording via bot command"""
        return {
            "response": "Stopping recording and starting transcription...",
            "action": "stop_recording"
        }

    def _status_command(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get recording status"""
        return {
            "response": "Checking recording status...",
            "action": "get_status"
        }

    def _help_command(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Show help text"""
        return {
            "response": """**VaultScribe Bot Commands:**
- `/vaultscribe start [matter-code]` - Start recording
- `/vaultscribe stop` - Stop recording and transcribe
- `/vaultscribe status` - Check recording status
- `/vaultscribe help` - Show this help
""",
            "action": "none"
        }

    def _unknown_command(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle unknown command"""
        return {
            "response": "Unknown command. Type `/vaultscribe help` for available commands.",
            "action": "none"
        }
