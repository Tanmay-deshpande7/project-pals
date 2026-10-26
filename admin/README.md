# Project Pals - Admin Dashboard (`admin`)

Welcome to the **System Core & Administration Portal** for Project Pals! This directory is a self-contained web project. When opened directly in **Antigravity**, this README provides full context on how this site functions.

---

## 🛡️ Site Purpose & Architecture

The **Admin Dashboard** is the command center for platform owners and administrators to monitor architecture metrics, manage system security, moderate content, and maintain user safety across all database shards.

### Core Modules & Components (`js/components/`):
- 🔑 **`AdminAuth.js`**: Secured authentication panel checking multi-level clearance (`root` vs `admin`) against the `admins` collection.
- 📊 **`AdminDashboard.js`**: Main administrative dashboard with 4 core views:
  - **Overview (Architecture Metrics)**: Live metric cards displaying total connected users and total launched projects aggregated across all database shards.
  - **Users (Civilian Tracking)**: Real-time user directory with instant search, network ID inspection, and user banning/deletion capabilities.
  - **Projects (Project Dominance)**: Cross-shard project oversight with administrative teardown capabilities (deletes projects, team chat threads, sub-collections, and applications in a batch operation).
  - **Security (System Security & Clearance)**: Root-level admin control panel allowing root admins to grant administrative clearance to new email addresses or revoke existing admin access.

---

## 🛠️ Developer Setup in Antigravity

1. Open this `admin` folder directly in **Antigravity**.
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
- **Hosting Target**: `admin` (`projectpals-admin`)
- **Firestore Collections Used**: `admins`, `users`, multi-shard `projects` (`shardDbs`), `threads`, `applications`.
