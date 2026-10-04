# Security remediation and deployment

This change replaces browser database access with an authenticated HTTPS gateway.
The source changes and tests do not establish that production is fixed: the API,
Hosting configuration, indexes, and rules still need a coordinated deployment.
No production deployment, IAM change, database migration, provider rotation, or
Git history rewrite is performed by this PR. The repository's default branch is
`master`.

## What changed and why

| Original finding | Source change | Remaining operational work |
| --- | --- | --- |
| F1: broad main database access and privilege escalation | Recursive direct-access deny rules; server enforces profile, project, application, invitation, chat and registration permissions | Deploy and verify rules in the main project |
| F2: publicly accessible shards | Every shard operation goes through a master Auth token and server authorization; shard rules deny all browser/REST access | Grant the runtime identity data access and deploy rules/indexes in all four shard projects |
| F3: apparent recovery credential committed publicly | Remove recovery-code file and ignore future recovery/service-account files | Owner must invalidate/regenerate the exposed recovery credential with its provider; deletion does not remove history or invalidate copies |
| F4: unverified email enrollment and browser-created admins | Require verified existing Auth account and trusted UID registry; root-only grant/revoke API; remove initial-root and failed-login signup flows | Independently review existing privileged records, then provision a verified root and organizers through trusted administration |
| F5: public administrator identity disclosure | No anonymous registry lookup; privileged lists remain server protected | Confirm anonymous direct reads are denied after deployment |
| F6/F8: framing and browser hardening | Add CSP, frame denial, MIME/referrer/permissions headers and pinned script integrity; replace runtime Tailwind CDN with compiled CSS | Verify all three deployed portals, including Google sign-in, under their real headers |
| F7: private data remains in persistent browser cache | Remove browser Firestore SDK/persistence; cancel requests/listeners on account change; discard stale responses; remove earlier app IndexedDB databases | Close old tabs for cache cleanup; browsers without IndexedDB enumeration need site-data cleanup |
| F9: browser-selectable email recipient | Remove browser EmailJS transport; server generates in-app notices from authorized operations | Disable/revoke the previous EmailJS template/key at the provider; browser-code removal cannot revoke an already-public provider capability |

Backend comments explain the trust boundaries and the reasons for ownership,
immutable identity, verified privilege, transaction and response-discard checks.
Firebase web API keys are public app identifiers and are intentionally retained.

## Authorization model

`functions/http.js` checks a master-project Auth bearer token, including revocation,
before dispatch. Caller-supplied UIDs never determine identity. Each request reloads
Auth account state and verified UID admin/organizer records; disabled users and
removed privileges are rejected on their next request.

`functions/policy.js` authorizes every document/query/write. Users can edit their
own profile but cannot assign shards, connections or roles. Other users' profiles
omit email and connection lists. Only owners decide applications and invitations;
only current members can read/send team messages. Thread membership and counters,
notification recipients, timestamps, and event owner IDs are assigned on the
server. Organizer ownership protects attendee answers and deletion. Admin grants
require a verified existing account and a root administrator; root bootstrap is
never available to the browser.

Admin SDK access bypasses Firestore Rules. The gateway policy and runtime IAM are
therefore essential; a valid token alone never grants unrestricted database access.
The database selector is restricted to the five known projects and known paths.
Unknown nested collections stay denied. Bodies, documents, queries, memberships,
batch sizes, and per-user request rates are bounded.

The existing shard data is retained in place. The browser adapter refreshes every
15 seconds rather than using native Firestore streams, holds data only in memory,
and returns at most 200 records per query (chat queries return the newest window).
Large datasets require pagination before expanding those windows. Reciprocal
connections update atomically in the master database; shard request status cannot
share a transaction with that project. Acceptance is idempotent and a failed
master update attempts to restore a pending request for retry. Project/event child
cleanup is chunked after the authorized deletion; an interrupted cleanup requires
trusted maintenance of orphaned children. Data remains inaccessible through the
gateway once the parent is gone. Optional in-app notification delivery is best
effort; external email is disabled until a trusted provider integration is set up.

## Deployment prerequisites

1. Use a staging copy first. Confirm Cloud Functions billing/API requirements and
   the runtime service account. Grant only required Firestore data permissions in
   `projectpals-66223` and `projectpals-shard-1` through `projectpals-shard-4`, plus
   Auth user read/update/token-revocation permissions in the master project. Keep
   service-account keys out of source control. The code uses runtime credentials.
2. Back up data and independently verify current admin, organizer, project-member,
   connection, and shard assignments. The old public/broad rules allowed those
   records to be edited, so existing values are not evidence of legitimate access.
   Remove unauthorized records. Establish a known verified root at `admins/{uid}`
   with its verified email and `role: "root"`, and approved organizers at
   `organizers/{uid}` with their verified email, using trusted owner tooling.
   The API only creates ordinary admin grants after this trusted root exists.
3. Backfill existing events' `ownerId` from independently verified provenance.
   Do not infer ownership from the currently signed-in organizer. Events with no
   trusted owner remain unavailable for organizer management; admins can remove
   them. Validate legacy private threads against real project applications and
   repair only records with confirmed provenance. Preserve legitimate shard IDs.
4. Configure Hosting targets `main`, `admin`, and `events` locally for the master's
   actual site IDs. `.firebaserc` is ignored; do not guess site mappings.
   These target names are unrelated to Git branch names.

## Coordinated rollout

The following are deployment instructions, not commands executed by this PR.

1. Run `npm ci --ignore-scripts`, `npm test`, `npm run build`, and
   `npm ci --ignore-scripts --prefix functions` with Node 24.
2. Deploy indexes to the main project with `firebase deploy --only firestore:indexes
   --project projectpals-66223`. For each known shard, use `--config
   firebase.shards.json --only firestore:indexes --project <shard-project-id>`.
   Wait for indexes to become ready. Review any prompts affecting existing indexes.
3. Deploy the backend to the master using `firebase deploy --only functions:collaboration
   --project projectpals-66223`. Verify runtime IAM and authorized/unauthorized
   staging requests before exposing the new clients.
4. Deploy all three built Hosting portals with `firebase deploy --only hosting
   --project projectpals-66223`, then close direct access using
   `firebase deploy --only firestore:rules --project projectpals-66223` and, for
   every shard, `firebase deploy --config firebase.shards.json --only
   firestore:rules --project <shard-project-id>`.
   Coordinate a short maintenance window: older browser clients lose direct access
   at cutover and must reload. Do not leave the old public rules as a fallback.
5. Verify unauthenticated direct reads/writes are denied in all five projects;
   verify ordinary users cannot write privileged records even with a valid token.
   Exercise signup, Google/password sign-in, profile updates, projects, hiring,
   invitations, member removal, private/team chat, event registration, owner
   monitoring, admin grants/revocation, and logout/account switching. Verify the
   actual CSP/SRI and framing headers for every site and confirm previous caches
   are removed. Monitor API errors, rate limits, costs and cleanup failures.
6. Invalidate the exposed recovery credential and disable/revoke the former
   EmailJS capability with their respective provider accounts. Review prior
   database/privilege changes and provider activity as appropriate.

Do not revert to permissive rules during rollback. Use maintenance mode while
repairing runtime IAM, configuration or a failed rollout.

## Validation scope

`npm test` exercises the HTTP token boundary, ownership and privilege denials,
privacy filtering, membership transitions, registration compatibility, transaction
behavior, outage retry and stale browser responses using synthetic in-memory data.
`npm run build` compiles the public/admin/events portals, and the backend loads
against its locked Firebase SDKs without production credentials. GitHub Actions
runs the same checks on PRs and pushes to `master` with read-only repository access.
Firebase's remote Rules validator checks syntax. These checks do not replace
staging integration tests, IAM verification or production validation. No production
accounts, records or emails were created by the regression tests.

The separate Cloudflare audit was incomplete because its mandatory validators
could not run in the available environment. This PR addresses the original
ProjectPals review and does not claim Cloudflare audit validation.
