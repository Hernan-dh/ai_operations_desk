# Architecture

## Purpose

AI Operations Desk demonstrates how an operations request moves through validation, classification, procedure retrieval, and a bounded escalation decision. The current release is an explainable deterministic baseline, not a production decision system.

## Components

```text
Browser UI ── simulation mode ──> shared triage contract
    │
    └──── n8n mode ──> public webhook ──> deterministic baseline ──> JSON response
                                              │
                                              └─> optional Gemini enrichment
                                                   ─> schema validation
                                                   ─> deterministic approval policy
```

- `index.html`, `styles.css`, and `app.js` provide the bilingual public demo.
- `triage-engine.js` implements the zero-cost browser baseline.
- `workflows/triage-request.json` implements the same contract in n8n.
- `workflows/triage-request-ai.json` adds schema-validated Gemini classification and falls back to the baseline on model or parsing failure.
- Both implementations return a category, priority, review decision, missing fields, retrieved procedure, and audit trail.

## Trust boundaries

The browser is untrusted. It limits input length for usability, but the workflow repeats validation because client-side constraints can be bypassed. A public deployment must add rate limiting outside n8n. The current workflow has no credentials, persistence, file ingestion, or side-effecting tools.

The webhook URL is optional configuration stored in browser local storage. It is not present in source control. Synthetic procedures deliberately avoid private organizational data.

## Evolution path

The model only proposes category, priority, summary, and missing information. A post-model code node validates those values, selects the procedure from a controlled map, and calculates human review from deterministic policy. A later RAG component may replace the in-workflow procedure map while preserving procedure identifiers and citations in the response contract.
