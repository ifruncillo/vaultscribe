# VaultScribe Electron - UI/UX Design

**Modern, Professional, Privacy-First Design**

---

## Design Philosophy

1. **Privacy-First:** Visual indicators of encryption status, local processing
2. **Professional:** Clean, modern aesthetics suitable for business use
3. **Accessible:** WCAG 2.1 AA compliant, keyboard navigation, screen readers
4. **Native:** Feels like a native app on each platform (Windows/Mac/Linux)
5. **Minimal During Recording:** Don't distract during meetings
6. **Powerful When Needed:** Advanced features available but not overwhelming

---

## Color Palette

### Primary Colors
```
Primary Blue:   #3B82F6  (Trust, security, professionalism)
Dark Blue:      #1E40AF  (Headers, emphasis)
Light Blue:     #DBEAFE  (Backgrounds, highlights)
Success Green:  #10B981  (Recording active, success states)
Warning Amber:  #F59E0B  (Important actions, alerts)
Error Red:      #EF4444  (Errors, critical warnings)
```

### Neutral Colors
```
Gray 900: #111827  (Primary text)
Gray 700: #374151  (Secondary text)
Gray 500: #6B7280  (Tertiary text, disabled)
Gray 300: #D1D5DB  (Borders)
Gray 100: #F3F4F6  (Backgrounds)
Gray 50:  #F9FAFB  (Cards, panels)
White:    #FFFFFF  (Primary backgrounds)
```

### Dark Mode
```
Dark BG:       #1F2937  (Primary background)
Dark Card:     #374151  (Cards, panels)
Dark Border:   #4B5563  (Borders, dividers)
Dark Text:     #F9FAFB  (Primary text)
Dark Text 2:   #D1D5DB  (Secondary text)
```

### Encryption Status Colors
```
Encrypted:     #10B981  (Green - secure)
Unencrypted:   #F59E0B  (Amber - warning)
Processing:    #3B82F6  (Blue - in progress)
Error:         #EF4444  (Red - problem)
```

---

## Typography

### Font Families
```css
/* System fonts for native look */
Primary Font: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif
Mono Font: "SF Mono", "Consolas", "Monaco", "Courier New", monospace
```

### Font Sizes
```
Headline 1:    32px / 2rem    (Page titles)
Headline 2:    24px / 1.5rem  (Section headers)
Headline 3:    20px / 1.25rem (Subsection headers)
Body Large:    16px / 1rem    (Primary content)
Body:          14px / 0.875rem (Secondary content)
Body Small:    12px / 0.75rem  (Labels, metadata)
Caption:       11px / 0.6875rem (Timestamps, hints)
```

### Font Weights
```
Light:    300  (Large headings only)
Regular:  400  (Body text)
Medium:   500  (Subheadings, labels)
Semibold: 600  (Buttons, emphasis)
Bold:     700  (Important headings)
```

---

## Application Structure

### Main Window Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Title Bar (macOS-style drag area, Windows controls)       │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                  │
│          │                                                  │
│ Sidebar  │          Main Content Area                      │
│ (200px)  │                                                  │
│          │                                                  │
│          │                                                  │
│          │                                                  │
├──────────┴──────────────────────────────────────────────────┤
│  Status Bar (storage, encryption status, sync)             │
└─────────────────────────────────────────────────────────────┘
```

### Sidebar Navigation

```
┌──────────────┐
│ 🏠 Dashboard │
│ 🎙️ Record    │
│ 📚 Library   │
│ 📅 Schedule  │
│ 📊 Analytics │
│ ⚙️ Settings  │
├──────────────┤
│ 🔒 [Locked]  │  ← Encryption status
│ ☁️ [Synced]  │  ← Storage status
└──────────────┘
```

---

## Screen Designs

### 1. Dashboard (Home)

**Purpose:** Quick overview, start recording quickly

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Good morning, Dr. Smith! 👋                                │
│  ────────────────────────────────────────────────           │
│                                                             │
│  ┌─────────────────────────────────────┐                  │
│  │  🎙️  Quick Start Recording          │                  │
│  │                                      │                  │
│  │  Matter Code: [__________]  [Start] │                  │
│  │  Description: [__________]           │                  │
│  │                                      │                  │
│  │  Or select a template:               │                  │
│  │  [📋 Client Intake] [💼 Board Mtg]  │                  │
│  └─────────────────────────────────────┘                  │
│                                                             │
│  Recent Sessions                        [View All →]       │
│  ───────────────────────────────────────────────           │
│  ┌──────────────────────────────────────────┐             │
│  │ 🔒 Client Consultation - CASE-2024-047   │             │
│  │ 📅 Today, 2:30 PM  ⏱️ 45 min             │             │
│  │ ✅ Transcribed  📝 Summary ready         │             │
│  └──────────────────────────────────────────┘             │
│  ┌──────────────────────────────────────────┐             │
│  │ 🔒 Team Strategy Meeting                 │             │
│  │ 📅 Yesterday, 10:00 AM  ⏱️ 1h 23min      │             │
│  │ ✅ Transcribed  📝 Summary ready         │             │
│  └──────────────────────────────────────────┘             │
│                                                             │
│  Upcoming Scheduled                     [View All →]       │
│  ───────────────────────────────────────────────           │
│  📅 Board Meeting - Tomorrow, 9:00 AM                      │
│  📅 Client Review - Friday, 2:00 PM                        │
│                                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                     │
│  │ 142hrs  │ │ 89      │ │ 2.3TB   │                     │
│  │ Recorded│ │ Sessions│ │ Storage │                     │
│  └─────────┘ └─────────┘ └─────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

**Key Elements:**
- Large "Quick Start" section for fast recording
- Recent sessions (last 3-5) with key metadata
- Upcoming scheduled sessions
- Quick stats
- Personalized greeting
- Template quick access

---

### 2. Recording View (Active Recording)

**Purpose:** Minimal distraction during recording, clear status

**Layout - Minimized Mode:**
```
┌──────────────────────────────────────────┐
│  🔴 RECORDING                            │
│  ────────────────────────────            │
│                                          │
│  Case-2024-047                           │
│  Client Consultation                     │
│                                          │
│      ⏱️  00:23:41                        │
│                                          │
│  ╔══════════════════════════════════╗  │
│  ║  ▁▂▃▅▇█▇▅▃▂▁  ▁▂▃▅▇█▇▅▃▂▁       ║  │ ← Waveform
│  ╚══════════════════════════════════╝  │
│                                          │
│  🎤 Speaker A: "And the budget for..."  │ ← Live transcription
│                                          │
│  ┌──────┐  ┌──────┐  ┌──────┐          │
│  │ Pause │  │ Stop  │  │ Mark │          │
│  └──────┘  └──────┘  └──────┘          │
│                                          │
│  [Minimize to Tray]                     │
└──────────────────────────────────────────┘
```

**Layout - System Tray Mode:**
```
┌─────────────────────┐
│ 🔴 Recording...     │
│ 00:23:41  125.3 MB  │
│ ───────────────────  │
│ ⏸️ Pause            │
│ ⏹️ Stop & Transcribe│
│ 🔖 Bookmark         │
│ ↕️ Show Window      │
└─────────────────────┘
```

**Key Elements:**
- Prominent recording indicator (red dot pulsing)
- Large timer
- Real-time waveform visualizer
- Optional live transcription preview
- Minimal controls (pause, stop, bookmark)
- Minimize to tray option
- Session info at top
- Storage usage indicator

**States:**
- **Recording:** Red indicator, pulsing dot
- **Paused:** Yellow/amber indicator, static
- **Processing:** Blue indicator, spinner

---

### 3. Library (Session Browser)

**Purpose:** Find and manage all sessions

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Session Library                                   [+ New]  │
│  ──────────────────────────────────────────────────         │
│                                                             │
│  [🔍 Search across all sessions...]    [⚙️ Filters ▼]     │
│                                                             │
│  Filters:  [All Time ▼] [All Matters ▼] [All Tags ▼]      │
│  Sort by:  [Most Recent ▼]                                 │
│                                                             │
│  ┌─────────────────────────────────────────────┬─────────┐ │
│  │ 🔒 Client Consultation                      │ Preview │ │
│  │ CASE-2024-047                               │ ───────  │ │
│  │ 📅 Nov 15, 2025  ⏱️ 45min  👥 2 speakers   │         │ │
│  │ 🏷️ client, intake, urgent                  │ Matter: │ │
│  │                                              │ CASE-   │ │
│  │ Summary: Discussed new case strategy and... │ 2024-   │ │
│  │                                              │ 047     │ │
│  │ [📄 View] [⬇️ Export] [🗑️ Delete]           │         │ │
│  ├─────────────────────────────────────────────┤ Status: │ │
│  │ 🔒 Team Strategy Meeting                    │ ✅ Done │ │
│  │ INTERNAL-2025-003                           │         │ │
│  │ 📅 Nov 14, 2025  ⏱️ 1h23min  👥 5 speakers │ Storage:│ │
│  │ 🏷️ internal, strategy, quarterly           │ 234 MB  │ │
│  │                                              │         │ │
│  │ Summary: Q4 planning session covering...    │ Actions:│ │
│  │                                              │ 7 items │ │
│  │ [📄 View] [⬇️ Export] [🗑️ Delete]           │         │ │
│  └─────────────────────────────────────────────┴─────────┘ │
│                                                             │
│  Showing 1-25 of 142 sessions    [← 1 2 3 4 5 ... 6 →]    │
└─────────────────────────────────────────────────────────────┘
```

**Key Elements:**
- Global search bar
- Advanced filters (date, matter, tags, speaker)
- Sort options
- List view (default) with inline actions
- Preview pane (optional, can toggle off)
- Pagination or infinite scroll
- Bulk selection for batch operations
- Card view option (grid of cards)

---

### 4. Transcript Viewer

**Purpose:** Read, search, edit, and analyze transcript

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Back to Library    Client Consultation - CASE-2024-047     [⬇️ Export]│
│  ─────────────────────────────────────────────────────────────────────  │
│ ┌──────────┬───────────────────────────────────────────┬──────────────┐│
│ │ SUMMARY  │                                           │   SEARCH     ││
│ │ ────────  │  [🔍 Search transcript...]               │   ────────    ││
│ │          │                                           │              ││
│ │ 📝 Key   │  Timeline: [━━━━●━━━━━━━━] 00:23:41      │ [Search...]  ││
│ │ Points   │                                           │              ││
│ │          │  ────────────────────────────────────────  │ 🔖 Bookmarks││
│ │ • Budget │                                           │  ────────    ││
│ │   $50K   │  👤 Dr. Smith [00:00:12]                 │              ││
│ │ • Start  │  Good morning. Thank you for coming in   │ • 00:05:23   ││
│ │   date:  │  today. Let's discuss the treatment plan │   Budget     ││
│ │   Jan 15 │  we reviewed last week.                  │              ││
│ │          │                                           │ • 00:18:45   ││
│ │ 🎯       │  👤 Patient [00:00:28]                   │   Next steps ││
│ │ Actions  │  Thanks for seeing me. I've been         │              ││
│ │ ────────  │  experiencing some improvement since we  │              ││
│ │          │  last met. The new approach is working.  │ 💬 Comments  ││
│ │ • Follow │                                           │  ────────    ││
│ │   up in  │  👤 Dr. Smith [00:00:42]                 │              ││
│ │   2 wks  │  That's excellent to hear. Can you tell  │ John: Review ││
│ │          │  me more about what's been different?    │ this section ││
│ │ • Send   │                                           │              ││
│ │   summary│  [Highlighted search result: budget]     │              ││
│ │   to     │                                           │              ││
│ │   client │  👤 Patient [00:01:15]                   │              ││
│ │          │  Well, the budget you suggested of       │              ││
│ │ 🔐       │  $50,000 for the project seems           │              ││
│ │ Security │  reasonable...                            │              ││
│ │ ────────  │                                           │              ││
│ │          │  [Click any word to play audio from      │              ││
│ │ ✅ AES-  │   that point]                            │              ││
│ │ 256      │                                           │              ││
│ │ ✅ S3    │                                           │              ││
│ │ ✅ 1.2MB │                                           │              ││
│ │          │                                           │              ││
│ └──────────┴───────────────────────────────────────────┴──────────────┘│
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 🔊 ▶️ [━━━━●━━━━━━━━━━━━━━━━] 00:05:23 / 00:45:12  [🔉] [1.0x ▼]  │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key Elements:**

**Left Sidebar (200-250px):**
- AI Summary section
- Key points (bullet list)
- Action items (checklist)
- Security status
- Session metadata

**Main Content Area:**
- Search bar at top
- Timeline scrubber
- Transcript with:
  - Speaker labels (color-coded)
  - Timestamps (click to jump)
  - Highlight on search
  - Editable text (inline editing)
  - Paragraph formatting

**Right Sidebar (200-250px):**
- Search results list
- Bookmarks with thumbnails
- Comments/annotations
- Quick navigation

**Bottom Audio Player:**
- Play/pause
- Seekbar synced with transcript
- Volume control
- Playback speed (0.5x to 2x)
- Current time / total duration

**Interactions:**
- Click any word → jump to that moment in audio
- Double-click word → edit
- Right-click → context menu (bookmark, comment, redact)
- Scroll transcript → audio player follows
- Play audio → transcript auto-scrolls and highlights

---

### 5. Settings Screen

**Purpose:** Configure all app preferences

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Settings                                          [✕ Close] │
│  ──────────────────────────────────────────────────         │
│ ┌────────────┬───────────────────────────────────────────┐  │
│ │            │                                           │  │
│ │ General    │  General Settings                         │  │
│ │ Recording  │  ───────────────────────────────          │  │
│ │ Encryption │                                           │  │
│ │ Storage    │  Language: [English ▼]                   │  │
│ │ AI         │                                           │  │
│ │ Integra-   │  Theme: ◉ Auto  ○ Light  ○ Dark          │  │
│ │   tions    │                                           │  │
│ │ Advanced   │  ☑ Start on system startup               │  │
│ │            │  ☑ Minimize to system tray               │  │
│ │            │  ☐ Check for updates automatically       │  │
│ │            │                                           │  │
│ │            │  Notifications                            │  │
│ │            │  ☑ Recording started/stopped             │  │
│ │            │  ☑ Transcription complete                │  │
│ │            │  ☑ Scheduled session reminders           │  │
│ │            │                                           │  │
│ │            │  Default export format: [PDF ▼]          │  │
│ │            │                                           │  │
│ │            │  ┌──────────────────────────────────────┐│  │
│ │            │  │ [Save Changes]  [Reset to Default]  ││  │
│ │            │  └──────────────────────────────────────┘│  │
│ └────────────┴───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Settings Sections:**

**General:**
- Language selection
- Theme (auto/light/dark)
- Startup behavior
- Notifications preferences
- Default export format
- Auto-save settings

**Recording:**
- Audio source selection
- Audio quality (16/44.1/48 kHz)
- Microphone selection
- System audio routing
- Hotkey configuration
- Auto-start on meeting detection
- Silence detection threshold
- Background recording preferences

**Encryption:**
- Encryption mode (personal/matter/session)
- Passphrase management
- Hardware key setup (YubiKey)
- Key backup/recovery
- Auto-lock settings
- Biometric unlock

**Storage:**
- Storage provider selection
- AWS S3 configuration
- Azure Blob configuration
- GCP configuration
- SFTP configuration
- Local storage path
- Retention policies
- Storage usage overview

**AI:**
- AI provider (Claude/GPT-4/Local)
- API key management
- Summary preferences (length, style)
- Custom prompts
- Language detection
- Custom vocabulary
- Speaker identification

**Integrations:**
- Calendar sync (Outlook/Google/Apple)
- CRM connections (Salesforce/HubSpot)
- Project management (Asana/Monday)
- SSO configuration
- Webhook URLs

**Advanced:**
- Debug mode
- Log file location
- Cache management
- Performance tuning
- Experimental features
- Data export/import

---

### 6. Export Dialog

**Purpose:** Flexible export with preview

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Export Session: CASE-2024-047                     [✕ Close]│
│  ──────────────────────────────────────────────────         │
│                                                             │
│  Select Format:                                             │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐              │
│  │  PDF   │ │ DOCX   │ │  TXT   │ │  JSON  │              │
│  │ [📄]   │ │ [📝]   │ │ [📋]   │ │ [{ }]  │              │
│  │ ✓      │ │        │ │        │ │        │              │
│  └────────┘ └────────┘ └────────┘ └────────┘              │
│                                                             │
│  Include:                                                   │
│  ☑ Summary                                                 │
│  ☑ Action Items                                            │
│  ☑ Full Transcript                                         │
│  ☑ Timestamps                                              │
│  ☐ Audio File (encrypted)                                  │
│  ☐ Comments                                                │
│                                                             │
│  PDF Options:                                               │
│  ☑ Include cover page                                      │
│  ☑ Include table of contents                               │
│  ☐ Include company logo                                    │
│  ☐ Redact sensitive information (auto-detect)              │
│                                                             │
│  Template: [Professional Report ▼]                         │
│                                                             │
│  Security:                                                  │
│  ☐ Password protect (recommended)                          │
│  Password: [__________]                                     │
│                                                             │
│  Preview:                                                   │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ [Preview of export]                                  │  │
│  │                                                       │  │
│  │ Client Consultation                                   │  │
│  │ CASE-2024-047                                         │  │
│  │ November 15, 2025                                     │  │
│  │                                                       │  │
│  │ Executive Summary                                     │  │
│  │ This consultation covered...                          │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  Save to: [~/Downloads/CASE-2024-047.pdf] [Browse...]     │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ [Cancel]                      [Export] │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Visual format selection
- Detailed include/exclude options
- Format-specific options
- Template selection
- Security options (password protection)
- Live preview
- Custom save location
- Batch export option (when multiple selected)

---

## Interactions & Animations

### Microinteractions

**Recording Start:**
1. Button changes from "Start" to pulsing red dot
2. Gentle haptic feedback (if supported)
3. Waveform animates in
4. Timer counts up smoothly
5. System tray icon updates

**Transcription Complete:**
1. Desktop notification appears
2. Success sound plays (optional)
3. Session card updates with ✅ checkmark
4. Brief green flash on session row

**Search:**
1. As you type, results filter in real-time
2. Highlighted text fades in yellow
3. Result count updates
4. Smooth scroll to first result

**Audio Playback:**
1. Click word → smooth scroll to position
2. Audio plays with fade-in
3. Current word highlights in blue
4. Auto-scroll follows audio

### Transitions

**Screen Changes:**
- Smooth fade transitions (200ms)
- No jarring cuts
- Breadcrumb trail shows where you are

**Modals/Dialogs:**
- Gentle scale-up animation
- Background dims (overlay)
- Focus trapped in modal

**Loading States:**
- Skeleton screens (not just spinners)
- Progressive loading
- Show partial results immediately

---

## Accessibility Features

### Keyboard Navigation

**Global Shortcuts:**
- `Ctrl/Cmd + N` - New recording
- `Ctrl/Cmd + L` - Go to library
- `Ctrl/Cmd + F` - Focus search
- `Ctrl/Cmd + ,` - Open settings
- `Ctrl/Cmd + W` - Close window/tab
- `Ctrl/Cmd + Q` - Quit app

**Recording Shortcuts:**
- `Ctrl/Cmd + R` - Start/stop recording
- `Ctrl/Cmd + P` - Pause/resume
- `Ctrl/Cmd + B` - Add bookmark
- `Ctrl/Cmd + M` - Mute microphone

**Transcript Shortcuts:**
- `Space` - Play/pause audio
- `←/→` - Rewind/forward 5 seconds
- `Ctrl/Cmd + F` - Search transcript
- `F3` / `Ctrl/Cmd + G` - Next search result
- `Shift + F3` / `Ctrl/Cmd + Shift + G` - Previous result

### Screen Reader Support

- Proper ARIA labels on all interactive elements
- Live regions for status updates
- Descriptive alt text
- Semantic HTML structure
- Focus management

### Visual Accessibility

- WCAG 2.1 AA contrast ratios (4.5:1 text, 3:1 UI)
- High contrast mode support
- Font size adjustment (100% to 200%)
- No color-only information
- Motion can be disabled (respects prefers-reduced-motion)

---

## Platform-Specific Adaptations

### Windows
- Fluent Design elements (acrylic blur, shadows)
- Native window controls (minimize, maximize, close)
- Windows notifications
- File explorer integration
- Right-click context menus

### macOS
- Native window chrome (traffic lights)
- Menu bar integration
- Touch Bar support (if available)
- macOS notifications
- Finder integration
- System preferences integration

### Linux
- Adapts to GTK or Qt themes
- System tray integration
- Native file picker
- Desktop notifications (libnotify)

---

## Dark Mode

**Auto-switching:**
- Follows system preference by default
- Manual override available
- Smooth transition between modes

**Dark Mode Colors:**
- Deep backgrounds (not pure black)
- Reduced contrast (easier on eyes)
- Color-shifted UI elements
- Blue light reduction for night use

---

## Responsive Design

**Window Sizes:**

**Minimum:** 1024x768 (supports older displays)

**Optimal:** 1440x900 or larger

**Responsive Breakpoints:**
- < 1200px: Hide right sidebar, make it toggleable
- < 1000px: Collapse left sidebar to icons only
- < 800px: Stack elements vertically

**Panels can resize:**
- Draggable splitters between panes
- Panes remember size preferences
- Double-click splitter to reset

---

## Error States

### Network Errors
```
┌─────────────────────────────────────┐
│ ⚠️  Connection Error                │
│                                     │
│ Unable to sync with cloud storage.  │
│ Your recording is saved locally.    │
│                                     │
│ [Retry Now]  [Work Offline]        │
└─────────────────────────────────────┘
```

### Storage Errors
```
┌─────────────────────────────────────┐
│ ⚠️  Low Disk Space                  │
│                                     │
│ Only 2GB remaining on disk.         │
│ Recording may stop automatically.   │
│                                     │
│ [Free Up Space]  [Continue Anyway] │
└─────────────────────────────────────┘
```

### Authentication Errors
```
┌─────────────────────────────────────┐
│ 🔐 Session Locked                   │
│                                     │
│ Enter your passphrase to continue.  │
│                                     │
│ Passphrase: [__________]            │
│                                     │
│ [Unlock]  [Forgot Passphrase?]     │
└─────────────────────────────────────┘
```

---

## Empty States

### No Sessions Yet
```
┌─────────────────────────────────────┐
│         📚                          │
│   No sessions yet                   │
│                                     │
│   Start your first recording to     │
│   see it appear here.               │
│                                     │
│   [🎙️ Start Recording]             │
└─────────────────────────────────────┘
```

### No Search Results
```
┌─────────────────────────────────────┐
│         🔍                          │
│   No results for "budget"           │
│                                     │
│   Try different keywords or         │
│   adjust your filters.              │
│                                     │
│   [Clear Search]                    │
└─────────────────────────────────────┘
```

---

## Visual Indicators

### Encryption Status (Always Visible)

**Status Bar (Bottom):**
```
🔒 AES-256 Encrypted  |  ☁️ Synced to AWS S3  |  💾 234 MB / 1TB used
```

### Recording Status

**Active Recording:**
```
🔴 RECORDING  00:23:41  [Visual pulse animation]
```

**Paused:**
```
⏸️ PAUSED  00:23:41
```

**Processing:**
```
⚙️ TRANSCRIBING...  [Progress bar]
```

---

## Onboarding Experience

### First Launch

**Welcome Screen:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│              Welcome to VaultScribe! 👋                     │
│                                                             │
│   Zero-knowledge meeting intelligence for everyone          │
│                                                             │
│   ┌───────────────────────────────────────────────────┐   │
│   │ 🔒 Your data stays encrypted and private         │   │
│   │ ☁️ You control where it's stored                 │   │
│   │ 🎯 AI-powered summaries and action items         │   │
│   └───────────────────────────────────────────────────┘   │
│                                                             │
│   Let's get you set up (takes 2 minutes)                   │
│                                                             │
│   [Get Started →]                                          │
│                                                             │
│   Already have an account? [Sign In]                       │
└─────────────────────────────────────────────────────────────┘
```

**Setup Wizard (5 steps):**

1. **Account Creation** (if cloud sync)
2. **Storage Selection** (AWS/Azure/GCP/Local)
3. **Encryption Setup** (passphrase)
4. **API Keys** (AssemblyAI, Anthropic)
5. **Test Recording** (verify audio works)

Each step has:
- Clear title
- Explanation of why needed
- "Skip for now" option (where appropriate)
- Progress indicator (Step 2 of 5)

---

**This is the complete UI/UX design for VaultScribe Electron - professional, accessible, and privacy-first.**
