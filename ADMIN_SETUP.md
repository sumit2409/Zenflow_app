# Zenflow Admin Dashboard Setup

## What this adds

Zenflow now includes an admin-only dashboard inside the existing app for:

- viewing users and stored profile/activity data
- exporting users to CSV
- reading stored contact messages
- creating reusable email templates
- creating one-off, thank-you, and daily campaigns
- previewing emails with template variables
- sending test emails to the admin account
- queueing outbound email in batches with retry/failure tracking
- reviewing queue state, run history, and audit logs

## Admin access model

- Admin access is not user-editable.
- A user becomes admin only when their verified account email is exactly `contactsumit2409@gmail.com`.
- Backend admin APIs are protected by JWT auth plus admin middleware.
- There is no separate public admin registration path and no role flag users can self-assign.

## Relevant files

- Backend entry and admin APIs: `server/index.js`
- Admin UI: `client/src/components/AdminDashboard.tsx`
- App wiring: `client/src/App.tsx`
- Auth account shape: `client/src/types/auth.ts`
- Admin dashboard styling: `client/src/styles/theme.css`
- Render env placeholders: `render.yaml`

## Environment variables

Required for the app in general:

- `ZENFLOW_SECRET`
- `MONGODB_URI` if using Mongo instead of file storage

Required for outbound email sending:

- SMTP path:
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_SECURE`
  - `SMTP_USER`
  - `SMTP_PASS`
  - `SMTP_FROM`
- or Resend path:
  - `RESEND_API_KEY`
  - `RESEND_FROM`

Optional queue tuning:

- `EMAIL_QUEUE_BATCH_SIZE`
  - default: `8`
- `EMAIL_QUEUE_INTERVAL_MS`
  - default: `60000`
- `EMAIL_QUEUE_MAX_ATTEMPTS`
  - default: `4`

## Local development

1. Install dependencies.
2. Start the server and client with the project's normal dev flow.
3. Register or sign in with `contactsumit2409@gmail.com`.
4. Verify that account's email.
5. Open the app and use the `Admin` button in the header.

## Deployment notes

1. Set the email provider env vars in Render.
2. Set queue env vars only if you want different throttling from the defaults.
3. Redeploy the web service.
4. Sign in with the admin email and confirm:
   - `/api/admin/overview` loads
   - a test campaign can be queued
   - jobs move from `pending` to `sent` or `failed`

## Queue behavior

- Jobs are stored individually with `pending`, `sending`, `sent`, or `failed` status.
- The worker sends only a limited batch per interval.
- Failed jobs retry with delay until `EMAIL_QUEUE_MAX_ATTEMPTS` is reached.
- Campaign runs aggregate sent, failed, and pending counts.

## Template variables

Supported variables in templates and campaigns:

- `{{userName}}`
- `{{username}}`
- `{{email}}`
- `{{signupDate}}`

## Security notes

- Passwords use bcrypt hashing.
- Admin APIs require bearer-token auth and admin middleware checks.
- Admin actions such as login, viewing/exporting users, editing templates, and queueing campaigns are audit logged.
- Inputs are sanitized server-side before persistence.
- The app uses JWT auth headers rather than cookie sessions, so CSRF tokens are not part of this implementation.

## Storage and schema notes

- Mongo deployments use the new Mongoose models created in `server/index.js` for:
  - contact messages
  - email templates
  - email campaigns
  - campaign runs
  - queue jobs
  - audit logs
- File-storage deployments automatically extend `server/data.json` with an `admin` section.
- No separate migration script is required because the models are additive and created lazily by the server.
