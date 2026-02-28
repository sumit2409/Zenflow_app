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

## Render backend deploy

This repo now includes a Render blueprint at `render.yaml` for the backend service.

Manual service settings:

- Runtime: `Node`
- Root Directory: `server`
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/health`

Required Render environment variables:

- `MONGODB_URI`
- `ZENFLOW_SECRET`

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

Build a debug APK directly:

```powershell
cd zenflow_app\client
npm run apk:debug
```

APK output:

- `client/android/app/build/outputs/apk/debug/app-debug.apk`
