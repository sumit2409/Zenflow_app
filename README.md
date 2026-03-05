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
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `SMTP_RESET_BCC`
- `RESEND_API_KEY`
- `RESEND_FROM`

If `GOOGLE_CLIENT_ID` is set, the login screen shows Google Sign-In. If the SMTP settings are set, Zenflow can email password reset codes and recovery links.
If `RESEND_API_KEY` and `RESEND_FROM` are set, password reset emails are sent via Resend API first, with SMTP as fallback.

After redeploy, the same Render URL works for both:

- website: `https://your-render-service.onrender.com`
- API: `https://your-render-service.onrender.com/api/...`

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
- set `VITE_ANDROID_APK_URL` to control the public Android download link shown on the landing page
  - Safe default (never 404 if releases page exists): `https://github.com/<owner>/<repo>/releases`
  - GitHub direct download example: `https://github.com/<owner>/<repo>/releases/latest/download/<exact-asset-filename>.apk`
  - Render-hosted direct download example: `https://<your-render-service>.onrender.com/downloads/zenflow-app.apk`

Build a debug APK directly:

```powershell
cd zenflow_app\client
npm run apk:debug
```

APK output:

- `client/android/app/build/outputs/apk/debug/app-debug.apk`
