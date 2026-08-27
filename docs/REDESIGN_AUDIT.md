# Zenflow redesign audit and preservation checklist

Updated: 2026-08-27

## Architecture audited

- React 18/Vite single-page client, Express 4 API/static server, MongoDB through Mongoose with a development JSON-file fallback, and a Capacitor Android wrapper.
- Public routes are resolved client-side and receive server-injected canonical metadata in production. Private application views use internal state and `/app/*` canonical tracking paths.
- Authentication supports local registration, email verification, password recovery, and Google sign-in. The existing seven-day bearer JWT contract and stored accounts remain unchanged.
- Durable user content is merged into the existing per-user `meta` object; activity history remains in dated `logs`. This avoids a risky database migration.
- Production deploys from the root Dockerfile/Render blueprint. Static client output is served by Express.

## Preserved functionality

- [x] Existing accounts, authentication endpoints, password reset, verification, and Google sign-in
- [x] Tasks, dated daily notes, planner sheets, reminders, and task-to-focus linking
- [x] Focus sessions, duration/break controls, reflections, history logging, and task progress
- [x] Meditation, breathing patterns, ambient sound, and session logging
- [x] Sudoku difficulty, completion flow, and records
- [x] Memory/reaction games and records
- [x] Break suggestions and all Reset entry points
- [x] Progress charts and existing activity records
- [x] CV Maker (moved conceptually under More; implementation and data contract untouched)
- [x] Admin, contact, email campaigns, coach, Android build, and public articles
- [x] Guest access to focus, meditation, Reset, and games
- [x] MongoDB and JSON fallback storage formats; no schema migration required

## Fragile areas and mitigations

- Authentication tokens are client-readable local/session storage, not HttpOnly cookies. Changing this safely requires a versioned server-session migration and coordinated logout/CSRF work; it was not silently changed in this UI release.
- `meta` updates are shallow merges. Existing feature keys are preserved and no whole-document replacement was introduced.
- Focus countdown previously survived clock throttling only while mounted. Active state now stores an absolute end timestamp and restores after refresh.
- Analytics previously loaded before consent. It is now dynamically loaded only after analytics consent.
- The former process-local self-ping was not persistent. It is disabled in Render configuration and replaced by a scheduled GitHub Actions health check.
- Older dashboard scoring and leaderboard data remain available in Progress; no historical records are deleted.

## Manual release checks

Before production deploy, validate login/register/email/Google flows against staging credentials, exercise guest and authenticated timer recovery, confirm Mongo reconnection behavior, configure the optional `UPTIME_ALERT_WEBHOOK` repository secret, and verify the hosting plan permits scheduled health monitoring.
