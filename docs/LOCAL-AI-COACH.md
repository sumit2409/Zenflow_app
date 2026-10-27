# Zenflow local AI connection

Zenflow's existing signed-in Coach now supports this local model. It reads the current member's saved performance summary on each question and offers existing tool buttons. It does not monitor outside Zenflow, execute arbitrary commands, or silently change accounts/settings. Activity logging remains with Zenflow's existing features. The model receives recent task/note text as part of the summary; explain this in your privacy notice before rollout.

## Connect
1. Run Start-Anywhere.cmd here. Open the printed HTTPS URL; unlock the workspace with the token in data/config.json. The PC must stay awake and online. Restarting the tunnel changes this temporary URL.
2. In the Zenflow backend environment (Render dashboard for the deployed website), set LOCAL_AI_URL to that HTTPS origin, with no /api suffix. Set LOCAL_AI_COACH_TOKEN to coachToken from this project's data/config.json. Keep both credentials server-side; never use a VITE_ variable or put them in React. The coach credential only permits inference, not workspace administration.
3. Restart/redeploy the Zenflow backend. Sign in and click Ask Zenflow, then ask “How am I doing this week?” Existing tool cards open the selected website function when clicked.
4. If the PC/model is unavailable, Zenflow returns its existing data-based coaching rules. Local inference can take up to two minutes. If LOCAL_AI_URL is unset, existing Gemini configuration continues to work.

For local Zenflow development use LOCAL_AI_URL=http://127.0.0.1:8080 in server/.env plus the coach credential. A hosted backend cannot reach your PC using localhost: it needs the public tunnel origin.

## Stable deployment
Use a named Cloudflare Tunnel mapped to an available hostname such as ai.zenflow.bio, then set LOCAL_AI_URL=https://ai.zenflow.bio. This requires access to your Cloudflare account and domain DNS. Point the tunnel to http://127.0.0.1:8080. Keep the model port 8081 private. Browser-email protection on the inference route would block backend requests; use the dedicated bearer credential (or configure service authentication).

A free website/backend and local inference is a practical prototype. It still depends on this PC and internet connection. Quick Tunnels have changing hostnames and no uptime guarantee. Render free services sleep after 15 idle minutes and use ephemeral disks, so do not move this workspace's data or model there expecting persistence or reliable always-on inference. See https://render.com/docs/free and https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/ .

No hosted environment or DNS changes are made by this implementation.

### Deployment checklist for this repository

Set these two environment variables on the service running `server/index.js`:

- `LOCAL_AI_URL`: the current public HTTPS origin of your Local AI workspace, without `/api` or a trailing path.
- `LOCAL_AI_COACH_TOKEN`: the `coachToken` value from the Local AI machine's `data/config.json`. Do not use its administrator `token`.

Restart or redeploy the backend after saving. No frontend environment variable is required. For local development only, use `http://127.0.0.1:8080` as the URL. Never commit the credential. Both variables must be set to select local AI; otherwise the existing Gemini/rules flow is used.

The Local AI server must include `/api/coach/infer`; deploying this Zenflow repository does not install the model or tunnel. Start Local AI and keep its PC awake and connected. Update the hosted URL whenever a Quick Tunnel restarts, or configure a named tunnel for a stable hostname.

Before making coaching available broadly, update the privacy notice to explain that activity summaries, including recent task and note text, are sent to the configured AI server. Model answers can be inaccurate; the health-keyword filter is only a basic fallback trigger.
