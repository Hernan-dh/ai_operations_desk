CREATE TABLE IF NOT EXISTS operation_cases (
  id BIGSERIAL PRIMARY KEY,
  external_id VARCHAR(80) NOT NULL UNIQUE,
  request_text VARCHAR(1200) NOT NULL,
  category VARCHAR(32) NOT NULL,
  priority VARCHAR(16) NOT NULL,
  human_review BOOLEAN NOT NULL,
  status VARCHAR(32) NOT NULL CHECK (status IN ('pending_review','routed','approved','rejected')),
  summary VARCHAR(500) NOT NULL,
  next_action VARCHAR(500) NOT NULL,
  missing JSONB NOT NULL DEFAULT '[]',
  procedure JSONB NOT NULL,
  audit JSONB NOT NULL DEFAULT '[]',
  engine VARCHAR(100) NOT NULL,
  decision VARCHAR(16) CHECK (decision IN ('approve','reject')),
  decision_note VARCHAR(1000),
  decided_by VARCHAR(120),
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS operation_cases_status_created_idx ON operation_cases(status, created_at DESC);
