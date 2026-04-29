# KingstonConnect AI — Complete Production Blueprint

> **Your College, Smarter.**
> A full-stack college management super-app for Kingston Engineering College — built as a React PWA, delivered as a Google Play TWA, powered by Gemini 2.5 Flash.

## Quick Start

### Live Firebase development

```bash
npm install
cp .env.example .env.local
npm run dev
```

- Fill in every `VITE_FIREBASE_*` value in `.env.local`, including `VITE_FIREBASE_APP_ID`.
- Keep `VITE_USE_EMULATORS=false` unless you are actively running the local Firebase Emulator Suite.

### Local emulator development

```bash
npm install
cp .env.example .env.local
npm run dev:emu
npm run dev
```

- Set `VITE_USE_EMULATORS=true` in `.env.local` only when `npm run dev:emu` is running.
- Optional emulators stay separate: set `VITE_USE_FUNCTIONS_EMULATOR=true` and/or `VITE_USE_STORAGE_EMULATOR=true` when you need them.
- The frontend now falls back to live Firebase automatically if the Auth and Firestore emulators are not reachable, which avoids the `127.0.0.1:9099` token refresh loop shown in the browser console.

---

## Table of Contents

1. [Project Identity](#1-project-identity)
2. [Tech Stack](#2-tech-stack)
3. [User Roles & Access Matrix](#3-user-roles--access-matrix)
4. [Authentication Flow](#4-authentication-flow)
5. [Firestore Database Schema](#5-firestore-database-schema)
6. [Firebase Storage Structure](#6-firebase-storage-structure)
7. [Cloud Functions Master List](#7-cloud-functions-master-list)
8. [Screens & Features — Full Detail](#8-screens--features--full-detail)
   - 8.1 Dashboard
   - 8.2 StudyGPT (AI Chat)
   - 8.3 Attendance
   - 8.4 Results
   - 8.5 Calendar
   - 8.6 Timetable
   - 8.7 Chat
   - 8.8 Announcements
   - 8.9 Leave Application *(New)*
   - 8.10 Achievement Board *(New)*
   - 8.11 Event Registration *(New)*
   - 8.12 Settings & Personalisation *(Expanded)*
   - 8.13 Admin Panel
9. [AI Personalisation Logic](#9-ai-personalisation-logic)
10. [Settings & Customisation — Full Catalogue](#10-settings--customisation--full-catalogue)
11. [Notifications (FCM)](#11-notifications-fcm)
12. [Security Rules Summary](#12-security-rules-summary)
13. [PWA → TWA → Play Store Flow](#13-pwa--twa--play-store-flow)
14. [Build Order](#14-build-order)
15. [Cost Breakdown](#15-cost-breakdown)
16. [Folder Structure](#16-folder-structure)

---

## 1. Project Identity

| Field | Value |
|---|---|
| **App Name** | KingstonConnect AI |
| **Package ID** | com.kingstonconnect.ai |
| **Tagline** | Your College, Smarter. |
| **Primary Color** | KEC Blue `#1E3A8A` |
| **Accent Color** | Gold `#F59E0B` |
| **Fonts** | Inter (English) + Noto Sans Tamil (Regional) |
| **Delivery** | React PWA → Bubblewrap TWA → Google Play Store |
| **AI Model** | Gemini 2.5 Flash (BYOK per user) |

---

## 2. Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Frontend | React + Vite PWA | Fast builds, TWA-compatible, offline support |
| Hosting | Firebase Hosting | Free HTTPS, auto CDN, custom domain ready |
| Database | Firebase Firestore | Real-time listeners, document model, generous free tier |
| File Storage | Firebase Storage (Blaze) | PDF + image upload, lifecycle cleanup rules |
| Auth | Firebase Auth | Email + Phone OTP, multi-role, secure |
| Backend Logic | Firebase Cloud Functions | Secure Gemini calls, admin operations, no exposed keys |
| AI | Gemini 2.5 Flash (BYOK) | Multilingual, inline PDF context, personalised |
| App Package | Bubblewrap TWA → AAB | Play Store submission, native feel on Android |
| Push Notifications | Firebase Cloud Messaging (FCM) | Real-time push across devices |
| Analytics | Firebase Analytics | Usage insights for Admin |

---

## 3. User Roles & Access Matrix

### Student
- View own personalised dashboard (attendance %, scores, upcoming events)
- StudyGPT — section-scoped, personalised AI with full academic context
- View class timetable, section announcements, college-wide announcements
- Calendar — public events, section test dates, personal private events
- P2P chat, class group chat, cross-role chat with teachers
- Dedicated AI chat tab inside the Chat section
- Submit leave applications with reason and date range
- View leave status (pending / approved / rejected)
- Post achievements on the Achievement Board (certifications, projects, wins)
- Register for college events and workshops
- Full Settings & Personalisation panel

### Teacher
- Everything in Student
- Upload PDFs/notes to owned classes and subjects (select from assigned sections)
- Mark attendance manually per student per day, per subject
- Create named tests, enter marks per student per subject
- Post section-scoped announcements
- Mark test dates on calendar for their sections
- View all students in their sections
- Approve or reject student leave applications for their class
- Post achievements on the Achievement Board
- Create and post college events for their sections
- P2P + group chat with students and other teachers
- Full Settings & Personalisation panel

### HOD (Head of Department)
- Everything in Teacher
- View all sections and teachers under their department
- Upload timetable images for any section in their department
- Post college-wide announcements
- Mark holidays on calendar visible to all
- Approve teacher section assignments under their department
- View department-wide results and attendance overview
- Override leave approvals within their department
- Post and pin achievements on the Achievement Board
- Post department-wide events for registration
- Full Settings & Personalisation panel

### Principal (Admin)
- Everything in HOD across all departments
- Approve all new signups, assign roles, department, year, section
- Post college-wide announcements
- Mark college holidays on calendar
- View Firebase Storage monitor card
- View college-wide analytics on Dashboard
- Manage any user account (suspend, reassign role, reset)
- View and export leave application reports
- Pin top achievements on Achievement Board
- View event registration headcount across all events
- Full Settings & Personalisation panel

---

## 4. Authentication Flow

```
User opens app
  → Sign up with college email OR phone OTP
  → Account created with status: "pending"
  → Admin sees new signup request in their dashboard
  → Admin approves → assigns Role + Department + Year + Section
  → User gets push notification → gains full access based on role
  → Section group chat auto-created if not exists
```

### BYOK Gemini API Key Flow

```
User opens Settings → AI Settings → Enter Gemini API Key
  → Key sent to Cloud Function (HTTPS callable, auth required)
  → Cloud Function AES-256 encrypts the key
  → Encrypted key stored in users/{userId}.encryptedGeminiKey
  → Key NEVER returned to frontend again
  → On each StudyGPT call, Cloud Function decrypts at call time only
  → User can delete/replace key at any time from Settings
```

---

## 5. Firestore Database Schema

### `users/{userId}`
```
name: string
email: string
phone: string
role: "student" | "teacher" | "hod" | "principal"
department: string
year: string          // "1" | "2" | "3" | "4"
section: string       // "A" | "B" | "C"
registerNumber: string
encryptedGeminiKey: string
approvalStatus: "pending" | "approved" | "suspended"
fcmToken: string
profilePhotoURL: string
createdAt: timestamp
lastActive: timestamp
preferences: {
  theme: "light" | "dark" | "system"
  accentColor: string        // hex code
  fontSize: "small" | "medium" | "large"
  language: "en" | "ta"
  notificationsEnabled: boolean
  notificationTypes: map     // per-type toggles
  chatBubbleStyle: "modern" | "classic" | "minimal"
  dashboardLayout: "grid" | "list"
  calendarStartDay: "sun" | "mon"
  compactMode: boolean
  aiResponseLanguage: "auto" | "en" | "ta"
  showAttendanceWarning: boolean
  attendanceWarningThreshold: number  // default 75
  studyGptPersonality: "formal" | "friendly" | "tutor"
  showAchievementsOnDashboard: boolean
}
```

### `notes/{noteId}`
```
title: string
subject: string
department: string
year: string
section: string
uploadedBy: userId
fileURL: string
fileSize: number
mimeType: "application/pdf" | "image/jpeg" | "image/png"
uploadedAt: timestamp
description: string
tags: string[]
downloadCount: number
```

### `attendance/{recordId}`
```
studentId: userId
classId: string   // "{dept}-{year}-{section}"
date: string      // "YYYY-MM-DD"
subject: string
status: "present" | "absent" | "leave"
markedBy: userId
timestamp: timestamp
leaveRef: leaveId | null   // links to approved leave if status = "leave"
```

### `results/{resultId}`
```
testName: string           // e.g. "Unit Test 1 — May 2026"
subject: string
teacherId: userId
classId: string
marksMap: { [studentId]: number }
maxMarks: number
createdAt: timestamp
lockedBy: userId | null    // HOD locks to prevent editing
lockedAt: timestamp | null
```

### `announcements/{announcementId}`
```
title: string
body: string
postedBy: userId
posterRole: string
scope: "section" | "college-wide"
targetDept: string | null
targetYear: string | null
targetSection: string | null
timestamp: timestamp
readBy: string[]
attachmentURL: string | null
pinned: boolean
```

### `calendar/{eventId}`
```
title: string
type: "test" | "holiday" | "personal" | "event"
createdBy: userId
visibility: "public" | "section" | "personal"
targetSection: string | null
date: string
endDate: string | null
description: string
relatedEventId: string | null   // links to event registration if type = "event"
```

### `timetable/{timetableId}`
```
department: string
year: string
section: string
imageURL: string
uploadedBy: userId
validFrom: timestamp
uploadedAt: timestamp
```

### `chats/p2p/{chatId}/messages/{messageId}`
```
senderId: userId
receiverId: userId
text: string
timestamp: timestamp
read: boolean
deletedFor: string[]
```

### `chats/groups/{groupId}`
```
// Group metadata document
groupName: string
classId: string
members: userId[]
createdAt: timestamp
createdBy: userId
type: "section" | "department" | "custom"
```

### `chats/groups/{groupId}/messages/{messageId}`
```
senderId: userId
text: string
timestamp: timestamp
readBy: string[]
```

### `leaveApplications/{leaveId}`
```
studentId: userId
teacherId: userId
classId: string
fromDate: string
toDate: string
reason: string
type: "medical" | "personal" | "event" | "other"
status: "pending" | "approved" | "rejected"
appliedAt: timestamp
reviewedAt: timestamp | null
reviewedBy: userId | null
reviewNote: string | null
attachmentURL: string | null   // optional medical certificate etc.
daysCount: number
autoReflected: boolean         // true once attendance is updated
```

### `achievements/{achievementId}`
```
postedBy: userId
posterName: string
posterRole: string
department: string
title: string
description: string
category: "certification" | "competition" | "project" | "publication" | "sports" | "other"
imageURL: string | null
externalLink: string | null
likes: string[]             // array of userIds
timestamp: timestamp
pinned: boolean
approved: boolean           // HOD/Principal can pin/feature
```

### `events/{eventId}`
```
title: string
description: string
createdBy: userId
scope: "section" | "department" | "college-wide"
targetDept: string | null
targetSection: string | null
date: string
time: string
venue: string
maxCapacity: number | null
registrations: string[]     // array of userIds
registrationDeadline: string
attachmentURL: string | null
category: "workshop" | "symposium" | "seminar" | "cultural" | "sports" | "other"
status: "upcoming" | "ongoing" | "completed" | "cancelled"
calendarEventId: string     // linked calendar entry
createdAt: timestamp
```

### `system/storage`
```
usedMB: number
fileCount: number
lastCleanupAt: timestamp
lastCheckedAt: timestamp
```

---

## 6. Firebase Storage Structure

```
/notes/{dept}/{year}/{section}/{subject}/{filename}
/timetables/{dept}/{year}/{section}/{filename}
/announcements/{announcementId}/{filename}
/profile-photos/{userId}/{filename}
/leave-attachments/{leaveId}/{filename}
/achievement-images/{achievementId}/{filename}
/event-attachments/{eventId}/{filename}
/temp-cache/   ← auto-deleted every 90 days via Lifecycle Rule
```

**Lifecycle Rules:**
- Files in `/notes/` older than 90 days → auto-deleted
- Files in `/temp-cache/` older than 90 days → auto-deleted
- Cloud Function runs every 6 hours: if total Storage exceeds 4 GB, it deletes the oldest 20 files and logs to `system/storage`

---

## 7. Cloud Functions Master List

| Function | Trigger | What It Does |
|---|---|---|
| `onUserSignup` | Auth onCreate | Creates user doc with `pending` status, sends admin notification |
| `approveUser` | HTTPS callable | Admin approves signup, assigns role/dept/year/section, sends welcome push |
| `suspendUser` | HTTPS callable | Admin suspends account, revokes FCM token |
| `encryptApiKey` | HTTPS callable | AES-256 encrypts user Gemini key before storing |
| `callGemini` | HTTPS callable | Decrypts key, builds context, calls Gemini 2.5 Flash |
| `buildAIContext` | Called by callGemini | Pulls attendance, results, calendar, notes, leave status into prompt |
| `fetchPDFContext` | Called by callGemini | Downloads section PDF from Storage, sends inline to Gemini |
| `storageMonitor` | Scheduled every 6 hrs | Checks Storage size, auto-cleans if over 4 GB, updates system/storage |
| `sendNotification` | Firestore trigger | Sends FCM push on new announcement, chat message, event, leave update |
| `createSectionGroups` | Called on user approve | Auto-creates section group chat if not exists |
| `onLeaveApply` | Firestore onCreate (leaves) | Notifies teacher of new leave request |
| `onLeaveReview` | Firestore onUpdate (leaves) | Notifies student of approval/rejection; if approved, creates leave-status attendance record |
| `autoReflectLeave` | Called by onLeaveReview | Sets attendance status to "leave" for approved date range, links leaveRef |
| `onNewAchievement` | Firestore onCreate (achievements) | Notifies section/college of new achievement post |
| `onEventRegistration` | Firestore onUpdate (events) | Confirms registration to student, updates headcount for organiser |
| `exportLeaveReport` | HTTPS callable (Admin) | Aggregates leave records into downloadable JSON/CSV |

---

## 8. Screens & Features — Full Detail

### 8.1 Dashboard

**All roles** see a role-personalised home screen on login.

**Student Dashboard cards:**
- Attendance % — overall and subject-wise. Warning banner if below the threshold set in Settings (default 75%).
- Next 3 upcoming calendar events (tests, holidays, registered events)
- Latest 2 unread announcements with badge
- Unread chat message count badge
- Pending leave application status chip
- Quick-link grid to all 11 sections (icons + labels)
- Achievement Board preview — last 2 posts from their section
- "Ask StudyGPT" shortcut button

**Teacher Dashboard adds:**
- Attendance marking reminder for today if not marked
- Pending leave application review count badge
- Event registration headcount for their events

**HOD Dashboard adds:**
- Department-wide attendance heatmap (section-wise, colour-coded)
- Department-wide average scores per subject
- Pending teacher section approval count

**Principal Dashboard adds:**
- Firebase Storage usage progress bar (used / 5 GB free)
- College-wide analytics: total students, teachers, departments
- Pending signup approvals count badge
- Total event registrations this month
- System health indicators

---

### 8.2 StudyGPT (AI Chat)

Separate from the normal peer chat. Full academic intelligence in one conversation window.

**How it works:**
1. Student types a question in any language (English or Tamil)
2. Cloud Function builds their full personalised context packet (see Section 9)
3. Gemini 2.5 Flash reads the context + the user's section PDFs inline from Storage
4. Reply appears in the same language the user wrote in
5. Conversation history is preserved in the session (not stored in Firestore — privacy)

**Features:**
- Typing indicator while Gemini is processing
- Copy-to-clipboard on any response
- Regenerate last response button
- Clear conversation button
- Toggle context on/off (send question without academic context for general Q&A)
- AI Personality selection from Settings: Formal / Friendly / Tutor (changes system prompt tone)
- AI Response Language override from Settings: Auto / English / Tamil

---

### 8.3 Attendance

**Student view:**
- Monthly calendar view with colour-coded cells: green (present), red (absent), blue (leave), grey (no class)
- Running overall % and subject-wise % cards
- Warning banner if any subject drops below threshold
- Download attendance report button (PDF summary via Cloud Function)

**Teacher view:**
- Date picker + subject selector
- Class roster list — tap each student to toggle Present / Absent
- Bulk action: "Mark all present" then manually flip absentees
- Submit for selected date — locked after submission (editable only before 11:59 PM same day)
- Past records view with filter by date, subject, student

**HOD / Principal view:**
- Section-wise attendance % overview table
- Filter by department, year, section, subject, date range
- Individual student drill-down
- Export report button

---

### 8.4 Results

**Student view:**
- Chronological list of all tests, grouped by subject
- Each card shows: Test Name, Subject, Marks Obtained, Max Marks, Percentage, Grade indicator
- Average score per subject summary

**Teacher view:**
- "Create New Test" form: enter test name, subject, max marks
- Student roster — enter score per student, validate (cannot exceed max marks)
- Edit button available until HOD locks the test
- View all tests created, sorted by date

**HOD / Principal view:**
- Department-wide results matrix — rows are students, columns are tests
- Class average and rank per test
- Lock test button (prevents further teacher edits)
- Export results as CSV

---

### 8.5 Calendar

Single unified calendar view rendering three event types simultaneously.

**Event types:**
- 🔴 **Public events** — holidays (HOD/Principal), test dates (Teacher) — visible to scope
- 🟡 **Section events** — workshops, events linked to Event Registration
- 🔵 **Personal events** — created by the user, only they see them

**Interactions:**
- Tap any date → bottom sheet shows all events for that date
- Long press a date → quick "Add personal event" if you're a student
- Teachers see "Add test date" option when tapping a date
- HOD/Principal see "Mark holiday" option
- Filter toggle: show/hide personal events, show/hide test dates, show/hide holidays

---

### 8.6 Timetable

**Upload side (Teacher / HOD):**
- Select department, year, section from dropdowns
- Upload image (JPG/PNG) or PDF of timetable
- Set "Valid from" date
- Old timetable archived, not deleted, accessible from history

**View side (Student / Teacher):**
- Full-screen image display of latest timetable for their section
- Pinch-to-zoom, double-tap to reset zoom
- "Share timetable" native share sheet
- Tap to see upload date and uploaded-by name

---

### 8.7 Chat

Three clearly tabbed sections inside one screen.

**P2P Tab:**
- Search bar: search by name, register number, role
- Start a conversation — Firestore real-time listener
- Online/offline indicator (last active timestamp from users doc)
- Message read receipts (✓ sent, ✓✓ read)
- Long press message → delete for me / delete for everyone (own messages only)
- Image sharing (stored in Firebase Storage)

**Groups Tab:**
- Auto-created group per section on first user approval (e.g. "CSE 2A")
- Department groups optionally created by HOD
- Custom groups created by Teachers for project teams, etc.
- Unread count badge per group
- Group info sheet: member list, add/remove members (Teacher/HOD only)

**AI Tab:**
- Identical to the StudyGPT screen — a secondary access point
- Maintains its own session separate from the main StudyGPT tab

---

### 8.8 Announcements

**View (all roles):**
- Feed sorted by newest first
- College-wide posts have a 📢 badge
- Section-scoped posts visible only to that section
- Unread posts highlighted with a blue left border
- Tap to expand full announcement body
- Attachment opens in-app PDF/image viewer

**Post (Teacher / HOD / Principal):**
- Title + body text area
- Scope selector: own section(s) vs college-wide (HOD/Principal only)
- Optional file attachment (PDF or image)
- Pin announcement (HOD/Principal)
- After posting, all users in scope receive FCM push notification

---

### 8.9 Leave Application *(New Feature)*

Full leave management workflow replacing paper/WhatsApp-based requests.

**Student flow:**
1. Open Leave Application from the sidebar / Dashboard quick-link
2. Tap "Apply for Leave"
3. Fill form:
   - Date range (from / to date picker)
   - Leave type: Medical / Personal / Event / Other
   - Reason text area
   - Optional attachment (medical certificate, etc.)
4. Submit → status card shows "Pending" with teacher name
5. Push notification when teacher reviews

**Teacher flow:**
1. Dashboard shows "X pending leave requests" badge
2. Leave Requests tab inside the Attendance screen or standalone panel
3. Each card shows: Student name, date range, type, reason, attachment link, days count
4. Approve or Reject with optional review note
5. On Approve → Cloud Function auto-updates attendance records for that date range with status "leave" + leaveRef linkage
6. Student attendance percentage recalculates — leave days are excluded from shortage calculation (configurable in Settings by HOD)

**HOD / Principal view:**
- Department-wide leave log
- Filter by student, date range, type, status
- Override teacher decisions
- Export leave report (Cloud Function generates CSV)

**Leave types and their attendance impact:**
- Medical Leave → excluded from attendance % denominator (if HOD setting is enabled)
- Personal Leave → counted as absent unless teacher decides otherwise
- Event Leave (for college events) → excluded automatically if linked to an approved event registration

---

### 8.10 Achievement Board *(New Feature)*

A social wall for academic and extracurricular achievements — builds college community.

**Posting (all roles):**
1. Tap the ✚ button on the Achievement Board screen
2. Fill:
   - Title (e.g. "AWS Certified Developer")
   - Category: Certification / Competition / Project / Publication / Sports / Other
   - Description
   - Optional image (certificate photo, project screenshot)
   - Optional external link
3. Post → visible to all users in the college
4. Section-mates get a push notification

**Feed view:**
- Chronological feed, newest first
- Filter by category, department, date range
- Like button (heart) with count — stores userId in `likes` array
- Share button — native share sheet
- Pinned posts (set by HOD/Principal) always appear at the top

**HOD / Principal moderation:**
- Can pin/unpin any achievement post
- Can delete inappropriate posts

**Dashboard integration:**
- Last 2 posts from the user's own section shown on Dashboard (toggle in Settings)

---

### 8.11 Event Registration *(New Feature)*

Replaces Google Forms for internal college event signups.

**Creating an event (Teacher / HOD / Principal):**
1. Open Events from the sidebar
2. Tap "Create Event"
3. Fill form:
   - Title, description, category (Workshop / Symposium / Seminar / Cultural / Sports / Other)
   - Date, time, venue
   - Scope: section / department / college-wide
   - Optional max capacity (app shows "X slots left")
   - Registration deadline
   - Optional attachment (brochure PDF)
4. Create → auto-generates a linked calendar entry (yellow dot on Calendar screen)
5. All users in scope receive a push notification

**Student registration:**
1. Browse Events in the Events screen or via Calendar
2. Tap an event → see full details, capacity left, deadline
3. Tap "Register" → confirmed instantly
4. Push notification confirms registration
5. Event appears on their Calendar as a personal entry
6. If leave is required for the event → leave application auto-drafts with event title as reason

**Admin / Organiser view:**
- Live headcount: "Registered: 43 / 100"
- Registered student list (name, register number, department)
- Export headcount as CSV
- Edit event details (except date once students have registered — requires confirmation dialog)
- Cancel event → all registered students notified via push

---

### 8.12 Settings & Personalisation *(Fully Expanded)*

See full catalogue in [Section 10](#10-settings--customisation--full-catalogue).

---

### 8.13 Admin Panel

Accessible only by Principal role.

**Tabs inside Admin Panel:**
- **User Management:** View all users, filter by role/dept/year/section, approve/reject pending signups, assign or reassign roles, suspend accounts
- **Storage Monitor:** Firebase Storage usage progress bar, file count, last cleanup timestamp, manual "Clean now" button
- **Analytics:** Total users by role, active users (last 7 days), most-used features, announcement read rates
- **Leave Reports:** Export college-wide leave data as CSV
- **Event Reports:** All events, headcounts, export
- **System Logs:** Last 50 Cloud Function executions with status

---

## 9. AI Personalisation Logic

Every StudyGPT query triggers `callGemini`, which calls `buildAIContext` to construct a structured prompt before sending to Gemini 2.5 Flash. The context packet contains:

```
SYSTEM:
You are KingstonConnect AI, a personalised academic assistant for {student name},
a {year} year {department} student at Kingston Engineering College, Section {section}.
Respond in the same language the student used to ask their question.
Personality: {studyGptPersonality from Settings}.

STUDENT CONTEXT:
- Overall Attendance: {overall %}
- Subject-wise Attendance: { subject: % }
- Last 3 Test Scores: [ { test, subject, score/max } ]
- Leave Status: { pending: X days, approved: Y days this month }
- Upcoming Calendar Events (next 7 days): [ event list ]
- Latest Announcements: [ last 2 for their section ]
- Registered Events: [ upcoming event registrations ]

SECTION NOTES:
{inline PDF content of their section's uploaded notes for the relevant subject}

USER QUESTION:
{the student's message}
```

Gemini reads the PDF notes inline from Storage — no re-uploading ever. Notes stay in Storage, fetched fresh per query by `fetchPDFContext`. Chat history is never sent to Gemini (privacy-first design). Responses are streamed back to the frontend via the Cloud Function response stream.

---

## 10. Settings & Customisation — Full Catalogue

The Settings screen is divided into sections. All preferences are stored in `users/{userId}.preferences` in Firestore and sync across devices instantly.

---

### 🎨 Appearance

| Setting | Options | Default | Notes |
|---|---|---|---|
| Theme | Light / Dark / System | System | System follows device OS preference |
| Accent Color | 8 preset swatches + custom hex picker | KEC Gold `#F59E0B` | Changes buttons, active tabs, highlights |
| Font Size | Small / Medium / Large | Medium | Scales all body text, not headers |
| Compact Mode | On / Off | Off | Reduces card padding and list item height |
| Dashboard Layout | Grid / List | Grid | Grid = icon tiles; List = label rows |
| Font Family | Inter / Noto Sans / System Default | Inter | Affects entire app |

**Dark Mode specifics:**
- Background: `#0F172A` (deep navy, not pure black — easier on eyes)
- Card surface: `#1E293B`
- Text primary: `#F1F5F9`
- Text secondary: `#94A3B8`
- Accent colors remain the same
- All icons use adaptive fill/stroke
- Calendar event dots — same colours, brighter tints
- Chat bubbles — sender: KEC Blue dark variant; receiver: surface card

---

### 🌐 Language & Region

| Setting | Options | Default |
|---|---|---|
| App Language | English / Tamil | English |
| AI Response Language | Auto-detect / Always English / Always Tamil | Auto-detect |
| Calendar Start Day | Sunday / Monday | Sunday |
| Date Format | DD/MM/YYYY / MM/DD/YYYY | DD/MM/YYYY |
| Time Format | 12-hour / 24-hour | 12-hour |

---

### 🤖 AI / StudyGPT Settings

| Setting | Options | Default | Notes |
|---|---|---|---|
| AI Personality | Formal / Friendly / Tutor | Friendly | Changes system prompt tone |
| Include Attendance in Context | On / Off | On | Toggle sending attendance to Gemini |
| Include Results in Context | On / Off | On | Toggle sending test scores to Gemini |
| Include Notes in Context | On / Off | On | Toggle sending section PDFs to Gemini |
| Include Calendar in Context | On / Off | On | Toggle sending upcoming events to Gemini |
| Gemini API Key | Text input (masked) | None | BYOK — encrypted and stored server-side |
| Clear API Key | Button | — | Removes encrypted key from Firestore |
| AI Chat Bubble Style | Modern / Classic / Minimal | Modern | Changes message bubble shape/shadow |

---

### 🔔 Notifications

| Notification Type | Toggle | Default |
|---|---|---|
| New Announcements | On / Off | On |
| New Chat Messages (P2P) | On / Off | On |
| New Group Messages | On / Off | On |
| New Test Results Posted | On / Off | On |
| New Notes Uploaded | On / Off | On |
| Leave Application Update | On / Off | On |
| Event Registration Confirmation | On / Off | On |
| New Achievement Board Post | On / Off | On |
| New Event Posted | On / Off | On |
| Calendar Test Date Reminder | On / Off | On |
| Test Date Reminder Lead Time | 1 day / 3 days / 1 week | 1 day | FCM scheduled message |
| Quiet Hours | Time range picker | Off | No push during selected hours |

---

### 📊 Attendance & Academic

| Setting | Options | Default | Notes |
|---|---|---|---|
| Show Attendance Warning Banner | On / Off | On | Appears on Dashboard if below threshold |
| Attendance Warning Threshold | Slider 50%–85% | 75% | Personalise the red-zone |
| Show Subject-wise Attendance | On / Off | On | On/off breakdown in Attendance screen |
| Show Achievement Board on Dashboard | On / Off | On | Preview widget on home |
| Show Upcoming Events on Dashboard | On / Off | On | Preview widget on home |

---

### 💬 Chat

| Setting | Options | Default |
|---|---|---|
| Chat Bubble Style | Modern (rounded) / Classic (square) / Minimal (flat) | Modern |
| Show Read Receipts | On / Off | On |
| Show Online Status | On / Off | On |
| Message Preview in Notification | On / Off | On |
| Auto-download Images in Chat | Wi-Fi Only / Always / Never | Wi-Fi Only |

---

### 🔒 Privacy & Security

| Setting | Options | Default |
|---|---|---|
| Show Last Active Status | Everyone / Only Teachers / No One | Everyone |
| Allow P2P Messages From | Everyone / Teachers Only / No One | Everyone |
| Study History (AI session) | Cleared on close / Keep 24 hrs | Cleared on close |
| Profile Photo Visibility | Everyone / My Section / Only Me | Everyone |
| Two-Factor Auth (OTP on login) | On / Off | Off |
| Change Password / Phone number | Button | — |

---

### 👤 Profile

- Edit name
- Change profile photo (upload to Firebase Storage)
- View Register Number (read-only)
- View Role, Department, Year, Section (read-only — admin-assigned)
- Share profile card (generates a stylised card image with name, dept, year)

---

### ⚙️ Teacher / HOD Extra Settings

| Setting | Options | Default | Who |
|---|---|---|---|
| Leave: Exclude Medical Leave from % | On / Off | On | HOD (department-wide) |
| Leave: Auto-approve Event Leaves for Own Events | On / Off | On | Teacher |
| Attendance: Allow retroactive marking | On / Off | Off | Teacher |
| Results: Notify students when marks entered | On / Off | On | Teacher |
| Announcements: Default scope | My Section / College-wide | My Section | Teacher |

---

### 🛡️ Admin-Only Settings

| Setting | Options | Default |
|---|---|---|
| Auto-delete Storage files older than | 30 / 60 / 90 days | 90 days |
| Storage cleanup threshold | 3 GB / 4 GB / 4.5 GB | 4 GB |
| New signups require approval | On / Off | On |
| Max file upload size | 5 MB / 10 MB / 25 MB | 10 MB |
| Allow cross-department chat | On / Off | On |
| Enable Achievement Board | On / Off | On |
| Enable Event Registration | On / Off | On |

---

## 11. Notifications (FCM)

| Event | Who Gets Notified |
|---|---|
| New announcement posted | All users in scope |
| New test result uploaded | Students of that class |
| New notes uploaded | Students of that section |
| New P2P message | Recipient |
| New group message | All group members |
| Signup approved by admin | The new user |
| New calendar test date added | Students of that section |
| Storage over 80% | Principal only |
| Leave application submitted | The student's class teacher |
| Leave approved or rejected | The student who applied |
| New Achievement Board post | All users in college (throttled: max 1 push per 30 mins) |
| New event posted | All users in scope |
| Event registration confirmed | The registering student |
| Event cancelled | All registered students |
| Attendance warning triggered | The student (if threshold crossed) |
| Test date reminder (T-1/T-3/T-7) | Students in that section |

---

## 12. Security Rules Summary

```
users/{userId}
  - Read: authenticated user reading own doc only
  - Write: Cloud Functions only (admin SDK)

notes/{noteId}
  - Read: students/teachers whose dept+year+section matches note's target
  - Write: teachers whose assignedSections includes note's target; Cloud Functions

attendance/{recordId}
  - Read: the student whose studentId matches OR their class teacher
  - Write: Cloud Functions only (called by teacher-facing UI)

results/{resultId}
  - Read: the student whose studentId is in marksMap OR their class teacher
  - Write: Cloud Functions only (called by teacher-facing UI)

announcements/{announcementId}
  - Read: users whose scope matches (section or college-wide)
  - Write: Cloud Functions only

calendar/{eventId}
  - Read: public/section events → users in scope; personal events → creator only
  - Write: Cloud Functions only

timetable/{timetableId}
  - Read: students/teachers whose section matches
  - Write: Cloud Functions only

chats/p2p/{chatId}/messages
  - Read/Write: only participants (senderId or receiverId = authenticated user)

chats/groups/{groupId}/messages
  - Read/Write: only users in members array

leaveApplications/{leaveId}
  - Read: the student who applied OR the reviewing teacher OR HOD/Principal
  - Write: Cloud Functions only

achievements/{achievementId}
  - Read: all authenticated users
  - Write: Cloud Functions only

events/{eventId}
  - Read: users in scope
  - Write: Cloud Functions only

system/storage
  - Read: Principal role only
  - Write: Cloud Functions only
```

**All sensitive operations run through Cloud Functions with the Firebase Admin SDK, bypassing client-side rules entirely. Client rules are a last line of defense, not the primary security layer.**

---

## 13. PWA → TWA → Play Store Flow

### Step 1 — PWA Requirements
React app must score 80+ on Lighthouse PWA audit.
- `manifest.json` with all icon sizes (48, 72, 96, 144, 192, 512 px)
- Registered Service Worker with offline fallback page
- HTTPS served from Firebase Hosting
- `theme_color` and `background_color` set to KEC Blue `#1E3A8A`

### Step 2 — Firebase Hosting Deploy
```bash
npm run build
firebase deploy --only hosting
```
Produces permanent HTTPS URL: `https://kingstonconnect.web.app`

### Step 3 — Digital Asset Link
A `.well-known/assetlinks.json` file served from the domain, linking the package ID `com.kingstonconnect.ai` to the signing keystore fingerprint (SHA-256). Add this file to `public/.well-known/assetlinks.json` in your React project and it deploys automatically via Firebase Hosting.

### Step 4 — Bubblewrap Build
```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest https://kingstonconnect.web.app/manifest.json
bubblewrap build
```
Output: `app-release-bundle.aab` — signed with your keystore.

### Step 5 — Play Store Submission
1. Create a new app at [play.google.com/console](https://play.google.com/console)
2. Upload the signed AAB
3. Fill store listing: screenshots, description, content rating
4. $25 one-time developer fee
5. Internal testing track first → Production after review (3–7 days for first app)

---

## 14. Build Order

Build in this order to minimise rework — each step depends only on what's already built.

| # | Phase | Task |
|---|---|---|
| 1 | Infrastructure | Firebase project setup — Auth, Firestore, Storage, Hosting, Functions |
| 2 | Infrastructure | Firestore schema — create collections, seed test data |
| 3 | Infrastructure | Firebase Storage rules + folder structure |
| 4 | Infrastructure | Firestore security rules — write, test with emulator |
| 5 | Backend | Cloud Functions — `onUserSignup`, `approveUser`, `suspendUser` |
| 6 | Backend | Cloud Functions — `encryptApiKey`, `callGemini`, `buildAIContext`, `fetchPDFContext` |
| 7 | Backend | Cloud Functions — `storageMonitor` scheduled function |
| 8 | Backend | Cloud Functions — `sendNotification` FCM triggers |
| 9 | Backend | Cloud Functions — `onLeaveApply`, `onLeaveReview`, `autoReflectLeave` |
| 10 | Backend | Cloud Functions — `onNewAchievement`, `onEventRegistration`, `exportLeaveReport` |
| 11 | Frontend | React + Vite project setup, Firebase SDK, routing, auth context |
| 12 | Frontend | Settings context + theme provider (dark/light/system) + all preferences |
| 13 | Frontend | Auth screens — Signup, Login, Pending Approval screen |
| 14 | Frontend | Dashboard — all 4 role variants |
| 15 | Frontend | StudyGPT screen — chat UI, streaming Cloud Function integration |
| 16 | Frontend | Attendance screen — teacher marking + student view + HOD overview |
| 17 | Frontend | Results screen — teacher entry + student view + lock flow |
| 18 | Frontend | Calendar screen — all event types, filter toggle |
| 19 | Frontend | Timetable screen — upload + full-screen view + zoom |
| 20 | Frontend | Chat screen — P2P tab + Groups tab + AI tab |
| 21 | Frontend | Announcements screen — feed + post form + pinning |
| 22 | Frontend | Leave Application — student form + teacher review + auto-reflect |
| 23 | Frontend | Achievement Board — feed + post form + like + pin |
| 24 | Frontend | Event Registration — create event + student register + organiser headcount |
| 25 | Frontend | Settings screen — all 7 setting sections, Firestore preference sync |
| 26 | Frontend | Admin Panel — user management + storage monitor + analytics + reports |
| 27 | QA | End-to-end role testing: Student, Teacher, HOD, Principal flows |
| 28 | PWA | Lighthouse PWA audit — manifest, service worker, score 80+ |
| 29 | TWA | Bubblewrap init + build → signed AAB |
| 30 | Release | Play Store submission — store listing, AAB upload, review |

---

## 15. Cost Breakdown

| Service | Plan | Monthly Cost |
|---|---|---|
| Firebase Firestore | Blaze free tier (1 GB storage, 50K reads/day, 20K writes/day) | ₹0 |
| Firebase Storage | Blaze free tier (5 GB) | ₹0 |
| Firebase Hosting | Blaze free tier (10 GB bandwidth/month) | ₹0 |
| Firebase Cloud Functions | Blaze free tier (2M invocations/month, 400K GB-seconds) | ₹0 |
| Firebase Auth | Free — unlimited users | ₹0 |
| Firebase FCM (Push) | Free — unlimited notifications | ₹0 |
| Firebase Analytics | Free | ₹0 |
| Gemini 2.5 Flash | BYOK — each user brings their own Google AI Studio key | ₹0 to you |
| Play Store | One-time developer registration fee | **$25 once** |
| **Total Running Cost** | | **₹0 / month** |

> **Scale note:** If the college grows beyond ~500 daily active users and Firestore free-tier read limits are hit, Blaze pay-as-you-go pricing kicks in at approximately ₹0.06 per 100K reads — extremely low at college scale.

---

## 16. Folder Structure

```
kingstonconnect-ai/
├── public/
│   ├── manifest.json
│   ├── sw.js                         # Service Worker
│   └── .well-known/
│       └── assetlinks.json           # TWA Digital Asset Link
│
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── firebase.js                   # Firebase SDK init
│   │
│   ├── contexts/
│   │   ├── AuthContext.jsx           # Auth state, role, preferences
│   │   ├── ThemeContext.jsx          # Dark/light/system theme
│   │   └── NotificationContext.jsx  # FCM listener
│   │
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── usePreferences.js
│   │   ├── useFirestore.js
│   │   └── useGemini.js
│   │
│   ├── screens/
│   │   ├── Dashboard/
│   │   ├── StudyGPT/
│   │   ├── Attendance/
│   │   ├── Results/
│   │   ├── Calendar/
│   │   ├── Timetable/
│   │   ├── Chat/
│   │   │   ├── P2PTab.jsx
│   │   │   ├── GroupsTab.jsx
│   │   │   └── AITab.jsx
│   │   ├── Announcements/
│   │   ├── LeaveApplication/
│   │   ├── AchievementBoard/
│   │   ├── EventRegistration/
│   │   ├── Settings/
│   │   │   ├── AppearanceSettings.jsx
│   │   │   ├── LanguageSettings.jsx
│   │   │   ├── AISettings.jsx
│   │   │   ├── NotificationSettings.jsx
│   │   │   ├── AcademicSettings.jsx
│   │   │   ├── ChatSettings.jsx
│   │   │   ├── PrivacySettings.jsx
│   │   │   └── ProfileSettings.jsx
│   │   └── AdminPanel/
│   │
│   ├── components/
│   │   ├── ui/                       # Reusable design-system components
│   │   ├── BottomNav.jsx
│   │   ├── Sidebar.jsx
│   │   └── NotificationBadge.jsx
│   │
│   └── styles/
│       ├── tokens.css                # CSS custom properties (colours, spacing)
│       ├── dark.css                  # Dark mode overrides
│       └── index.css
│
├── functions/
│   ├── index.js                      # All Cloud Functions exports
│   ├── auth/
│   │   ├── onUserSignup.js
│   │   ├── approveUser.js
│   │   └── suspendUser.js
│   ├── ai/
│   │   ├── callGemini.js
│   │   ├── buildAIContext.js
│   │   └── fetchPDFContext.js
│   ├── crypto/
│   │   └── encryptApiKey.js
│   ├── notifications/
│   │   └── sendNotification.js
│   ├── storage/
│   │   └── storageMonitor.js
│   ├── leave/
│   │   ├── onLeaveApply.js
│   │   ├── onLeaveReview.js
│   │   └── autoReflectLeave.js
│   ├── achievements/
│   │   └── onNewAchievement.js
│   ├── events/
│   │   └── onEventRegistration.js
│   └── reports/
│       └── exportLeaveReport.js
│
├── firestore.rules
├── storage.rules
├── firebase.json
├── .firebaserc
├── vite.config.js
├── package.json
└── README.md
```

---

> **KingstonConnect AI — built for Kingston Engineering College.**
> Every feature is accounted for. Every role is mapped. Every data flow is defined.
> Start with Firebase setup and work down the build order — zero ambiguity, zero missing pieces.
> Ship it. 🚀
>>>>>>> 1fd41d6 (Production Build: KingstonConnect AI Super-App)
