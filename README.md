# AI Operations Desk

An auditable request-triage demo for a small operations team. It classifies an incoming request, identifies missing information, retrieves the applicable internal procedure, and decides whether human review is required.

The n8n workflow is the primary integration and implements the request/response contract. The public browser page uses a deterministic engine only as a local fallback when no webhook is configured or the workflow cannot be reached.

## Run the demo

Python 3 and Node.js 20+ are sufficient.

```powershell
python -m http.server 4174 --bind 127.0.0.1
```

Open `http://127.0.0.1:4174`.

## Connect n8n

1. Start n8n with `docker compose up -d` or use an existing instance.
2. Import `workflows/triage-request-ai.json` for the primary n8n workflow, or `workflows/triage-request.json` for its credential-free baseline variant.
3. Publish the workflow and copy its production webhook URL.
4. In the demo, open **Connection**, select **n8n webhook**, and paste the URL.

Do not expose an unrestricted webhook permanently. Add rate limiting at the reverse proxy and keep credentials inside n8n.

### Enable AI classification

Import `workflows/triage-request-ai.json` as a separate workflow. In n8n, create a Google Gemini credential using your API key and select it in **Gemini classifier**. Test the workflow before publishing it, then connect the frontend to:

```text
http://localhost:5678/webhook/operations-desk-triage-ai
```

The AI workflow validates structured model output and applies approval policy after the model. If the model fails or returns invalid data, the deterministic baseline produces the response. Keep the original workflow active until the AI endpoint has been verified.

For the local demo, use **Connection** → **Use local AI workflow**. The button selects this URL only in your browser; it is never versioned:

```text
http://localhost:5678/webhook/operations-desk-triage-ai
```

## Publish the static demo

The repository includes a GitHub Pages workflow. In GitHub, open **Settings** → **Pages**, select **GitHub Actions** as the source, and push the default branch. The Actions workflow deploys the static frontend automatically.

The public demo is wired for an n8n connection. Provide an HTTPS webhook URL through **Connection** to use the live workflow. Without one, or if that workflow is unavailable, the page explicitly falls back to deterministic browser triage using synthetic data. A public HTTPS page cannot call a local or plain-HTTP endpoint because browsers block mixed-content requests.

## Portfolio evidence

The public page is intentionally transparent about using synthetic data and simulation by default. Pair it with the versioned AI workflow and a short local-execution recording to demonstrate the real Gemini integration without exposing a permanent public webhook. See [portfolio evidence](docs/PORTFOLIO.md) for a capture checklist, video outline, and suggested project description.

## Verify

```powershell
node --test tests/*.test.cjs
python scripts/verify.py
```

## Publish changes

Configure at least one of `GEMINI_API_KEY`, `GROQ_API_KEY`, or `OPENROUTER_API_KEY` in the ignored `.env` file. Preview the generated Conventional Commit metadata without modifying Git:

```powershell
python scripts/publish.py --preview
```

Run without `--preview` to verify, stage, commit, and push after typing the explicit `PUBLISH` confirmation. A GitHub remote named `origin` must already exist.

## Current scope

- Three operational categories: access, billing, and technical support.
- n8n as the primary orchestration path, with deterministic policy and browser fallback.
- Synthetic procedures and examples only.
- No persistence and no external side effects.
- Gemini enrichment is available in a separate opt-in workflow; the RAG index, approval inbox, and evaluation dataset remain planned increments rather than simulated claims.

See [architecture](docs/ARCHITECTURE.md), [operations](docs/OPERATIONS.md), and the [roadmap](docs/ROADMAP.md).
