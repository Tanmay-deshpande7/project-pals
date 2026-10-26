# Project Pals - Main Website (`normal`)

Welcome to the **Main Student & User Portal** for Project Pals! This directory is a self-contained web project. When opened directly in **Antigravity**, this README provides full context on how this site functions.

---

## 🌐 Site Purpose & Architecture

The **Main Website** is the central student platform where users discover projects, build team connections, apply to join project teams, message teammates, and view active events.

### Core Modules & Components (`js/components/`):
- 🏠 **`LandingPage.js`**: Public homepage highlighting platform features, benefits, and call-to-actions.
- 🔑 **`AuthForm.js`**: Authentication system (Email/Password, Google Auth, profile initialization).
- 📊 **`Dashboard.js`**: Primary student feed with search, domain filtering, trending projects, and user recommendations.
- 🚀 **`CreateProjectModal.js`**: Multi-step project creation workflow with tag selection, team roles, and media attachments.
- 🔍 **`ProjectDetailsModal.js`**: Deep-dive project view, application submission, team roster management, and applicant approval.
- 👥 **`NetworkView.js`**: Student directory and networking view to connect with fellow builders based on skillsets.
- 💬 **`MessagesView.js`**: Real-time team chat threads and direct messaging for project collaborators.
- 🎉 **`EventsView.js`**: Campus and community event feed with live countdowns and direct event registration.
- 🔔 **`NotificationManager.js`**: In-app notification center for application status updates, team invites, and connection requests.
- ⚙️ **`SettingsView.js`**: Profile editing, skill tag management, and social link configurations.

---

## 🛠️ Developer Setup in Antigravity

1. Open this `normal` folder directly in **Antigravity**.
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
- **Hosting Target**: `main` (`projectpals-66223`)
- **Firestore Collections Used**: `users`, multi-shard `projects` (`shardDbs`), `applications`, `threads`, `notifications`.
