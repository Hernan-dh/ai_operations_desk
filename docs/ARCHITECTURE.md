# Architecture

## Purpose

AI Operations Desk demonstrates how an operations request moves through validation, classification, procedure retrieval, and a bounded escalation decision. n8n is the primary orchestration path; deterministic logic remains the policy boundary and a recoverable browser fallback, not the intended main execution path.

## Components

```text
Browser UI ── configured n8n webhook (primary) ──> n8n workflow ──> JSON response
    │                                                ├─> deterministic baseline or Gemini enrichment
    │                                                └─> schema validation → deterministic approval policy
    └──── webhook absent or unavailable ──> browser deterministic fallback ──> JSON response
```

- `index.html`, `styles.css`, and `app.js` provide the bilingual public demo. Its Connection dialog selects the n8n workflow as the primary route; custom webhook URLs remain browser-local configuration.
- `triage-engine.js` implements the browser-only deterministic fallback.
- `workflows/triage-request.json` implements the same contract in n8n.
- `workflows/triage-request-ai.json` adds schema-validated Gemini classification and falls back to the baseline on model or parsing failure.
- Both implementations return a category, priority, review decision, missing fields, retrieved procedure, and audit trail.
- The response also carries an `engine` identifier. The UI displays it as execution evidence: `gemini-with-deterministic-policy-v1` for a validated model result or a deterministic fallback identifier when the model cannot be used.

## Trust boundaries

The browser is untrusted. It limits input length for usability, but the workflow repeats validation because client-side constraints can be bypassed. A public deployment must add rate limiting outside n8n. The current workflow has no credentials, persistence, file ingestion, or side-effecting tools.

The webhook URL is optional configuration stored in browser local storage. It is not present in source control. Synthetic procedures deliberately avoid private organizational data.

GitHub Pages can host the static frontend directly from this repository. It has no access to `.env`, n8n state, or credentials. A live integration crosses from the public browser to a separately hosted HTTPS webhook. When that URL is absent or unreachable, the UI records its deterministic fallback in the returned audit trail.

## Evolution path

The model proposes category, priority, and a summary. A post-model code node validates those values, retains missing-information requirements from the deterministic baseline, selects the procedure from a controlled map, and calculates human review from deterministic policy. A later RAG component may replace the in-workflow procedure map while preserving procedure identifiers and citations in the response contract.
