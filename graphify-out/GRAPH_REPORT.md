# Graph Report - .  (2026-04-28)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 73 nodes · 51 edges · 8 communities detected
- Extraction: 75% EXTRACTED · 24% INFERRED · 2% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Core UI & Setup|Core UI & Setup]]
- [[_COMMUNITY_Project Operations|Project Operations]]
- [[_COMMUNITY_Application Root|Application Root]]
- [[_COMMUNITY_Notifications & Audio|Notifications & Audio]]
- [[_COMMUNITY_Button Fixes|Button Fixes]]
- [[_COMMUNITY_Style Replacement|Style Replacement]]
- [[_COMMUNITY_Orb Fixes|Orb Fixes]]
- [[_COMMUNITY_Icons|Icons]]

## God Nodes (most connected - your core abstractions)
1. `Project Pals Overview` - 7 edges
2. `Admin Authorization Flow` - 4 edges
3. `Coordinated Project Destruction` - 4 edges
4. `Silent Orphaned Thread Cleanup` - 3 edges
5. `fix_button_text()` - 2 edges
6. `main()` - 2 edges
7. `replace_in_file()` - 2 edges
8. `main()` - 2 edges
9. `fix_orbs()` - 2 edges
10. `main()` - 2 edges

## Surprising Connections (you probably didn't know these)
- `Create / Add Icon` --semantically_similar_to--> `Coordinated Project Destruction`  [AMBIGUOUS] [semantically similar]
  public/assets/icons/plus.svg → changelog.md
- `Messages Icon` --semantically_similar_to--> `Silent Orphaned Thread Cleanup`  [INFERRED] [semantically similar]
  public/assets/icons/messages.svg → changelog.md
- `Trash / Delete Icon` --semantically_similar_to--> `Coordinated Project Destruction`  [INFERRED] [semantically similar]
  public/assets/icons/trash-2.svg → changelog.md
- `Security / Admin Shield Icon` --semantically_similar_to--> `Admin Authorization Flow`  [INFERRED] [semantically similar]
  public/assets/icons/shield.svg → CLAUDE.md
- `Project Pals Overview` --conceptually_related_to--> `ProjectPals Logo`  [INFERRED]
  README.md → public/assets/icons/logo.svg

## Hyperedges (group relationships)
- **Admin Security System** — admin_auth_flow, icon_shield, claude_guidelines [INFERRED 0.85]
- **Project Lifecycle Management** — project_destruction_feature, orphaned_thread_cleanup, changelog_updates [INFERRED 0.88]
- **App Navigation Icon Set** — icon_dashboard, icon_projects, icon_messages, icon_explore, icon_settings [EXTRACTED 0.95]

## Communities

### Core UI & Setup
Cohesion: 0.18
Nodes (11): Admin Authorization Flow, Claude AI Guidelines, Dashboard Icon, Explore / Discover Icon, Google Login Icon, ProjectPals Logo, Projects / Folder Icon, Settings / Sliders Icon (+3 more)

### Project Operations
Cohesion: 0.4
Nodes (6): Recent Fixes & Improvements, Messages Icon, Create / Add Icon, Trash / Delete Icon, Silent Orphaned Thread Cleanup, Coordinated Project Destruction

### Application Root
Cohesion: 0.4
Nodes (1): App()

### Notifications & Audio
Cohesion: 0.5
Nodes (2): initGlobalAudio(), unlockGlobalAudio()

### Button Fixes
Cohesion: 1.0
Nodes (2): fix_button_text(), main()

### Style Replacement
Cohesion: 1.0
Nodes (2): main(), replace_in_file()

### Orb Fixes
Cohesion: 1.0
Nodes (2): fix_orbs(), main()

### Icons
Cohesion: 0.67
Nodes (1): Icon()

## Ambiguous Edges - Review These
- `Create / Add Icon` → `Coordinated Project Destruction`  [AMBIGUOUS]
  public/assets/icons/plus.svg · relation: semantically_similar_to

## Knowledge Gaps
- **12 isolated node(s):** `Claude AI Guidelines`, `Dashboard Icon`, `Explore / Discover Icon`, `Messages Icon`, `Trash / Delete Icon` (+7 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Application Root`** (5 nodes): `app.jsx`, `App()`, `RequirePhone()`, `Root()`, `app.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Notifications & Audio`** (5 nodes): `doPlay()`, `initGlobalAudio()`, `NotificationManager()`, `unlockGlobalAudio()`, `NotificationManager.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Button Fixes`** (3 nodes): `fix_button_text()`, `main()`, `fix_buttons.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Style Replacement`** (3 nodes): `main()`, `replace_styles.py`, `replace_in_file()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Orb Fixes`** (3 nodes): `fix_orbs()`, `main()`, `restore_orbs.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Icons`** (3 nodes): `Icons.js`, `Icon()`, `Icons.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Create / Add Icon` and `Coordinated Project Destruction`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **Are the 7 inferred relationships involving `Project Pals Overview` (e.g. with `Admin Authorization Flow` and `ProjectPals Logo`) actually correct?**
  _`Project Pals Overview` has 7 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `Admin Authorization Flow` (e.g. with `Project Pals Overview` and `Security / Admin Shield Icon`) actually correct?**
  _`Admin Authorization Flow` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `Coordinated Project Destruction` (e.g. with `Trash / Delete Icon` and `Silent Orphaned Thread Cleanup`) actually correct?**
  _`Coordinated Project Destruction` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `Silent Orphaned Thread Cleanup` (e.g. with `Messages Icon` and `Coordinated Project Destruction`) actually correct?**
  _`Silent Orphaned Thread Cleanup` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Claude AI Guidelines`, `Dashboard Icon`, `Explore / Discover Icon` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._