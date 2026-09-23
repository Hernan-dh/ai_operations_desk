# Architecture

## Purpose

AI Operations Desk demonstrates how an operations request moves through validation, AI classification, procedure retrieval, and a bounded escalation decision. n8n is the mandatory orchestration path; deterministic logic remains the post-model policy boundary.

## Components

`server.js` serves the browser application and exposes the same-origin `POST /api/triage` endpoint plus `GET /healthz`. Every triage call is proxied to the required n8n webhook. There is no local decision fallback; an unavailable workflow produces HTTP 503.

```text
Browser UI ── POST /api/triage ──> application proxy ──> required n8n AI workflow
                                                          ├─> Gemini classification
                                                          ├─> structured-output validation
                                                          └─> deterministic approval policy ──> JSON response

n8n unavailable ──> HTTP 503; no local decision is generated
```

- `index.html`, `styles.css`, and `app.js` provide the bilingual public demo. Its Connection dialog selects the n8n workflow as the primary route; custom webhook URLs remain browser-local configuration.
- `triage-engine.js` is retained as testable reference logic, but is not loaded by the production browser or server path.
- `server.js` validates the transport contract, limits request bodies to 16 KB, adds defensive HTTP headers, and proxies decisions to n8n.
- `workflows/triage-request.json` implements the same contract in n8n.
- `workflows/triage-request-ai.json` adds schema-validated Gemini classification and falls back to the baseline on model or parsing failure.
- Both implementations return a category, priority, review decision, missing fields, retrieved procedure, and audit trail.
- The response also carries an `engine` identifier. The UI displays it as execution evidence: `gemini-with-deterministic-policy-v1` for a validated model result or a deterministic fallback identifier when the model cannot be used.

## Trust boundaries

The application server is the default trust boundary for input validation. It accepts triage text from 12 to 1,200 characters. Internet deployments must terminate TLS and add rate limiting at a reverse proxy or platform load balancer. The service is currently stateless and unauthenticated, so it must not be used for private operational data until authentication and durable access-controlled storage are added.

The browser is untrusted. It limits input length for usability, but the workflow repeats validation because client-side constraints can be bypassed. A public deployment must add rate limiting outside n8n. The current workflow has no credentials, persistence, file ingestion, or side-effecting tools.

The managed webhook URL is server configuration. A custom n8n webhook may be selected in the browser and stored in local storage. Both paths require n8n. Synthetic procedures deliberately avoid private organizational data.

A complete deployment must run the application together with n8n; static-only GitHub Pages hosting is not functional. Credentials remain inside n8n and are never exposed to the browser or committed to the repository.

## Evolution path

The model proposes category, priority, and a summary. A post-model code node validates those values, retains missing-information requirements from the deterministic baseline, selects the procedure from a controlled map, and calculates human review from deterministic policy. A later RAG component may replace the in-workflow procedure map while preserving procedure identifiers and citations in the response contract.
