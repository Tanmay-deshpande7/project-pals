# Project Pals - Events Portal (`events`)

Welcome to the **Events Portal & Management Center** for Project Pals! This directory is a self-contained web project. When opened directly in **Antigravity**, this README provides full context on how this site functions.

---

## 🎉 Site Purpose & Architecture

The **Events Portal** allows event organizers to create, customize, monitor, and manage community hackathons, workshops, coding challenges, and meetups with automated lifecycle management.

### Core Modules & Components (`js/components/`):
- 🔑 **`AuthForm.js`**: Organizer authentication and session management.
- 📋 **`EventForm.js`**: Full event creation & editing form with fields for title, description, location/online link, start/end dates, registration limits, tag categories, and image uploaders.
- 📈 **`EventMonitor.js`**: Live event management dashboard displaying real-time participant registration counts, attendee rosters, check-ins, and exportable attendee data.
- ⚡ **`Dashboard.js` & Lifecycle Engine**:
  - Main portal view switching between event list and event creation.
  - **Automated Lazy Cleanup Script**: Background engine that runs silently to manage event lifecycles:
    - *Auto-Archiving*: 24 hours after an event ends, marks `isArchived: true` and strips heavy image data to optimize storage.
    - *Hard Deletion*: 30 days after an event ends, automatically deletes expired events and their registration sub-collections.

---

## 🛠️ Developer Setup in Antigravity

1. Open this `events` folder directly in **Antigravity**.
2. Install local build dependencies (if running standalone):
   ```bash
   npm install
   ```
3. Compile React JSX components & Tailwind CSS:
   ```bash
   npm run build
   ```
   - JSX sources: `js/` ➡️ Transpiled output: `dist/js/`
   - Input CSS: `style.css` ➡️ Compiled CSS: `dist/style.css`

---

## 🔥 Firebase Configuration
- **Hosting Target**: `events` (`projectpals-events`)
- **Firestore Collections Used**: `events`, `events/{eventId}/registrations`.
