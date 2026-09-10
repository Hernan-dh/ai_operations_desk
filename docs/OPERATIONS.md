# Operations

## Local frontend

Run `python -m http.server 4174 --bind 127.0.0.1` from the repository root. Configure a published n8n webhook in **Connection** to exercise the primary path. Without one, the page uses its deterministic browser fallback with synthetic data.

## Local n8n

Copy `.env.example` to `.env`, replace `N8N_ENCRYPTION_KEY`, and run `docker compose up -d`. Open `http://127.0.0.1:5678`, import the workflow, and publish it. The local setting `N8N_SECURE_COOKIE=false` is only for HTTP development and must not be carried into an internet deployment.

The `.n8n` directory contains local state and is ignored. Back it up before recreating the container. Export material workflows into `workflows/`; credentials must never be included.

## AI workflow

Import `workflows/triage-request-ai.json` without replacing the stable baseline. Create a Google Gemini credential from the n8n credential selector and assign it to **Gemini classifier**; imported workflows intentionally contain no credential identifiers. Run a test execution and confirm the response `engine` is `gemini-with-deterministic-policy-v1`. A missing, unavailable, or invalid model response should instead return `deterministic-fallback-v1`.

The versioned workflow targets Structured Output Parser 1.1, whose schema parameter is named `jsonSchema`. Newer parser versions use `inputSchema`; `scripts/verify.py` checks this version-specific requirement so an ignored schema cannot silently force every model response into fallback.

The AI test endpoint is `/webhook-test/operations-desk-triage-ai`; the published endpoint is `/webhook/operations-desk-triage-ai`. Both preserve the frontend response contract. Keep the baseline endpoint active during rollout so the working demonstration remains recoverable.

When the static demo runs locally on `http://127.0.0.1:4174`, open **Connection** and select **Use local AI workflow**. This stores `http://localhost:5678/webhook/operations-desk-triage-ai` only in that browser and selects the n8n primary route. The local webhook permits that browser origin; for a hosted frontend, paste its own HTTPS webhook URL instead.

## Public deployment

Deploy the static frontend on any static host. For the intended live integration, deploy n8n behind HTTPS, add reverse-proxy rate limiting, configure a durable volume, set a strong encryption key, and restrict editor access. Never expose the n8n editor through an iframe. The static deterministic path remains available only as a recoverable fallback.

### GitHub Pages

The versioned workflow `.github/workflows/deploy-pages.yml` deploys the repository root after a push to `main` and can also be run manually. Once, in the GitHub repository settings, set **Pages** → **Build and deployment** → **Source** to **GitHub Actions**. The generated deployment URL appears in the workflow summary.

Pages hosts only static files and intentionally has no access to `.env` or n8n credentials. The browser fallback is safe to publish, but a configured n8n webhook is the primary integration. A live webhook used from Pages must use HTTPS and must allow the Pages site origin through CORS; never configure it with a wildcard origin when authentication is later added.

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

If the n8n webhook is unavailable, the page automatically applies the deterministic browser fallback and records that condition in its audit trail. It can also be selected explicitly in the Connection dialog. If browser configuration becomes invalid, clear the `ops-connection` local-storage entry. The public demo does not require stored execution data to recover.
