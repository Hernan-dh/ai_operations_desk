# Portfolio evidence

## Public experience

Publish the static page through GitHub Pages. It uses synthetic requests and browser simulation by default, so visitors can explore the complete decision contract without entering personal data or depending on a live provider.

The Connection dialog makes the boundary explicit: n8n is an optional integration, not an implied public backend.

## Evidence to include

Capture these three items after a successful local AI execution. Do not include API keys, user accounts, or n8n credential details.

1. **Public demo:** the landing page with an access request and the rendered case.
2. **Workflow:** the n8n canvas showing Receive request, Deterministic baseline, AI enrich request, Validate AI output, Apply deterministic policy, and Return case.
3. **Execution:** the output panel containing `engine: gemini-with-deterministic-policy-v1`, a required human review, and the audit trail.

## Suggested video script

Keep the recording under one minute:

1. Open the public-demo interface and submit the repository-access example.
2. Point out category, priority, human review, procedure, and audit trail.
3. Open Connection and select the local AI workflow.
4. Repeat the request and point out the decision engine plus the unchanged deterministic safety outcome.
5. Briefly show the n8n workflow, emphasizing that the model proposes classification while the policy node controls missing information and approval.

## Suggested portfolio description

> AI Operations Desk is an auditable operations-triage prototype. A public static demo exposes the product experience with deterministic simulation, while an importable n8n workflow demonstrates Gemini enrichment, schema validation, controlled procedure retrieval, and deterministic human-review policy.
