# Zenflow App Suite

This is a separate fullstack app inside the repository. It is intended to evolve independently from the website in the repository root while still using the same MongoDB database and data model.

## Structure

- `client/`: full Zenflow frontend, copied from the website and ready for independent development
- `server/`: Express API using the same MongoDB collections and JWT auth model

## Local development

Install dependencies:

```powershell
cd zenflow_app
npm run install:all
```

Run backend:

```powershell
cd zenflow_app
npm run dev:server
```

Run frontend:

```powershell
cd zenflow_app
npm run dev:client
```

By default:

- frontend: `http://localhost:5173`
- backend: `http://localhost:4100`

If port `4100` is already occupied in local development, the backend now retries on the next free port and logs the chosen port at startup.

## Shared database

This app uses the same MongoDB URI and the same database collections as the existing Zenflow deployment. Point `server/.env` or environment variables at the same `MONGODB_URI` and `ZENFLOW_SECRET`.

## Production

Build the client:

```powershell
cd zenflow_app
npm run build
```

Start the backend:

```powershell
cd zenflow_app
npm run start
```

Send Android release announcement emails to users:

```powershell
cd zenflow_app
npm --prefix server run announce:android
```

Send the weekly wellness reminder email:

```powershell
cd zenflow_app
npm --prefix server run announce:wellness
```

Useful flags:

- `--dry-run`
- `--limit=50`
- `--only=user@example.com`
- `--provider=resend` (force Resend only)
- `--provider=smtp` (force SMTP only)
- `--force` (send again even if this week was already marked as sent)

Trigger announcement by HTTPS (no shell) using the protected admin endpoint:

```bash
curl -X POST https://your-domain.com/api/admin/announce/android-release \
  -H "Content-Type: application/json" \
  -H "x-admin-key: YOUR_ADMIN_BROADCAST_KEY" \
  -d "{\"provider\":\"resend\",\"dryRun\":false}"
```

Weekly wellness reminders can also be triggered by HTTPS:

```bash
curl -X POST https://your-domain.com/api/admin/announce/weekly-wellness \
  -H "Content-Type: application/json" \
  -H "x-admin-key: YOUR_ADMIN_BROADCAST_KEY" \
  -d "{\"provider\":\"auto\",\"dryRun\":false}"
```

## Render full app deploy

This repo can now be deployed to Render as a single Node web service that serves:

- the website frontend from the same URL
- the backend API under `/api`

In production, the Express server already serves `client/dist`, so the same Render URL can open the website and handle API requests.

Blueprint settings in `render.yaml`:

- Runtime: `Node`
- Root Directory: `.`
- Build Command: `npm run render:build`
- Start Command: `npm run render:start`
- Health Check Path: `/health`

Required Render environment variables:

- `MONGODB_URI`
- `ZENFLOW_SECRET`

Optional auth environment variables:

- `GOOGLE_CLIENT_ID`
- `PUBLIC_APP_URL`
- `VITE_ENABLE_ANALYTICS_IN_DEV` (`true` to emit analytics during local Vite development)
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `SMTP_RESET_BCC`
- `RESEND_API_KEY`
- `RESEND_FROM`
- `APK_DOWNLOAD_URL` (optional direct APK URL used by `/download/android`)
- `ADMIN_BROADCAST_KEY` (required for protected broadcast API endpoint)
- `WEEKLY_WELLNESS_EMAILS_ENABLED` (`true` to let the server auto-send the weekly reminder)
- `WEEKLY_WELLNESS_EMAILS_DAY_UTC` (`0-6`, where `1` is Monday; default `1`)
- `WEEKLY_WELLNESS_EMAILS_HOUR_UTC` (`0-23`; default `9`)
- `WEEKLY_WELLNESS_EMAILS_MINUTE_UTC` (`0-59`; default `0`)
- `KEEP_ALIVE_ENABLED` (`true` enables the optional Render keep-alive request)
- `KEEP_ALIVE_URL` (the public Render or custom-domain URL to ping every 14 minutes)

To reduce idle spin-down on a Render Free web service, set:

```text
KEEP_ALIVE_ENABLED=true
KEEP_ALIVE_URL=https://zenflow.bio
```

The backend will request `KEEP_ALIVE_URL/health` every 14 minutes. This only
addresses idle spin-down; Render can still restart or suspend a free service,
and its monthly free-instance-hour and bandwidth limits still apply.

If `GOOGLE_CLIENT_ID` is set, the login screen shows Google Sign-In. If the SMTP settings are set, Zenflow can email password reset codes and recovery links.
If `RESEND_API_KEY` and `RESEND_FROM` are set, password reset emails are sent via Resend API first, with SMTP as fallback.
The GA4 site tag for measurement ID `G-B0H2J0ZX9T` is embedded directly in `client/index.html`, and the frontend sends sanitized SPA pageview analytics plus a pseudonymous non-PII `user_id` for signed-in accounts.
For the weekly reminder to come from your domain, set `SMTP_FROM` and/or `RESEND_FROM` to something like `Zenflow <hello@zenflow.bio>` and make sure the `zenflow.bio` domain is configured with the correct SPF/DKIM records at your mail provider.

After redeploy, the same Render URL works for both:

- website: `https://your-render-service.onrender.com`
- API: `https://your-render-service.onrender.com/api/...`

## Google Cloud Run deploy (free-tier friendly)

Cloud Run can host the frontend and API as one service using the included
`Dockerfile`. The following settings allow scale-to-zero and cap the service at
one instance, which keeps light usage within Cloud Run's monthly free allowance
in supported billing accounts and regions. A billing account is still required,
and usage beyond Google's allowance is chargeable.

Prerequisites:

- a Google Cloud project with billing enabled
- the Google Cloud CLI (`gcloud`) installed and authenticated
- a reachable MongoDB deployment; Cloud Run's local filesystem is temporary

From the repository root, select the project and enable the required APIs:

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

Deploy from source. `europe-west1` (Belgium) is used because it is close to the
app's current Europe/Paris location and is a standard Cloud Run pricing region:

```bash
gcloud run deploy zenflow-app \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --port 8080 \
  --cpu 1 \
  --memory 512Mi \
  --min 0 \
  --max 1 \
  --concurrency 80 \
  --set-env-vars NODE_ENV=production \
  --set-env-vars MONGODB_URI='YOUR_MONGODB_URI' \
  --set-env-vars ZENFLOW_SECRET='A_LONG_RANDOM_SECRET'
```

On PowerShell, replace each trailing `\` with a backtick, or enter the command
on one line. For a production deployment, store `MONGODB_URI` and
`ZENFLOW_SECRET` in Secret Manager and attach them with `--set-secrets` instead
of leaving them in shell history.

The app redirects production traffic to `PUBLIC_APP_URL`. After the first
deploy, get the generated service URL and set it as the public URL if the Cloud
Run address should be directly browsable:

```bash
SERVICE_URL=$(gcloud run services describe zenflow-app --region europe-west1 --format='value(status.url)')
gcloud run services update zenflow-app --region europe-west1 --update-env-vars PUBLIC_APP_URL="$SERVICE_URL"
```

PowerShell equivalent:

```powershell
$serviceUrl = gcloud run services describe zenflow-app --region europe-west1 --format="value(status.url)"
gcloud run services update zenflow-app --region europe-west1 --update-env-vars "PUBLIC_APP_URL=$serviceUrl"
```

Verify the deployment:

```bash
curl "$SERVICE_URL/health"
```

Expected storage is `mongodb`. Do not use the development JSON-file fallback on
Cloud Run because container files do not persist across restarts.

Cost and scheduling notes:

- Keep minimum instances at `0`; setting it to `1` can create idle-instance cost.
- Cloud Build and Artifact Registry also have their own quotas and pricing. Delete
  old container images periodically if their stored size grows beyond their free
  allowances.
- The in-process weekly email and queue timers are not reliable while the service
  is scaled to zero. Keep `WEEKLY_WELLNESS_EMAILS_ENABLED=false` and use Cloud
  Scheduler to call the protected admin endpoint if guaranteed schedules are
  required; Scheduler may add a small charge outside its own allowance.
- MongoDB is external to Cloud Run and has separate limits and pricing.

## Website analytics with GA4

Zenflow now includes an optional Google Analytics 4 integration in the client.

Set these build-time environment variables for the frontend:

- none required for the GA tag itself; the measurement ID `G-B0H2J0ZX9T` is embedded in `client/index.html`

Optional local-development flag:

- `VITE_ENABLE_ANALYTICS_IN_DEV=true`

What the integration does:

- loads the GA4 `gtag.js` tag from `client/index.html`
- tracks manual `page_view` events for the landing page, legal pages, dashboard, and major in-app views
- preserves UTM parameters while stripping sensitive query params such as password-reset and verification codes
- assigns a pseudonymous server-generated `user_id` for signed-in users without sending email or username to GA4
- emits a standard `login` event after successful authentication

Where to look in GA4:

- `Reports snapshot` for overall traffic and engagement
- `Reports -> Acquisition -> Traffic acquisition` for source and medium
- `Reports -> User -> Demographic details` for country, region, and city
- `Reports -> Engagement -> Pages and screens` for tracked page views
- `Explore` if you want to break down traffic by `user_id` or custom event parameters

## Android app

The client is now wrapped with Capacitor and includes an Android project under `client/android`.

Build and sync Android assets:

```powershell
cd zenflow_app\client
npm run build:android
```

Open the Android project in Android Studio:

```powershell
cd zenflow_app\client
npm run open:android
```

API configuration for Android:

- web builds keep using relative `/api` calls unless `VITE_API_BASE_URL` is set
- Android builds default to `http://10.0.2.2:4100` for the emulator when `VITE_API_BASE_URL` is not set
- set `VITE_ANDROID_API_BASE_URL` before `npm run build:android` if you need a different backend host, such as a LAN IP for a physical device
- Public Android download link:
  - The website now links to `/download/android`.
  - Set `APK_DOWNLOAD_URL` on the server to a direct APK URL (for example GitHub Releases asset URL).
  - If that direct URL fails or is missing, Zenflow automatically falls back to `https://github.com/sumit2409/Zenflow_app/releases`.

Build a debug APK directly:

```powershell
cd zenflow_app\client
npm run apk:debug
```

APK output:

- `client/android/app/build/outputs/apk/debug/app-debug.apk`
