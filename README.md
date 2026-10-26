# Project Pals Workspace

This repository is organized into **3 independent sub-projects / folders**, allowing separate developers to work on different sections of the platform using **Antigravity** or their preferred editor.

---

## 📁 Workspace Structure & Site Functions

| Folder | Project Portal | Primary Site Functions & Features | Live Hosting Target |
| :--- | :--- | :--- | :--- |
| [`normal/`](file:///d:/project%20pals/normal) | **Main Student Website** | Student feed, project creation & discovery, team applications, student networking, direct messaging, event feed & notifications. | `projectpals-66223` |
| [`admin/`](file:///d:/project%20pals/admin) | **Admin Dashboard** | System metrics, civilian tracking/user banning, cross-shard project moderation/teardown, root security clearance management. | `projectpals-admin` |
| [`events/`](file:///d:/project%20pals/events) | **Events Portal** | Hackathon/workshop creation, live registration monitoring, attendee exports, automated 30-day lifecycle cleanup & archiving. | `projectpals-events` |

---

## 🤖 Context for Antigravity AI

Each sub-folder contains a detailed `README.md` that automatically provides **Antigravity** with full context when opened directly:
- [`normal/README.md`](file:///d:/project%20pals/normal/README.md) – Detailed breakdown of all student features & components.
- [`admin/README.md`](file:///d:/project%20pals/admin/README.md) – Detailed breakdown of system administration & security controls.
- [`events/README.md`](file:///d:/project%20pals/events/README.md) – Detailed breakdown of event creation & automated lifecycle engine.

---

## 🔒 Website Integrity

1. **Isolated Deployment**:
   - `normal` deploys exclusively to `projectpals-66223` (`main`).
   - `admin` deploys exclusively to `projectpals-admin` (`admin`).
   - `events` deploys exclusively to `projectpals-events` (`events`).
   - *Deploying one site will never overwrite or interfere with another site's live deployment.*

2. **Isolated Build Systems**:
   - Each folder has its own Tailwind CSS and Babel setup, ensuring style and code changes remain isolated to that specific portal.

---

## 🔄 GitHub Sync & Collaboration Guide

Whenever you update code in the repository and push to GitHub, your friends working on their respective folders can update their local project in Antigravity by running:

```bash
git pull
```
*(Or by asking Antigravity: "Pull the latest changes from GitHub")*

### Workflow for your friends:
1. **Pull Latest Changes**: `git pull`
2. **Work on their folder**: Make edits, test locally inside `admin/`, `normal/`, or `events/`.
3. **Commit & Push**:
   ```bash
   git add .
   git commit -m "Updated features in my section"
   git push
   ```

---

## 🚀 Root Workspace Build Commands

From the root directory (`d:\project pals`), you can build all 3 sub-projects simultaneously:

```bash
# Build all 3 projects (Normal, Admin, Events)
npm run build

# Build individual projects from root
npm run build:normal
npm run build:admin
npm run build:events
```
