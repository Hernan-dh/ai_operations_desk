# Roadmap

## Increment 1 — baseline (current)

- Bilingual public interface.
- Explainable deterministic routing.
- Synthetic procedure retrieval.
- n8n webhook with the same response contract.
- No-cost simulation fallback.

## Increment 2 — AI enrichment

- Add an optional LLM classifier with structured output.
- Keep deterministic approval and input-validation policies.
- Record model, latency, and fallback reason in the audit event.
- Build a labeled evaluation fixture before accepting model routing.

## Increment 3 — grounded knowledge

- Move procedures into Markdown documents.
- Index them in pgvector or Qdrant.
- Return chunk-level citations and reject unsupported answers.
- Test retrieval separately from answer generation.

## Increment 4 — case lifecycle

- Persist cases and append-only events.
- Add reviewer approval and rejection links.
- Add SLA timers and anonymized operational metrics.
- Keep all connectors in a sandbox or mock tenant for the public demo.

## Increment 5 — portfolio publication

- Deploy the static demo.
- Add architecture and threat-model visuals.
- Publish evaluation results and known limitations.
- Link the repository and demo from the main portfolio.
