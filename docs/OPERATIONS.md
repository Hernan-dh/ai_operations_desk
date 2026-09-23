# Operations

## Application server

`N8N_TIMEOUT_MS` controls how long the application waits for the n8n AI workflow and defaults to 45 seconds. Keep the reverse-proxy upstream timeout above this value so slower model responses can complete.

`CASE_DB_PASSWORD` and `OPERATOR_KEY` are mandatory secrets. `RATE_LIMIT_PER_MINUTE` defaults to 60 requests per client IP. Generate distinct values for every environment and never commit `.env`.

Application logs are newline-delimited JSON. `case_created`, `case_decided`, `request_failed`, and `rate_limit_exceeded` include `requestId` for correlation. Request contents and credentials are not logged.

Run `npm start` from the repository root and open `http://127.0.0.1:3000`. The server binds to `0.0.0.0` by default; configure `HOST` and `PORT` when running without Docker. Confirm readiness with `GET /healthz`.

For a container deployment, run `docker compose up -d --build`. This starts the application, PostgreSQL, and mandatory n8n service. Import `workflows/triage-request-ai.json`, assign the Gemini credential, test it, and publish it before accepting traffic. `APP_PORT` controls the loopback application port and defaults to `3002`. See [deployment](DEPLOYMENT.md).

## Local n8n

Copy `.env.example` to `.env`, replace `N8N_ENCRYPTION_KEY`, and run `docker compose up -d`. Open `http://127.0.0.1:5678`, import `workflows/triage-request-ai.json`, configure **Gemini classifier**, execute a test, and publish it. The application proxy targets `/webhook/operations-desk-triage-ai` by default. The local setting `N8N_SECURE_COOKIE=false` is only for HTTP development.

The `.n8n` directory contains local state and is ignored. Back it up before recreating the container. Export material workflows into `workflows/`; credentials must never be included.

## AI workflow

Import `workflows/triage-request-ai.json` without replacing the stable baseline. Create a Google Gemini credential from the n8n credential selector and assign it to **Gemini classifier**; imported workflows intentionally contain no credential identifiers. Run a test execution and confirm the response `engine` is `gemini-with-deterministic-policy-v1`. A missing, unavailable, or invalid model response should instead return `deterministic-fallback-v1`.

The versioned workflow targets Structured Output Parser 1.1, whose schema parameter is named `jsonSchema`. Newer parser versions use `inputSchema`; `scripts/verify.py` checks this version-specific requirement so an ignored schema cannot silently force every model response into fallback.

The AI test endpoint is `/webhook-test/operations-desk-triage-ai`; the published endpoint is `/webhook/operations-desk-triage-ai`. Both preserve the frontend response contract. Keep the baseline endpoint active during rollout so the working demonstration remains recoverable.

When the static demo runs locally on `http://127.0.0.1:4174`, open **Connection** and select **Use local AI workflow**. This stores `http://localhost:5678/webhook/operations-desk-triage-ai` only in that browser and selects the n8n primary route. The local webhook permits that browser origin; for a hosted frontend, paste its own HTTPS webhook URL instead.

## Public deployment

Deploy the complete application, PostgreSQL, and n8n stack behind HTTPS. Add reverse-proxy rate limiting, keep durable volumes, set strong distinct secrets, and restrict editor access. Never expose the n8n editor through an iframe.

### GitHub Pages

The versioned workflow `.github/workflows/deploy-pages.yml` deploys the repository root after a push to `main` and can also be run manually. Once, in the GitHub repository settings, set **Pages** → **Build and deployment** → **Source** to **GitHub Actions**. The generated deployment URL appears in the workflow summary.

GitHub Pages alone is not a functional deployment because n8n is mandatory. If the frontend is published separately, its n8n route must use HTTPS and allow only the frontend origin through CORS. Credentials must remain inside n8n.

## Verification

Run:

```powershell
node --test tests/*.test.cjs
python scripts/verify.py
python -m unittest discover -s tests -p "test_*.py"
```

These checks cover deterministic routing, validation, local HTML resources, and workflow JSON structure. They do not verify an imported n8n instance, browser layout, external hosting, or future model quality.

## Publishing

`scripts/publish.py` reads provider keys from the ignored `.env` file and tries commit-metadata providers in this order: configured Gemini models, Groq, then configured OpenRouter models. `OPENROUTER_MODEL` is accepted as a compatibility alias for the commit-specific settings. When a specific OpenRouter model is configured, the current `openrouter/free` capability router is appended as its fallback so retired or temporarily saturated free endpoints do not break publication. OpenRouter requests use a low reasoning effort and a larger completion budget so reasoning models still have room to return the required JSON. Each failure advances to the next provider without staging files. Generated titles must follow Conventional Commits and descriptions are limited to 500 characters. The default request timeout is 45 seconds because free inference endpoints may have cold-start latency.

Use `python scripts/publish.py --preview` to verify the repository and inspect the proposal without changing Git. A real publication additionally checks for `origin`, requests the exact confirmation `PUBLISH`, stages the detected paths, verifies again, commits, and pushes the current branch. Manual `--title` and `--description` values allow publishing without an AI provider.

Repository diffs and new text-file excerpts are sent to the selected external model when metadata is generated. Review pending files for secrets or private information before running the command. The context is truncated to 24,000 characters, and `.gitignore` exclusions apply.

## Recovery

If n8n or its published workflow is unavailable, triage returns an error and no local decision is generated. Restore the n8n service and verify the production webhook before retrying. Clear `ops-connection` in browser local storage to return from a custom n8n URL to the server-managed n8n route.
