# Restore EmailJS notification emails safely

This change prepares server-side EmailJS delivery; it does not enable production
delivery or change the EmailJS account. Keep the existing gateway, direct-access
deny rules, and server-created notifications deployed together. The original
browser sender must remain removed.

## Account setup (required before enabling)

1. Sign in to the EmailJS account owning `service_5wncowy` and
   `template_yzu2scl`. Confirm the connected sender account is authorized.
2. Save a copy of the existing template/settings. In Account > Security, allow
   EmailJS API requests from non-browser applications and require private-key
   authorization. If this option is unavailable on your
   subscription, keep this integration disabled until it is available.
3. Confirm the template uses `{{to_email}}`, `{{title}}`, `{{body}}`, and
   `{{type}}`. Use double-brace escaping, not triple-brace unescaped HTML.
   Recipient and sender must not use unrelated client-supplied fields.
4. Using a controlled recipient, verify a request containing only the old
   public key/service/template is rejected, and a private-key request works.
   Dashboard settings alone do not prove the public sending capability is closed.
5. Store the private key through the Firebase CLI's secret prompt (never put its
   value in a command, GitHub, a frontend file, or a chat message):

   ```sh
   firebase functions:secrets:set EMAILJS_PRIVATE_KEY --project projectpals-66223
   ```

## Configuration and deployment

Set non-secret parameters in `functions/.env.projectpals-66223` (local only).
Exclude this file locally using `.git/info/exclude`; never put the private key
in it. No repository-wide ignore or other security settings are changed here.

```dotenv
EMAILJS_ENABLED=false
EMAILJS_SERVICE_ID=service_5wncowy
EMAILJS_TEMPLATE_ID=template_yzu2scl
EMAILJS_PUBLIC_KEY=0j9iihpWE8FEyxJZt
EMAILJS_DAILY_LIMIT=50
EMAILJS_MONTHLY_LIMIT=200
EMAILJS_RECIPIENT_HOURLY_LIMIT=5
```

These are conservative application caps, not a statement of the account's plan.
Review the actual EmailJS subscription and connected mailbox quotas. Update IDs
if you create replacement service/template/public-key configurations.

The trigger targets the master project's `(default)` database and server-created
`users/{uid}/notifications/{noticeId}` records. Confirm its database location is
compatible with `asia-south1` and that the deployment/runtime identities have the
needed Firestore, Firebase Auth, Eventarc and Secret Manager permissions. Blaze
billing is required. Bind the secret only to `notificationEmail`, not the API.

After account validation, set `EMAILJS_ENABLED=true`, run `npm test` and
`npm run build`, and deploy the functions codebase using the existing project:

```sh
firebase deploy --only functions:collaboration --project projectpals-66223
```

The security gateway and deny rules must already be deployed; otherwise an open
notification collection becomes an email-sending capability. Deploy the updated
Hosting bundle as part of the earlier coordinated security rollout if that
rollout has not happened yet. This setup guide does not replace `SECURITY.md`.

## What is restored

- Crew requests and project invitations.
- New applications and hiring/rejection status updates.
- The existing ten-unread-message threshold.

Recipients are resolved from Firebase Auth, not browser inputs or mutable profile
emails. Delivery requires a verified email and an enabled recipient account.
Existing templates receive the original parameter names. Reading an in-app
notification does not trigger another email. Old notifications are not backfilled.

The delivery ledger deduplicates each notification and reserves account-wide
quotas atomically. Requests are spaced at least 1.1 seconds apart. Excess attempts
are suppressed; their in-app notifications remain available.

EmailJS does not provide an idempotency key in its documented send endpoint.
Claims therefore allow at most one application-level send attempt per notice.
A crash after claiming or an ambiguous network timeout can lose an email rather
than send a duplicate. `emailDeliveries` records `attempting`, `sent`, `rejected`,
`uncertain`, or `suppressed`; do not automatically replay ambiguous attempts.
Transient Auth/storage failures before claiming may retry. Monitor terminal
failures and the ledger storage cost; no automatic retention cleanup is included.

## Validate with test accounts before broad rollout

Check the original actions with verified recipient accounts, exact template
rendering, denied unauthorized notification creation, duplicate event delivery,
rate suppression, and EmailJS public-only rejection. Regression tests use mocks;
no live EmailJS email or Firebase staging test is claimed.

To pause delivery, set `EMAILJS_ENABLED=false` and redeploy `notificationEmail`.
Notifications created while disabled will remain in-app but will not be replayed.

References:
- https://www.emailjs.com/docs/sdk/options/
- https://www.emailjs.com/docs/rest-api/send/
- https://firebase.google.com/docs/functions/config-env#secret_parameters
