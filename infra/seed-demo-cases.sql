WITH demo AS (
  SELECT
    i,
    'OPS-DEMO-' || LPAD(i::text, 3, '0') AS external_id,
    CASE (i - 1) % 4
      WHEN 0 THEN 'access'
      WHEN 1 THEN 'billing'
      WHEN 2 THEN 'technical'
      ELSE 'general'
    END AS category,
    CASE
      WHEN i <= 8 THEN 'pending_review'
      WHEN i <= 12 THEN 'routed'
      WHEN i <= 16 THEN 'approved'
      ELSE 'rejected'
    END AS status
  FROM generate_series(1, 20) AS series(i)
)
INSERT INTO operation_cases (
  external_id, request_text, category, priority, human_review, status,
  summary, next_action, missing, procedure, audit, engine,
  decision, decision_note, decided_by, decided_at, created_at, updated_at
)
SELECT
  external_id,
  CASE category
    WHEN 'access' THEN 'Demo request ' || i || ': access to the ticketing operations dashboard is required today.'
    WHEN 'billing' THEN 'Demo invoice INV-DEMO-' || LPAD(i::text, 3, '0') || ' has an incorrect amount of USD ' || (100 + i * 15) || '.'
    WHEN 'technical' THEN 'Demo incident ' || i || ': the ticket validation service is unavailable for the operations team.'
    ELSE 'Demo request ' || i || ': coordinate an operational update before tomorrow.'
  END,
  category,
  CASE WHEN i % 5 = 0 THEN 'high' WHEN i % 2 = 0 THEN 'medium' ELSE 'normal' END,
  status IN ('pending_review', 'approved', 'rejected'),
  status,
  'Synthetic ' || category || ' case created to verify the operations queue.',
  CASE status
    WHEN 'pending_review' THEN 'Await an accountable operator decision.'
    WHEN 'routed' THEN 'Route the case to the operations queue.'
    WHEN 'approved' THEN 'Proceed with the approved operational action.'
    ELSE 'Close the request without executing the proposed action.'
  END,
  CASE WHEN category = 'access' THEN '["responsible approver"]'::jsonb ELSE '[]'::jsonb END,
  CASE category
    WHEN 'access' THEN '{"id":"OPS-ACC-003","title":"Repository and system access","excerpt":"Confirm the resource, business need, and accountable approver before granting access."}'::jsonb
    WHEN 'billing' THEN '{"id":"OPS-FIN-004","title":"Invoice discrepancy review","excerpt":"Record the invoice reference and disputed amount; finance must approve any correction."}'::jsonb
    WHEN 'technical' THEN '{"id":"OPS-TEC-002","title":"Service incident response","excerpt":"Identify the affected service, impact, and start time before assigning incident severity."}'::jsonb
    ELSE '{"id":"OPS-GEN-001","title":"General request intake","excerpt":"Confirm the objective, desired deadline, and accountable owner before routing the request."}'::jsonb
  END,
  '["Synthetic input validated","Demo procedure selected","Case seeded for operations testing"]'::jsonb,
  CASE WHEN i % 3 = 0 THEN 'deterministic-fallback-v1' ELSE 'gemini-with-deterministic-policy-v1' END,
  CASE status WHEN 'approved' THEN 'approve' WHEN 'rejected' THEN 'reject' ELSE NULL END,
  CASE status WHEN 'approved' THEN 'Approved during synthetic queue verification.' WHEN 'rejected' THEN 'Rejected during synthetic queue verification.' ELSE NULL END,
  CASE WHEN status IN ('approved', 'rejected') THEN 'demo-operator' ELSE NULL END,
  CASE WHEN status IN ('approved', 'rejected') THEN NOW() - ((20 - i) || ' hours')::interval ELSE NULL END,
  NOW() - ((21 - i) || ' hours')::interval,
  NOW() - ((20 - i) || ' hours')::interval
FROM demo
ON CONFLICT (external_id) DO NOTHING;
