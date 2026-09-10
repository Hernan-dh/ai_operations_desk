# Agent instructions

## Documentation

- Update `docs/ARCHITECTURE.md` when components, integrations, trust boundaries, or data flows change.
- Update `docs/OPERATIONS.md` when configuration, deployment, verification, or recovery changes.
- Never include credentials, private data, or local environment values in versioned files.

## Publishing

- Run `node --test tests/*.test.cjs` and `python scripts/verify.py` before publishing.
- Do not commit or push without explicit user authorization.
- Never force-push.
