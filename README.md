# AI Operations Desk

An auditable, deployable request-triage application for a small operations team. It classifies incoming requests, persists cases in PostgreSQL, identifies missing information, retrieves the applicable procedure, and provides an operator queue for approval or rejection.

The Node.js server hosts the browser interface and proxies every triage request to the AI workflow in n8n. n8n is mandatory: the application fails closed when the workflow is unavailable. Gemini proposes classification and summary fields; schema validation and deterministic policy constrain the final decision.

The project demonstrates a production-minded combination of APIs and webhooks, n8n self-hosting, LLM integration, prompt engineering, structured output, guarded automation, error handling, and containerized deployment.

## Run locally

Node.js 20+, PostgreSQL, and a running published n8n workflow are required. For ordinary local use, Docker Compose is the supported path.

```powershell
npm start
```

When running without Docker, set `DATABASE_URL`, `OPERATOR_KEY`, and `N8N_WEBHOOK_URL`, then open `http://127.0.0.1:3000`.

## Run on a server

```powershell
docker compose up -d --build
```

Compose starts the application, PostgreSQL, and n8n. The application binds to host loopback port `3002` by default and n8n binds to loopback port `5678`. Import and publish `workflows/triage-request-ai.json`, configure its Gemini credential, and test it before submitting requests. Use `OPERATOR_KEY` to open the operations queue.

For a production installation, follow the provider-neutral [deployment guide](docs/DEPLOYMENT.md).

## Connect n8n

1. Start n8n with `docker compose up -d` or use an existing instance.
2. Import `workflows/triage-request-ai.json` as the required application workflow. `workflows/triage-request.json` is retained as the credential-free deterministic baseline.
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

## Deployment

The frontend requires its same-origin API, PostgreSQL, and n8n; static-only GitHub Pages hosting is not functional. Deploy the complete Compose stack behind HTTPS.

## Portfolio evidence

The application is intentionally transparent about using synthetic data and requiring the versioned AI workflow. Pair it with a short n8n execution recording to demonstrate the Gemini integration without exposing credentials. See [portfolio evidence](docs/PORTFOLIO.md) for a capture checklist, video outline, and suggested project description.

## Verify

```powershell
node --test tests/*.test.cjs
python scripts/verify.py
```

## Case API

- `POST /api/triage` analyzes and persists a case.
- `GET /api/cases?status=pending_review` lists cases and requires `X-Operator-Key`.
- `POST /api/cases/:id/decision` accepts `approve` or `reject` and requires `X-Operator-Key`.
- `GET /healthz` verifies application and database readiness.

Requests are rate limited per client IP. Application logs are structured JSON and include a correlation request ID without logging request bodies or credentials.

## Publish changes

Configure at least one of `GEMINI_API_KEY`, `GROQ_API_KEY`, or `OPENROUTER_API_KEY` in the ignored `.env` file. Preview the generated Conventional Commit metadata without modifying Git:

```powershell
python scripts/publish.py --preview
```

Run without `--preview` to verify, stage, commit, and push after typing the explicit `PUBLISH` confirmation. A GitHub remote named `origin` must already exist.

## Current scope

- Three operational categories: access, billing, and technical support.
- n8n AI workflow as the mandatory orchestration path, with deterministic post-model policy.
- Synthetic procedures and examples only.
- PostgreSQL persistence with an operator approval/rejection lifecycle.
- Gemini classification is the primary workflow. The RAG index and evaluation dataset remain planned increments rather than simulated claims.

See [architecture](docs/ARCHITECTURE.md), [operations](docs/OPERATIONS.md), and the [roadmap](docs/ROADMAP.md).
