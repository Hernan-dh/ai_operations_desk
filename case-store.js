'use strict';

const { Pool } = require('pg');

class PostgresCaseStore {
  constructor(connectionString) {
    this.pool = new Pool({ connectionString, max: 10, idleTimeoutMillis: 30000 });
  }

  async init() {
    await this.pool.query('SELECT 1');
  }

  async create(requestText, result) {
    const status = result.humanReview ? 'pending_review' : 'routed';
    const { rows } = await this.pool.query(
      `INSERT INTO operation_cases
       (external_id, request_text, category, priority, human_review, status, summary, next_action, missing, procedure, audit, engine)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb,$12)
       RETURNING *`,
      [result.caseId, requestText, result.category, result.priority, result.humanReview, status, result.summary, result.nextAction,
        JSON.stringify(result.missing), JSON.stringify(result.procedure), JSON.stringify(result.audit), result.engine]
    );
    return mapCase(rows[0]);
  }

  async list(status) {
    const values = [];
    let where = '';
    if (status && status !== 'all') { values.push(status); where = 'WHERE status = $1'; }
    const { rows } = await this.pool.query(`SELECT * FROM operation_cases ${where} ORDER BY created_at DESC LIMIT 100`, values);
    return rows.map(mapCase);
  }

  async decide(id, decision, note, actor = 'operator') {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const current = await client.query('SELECT * FROM operation_cases WHERE id = $1 FOR UPDATE', [id]);
      if (!current.rowCount) throw Object.assign(new Error('Case not found.'), { status: 404 });
      if (current.rows[0].status !== 'pending_review') throw Object.assign(new Error('Only pending cases can be decided.'), { status: 409 });
      const status = decision === 'approve' ? 'approved' : 'rejected';
      const { rows } = await client.query(
        `UPDATE operation_cases SET status=$2, decision=$3, decision_note=$4, decided_by=$5, decided_at=NOW(), updated_at=NOW()
         WHERE id=$1 RETURNING *`, [id, status, decision, note, actor]
      );
      await client.query('COMMIT');
      return mapCase(rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }

  async health() { await this.pool.query('SELECT 1'); return true; }
  async close() { await this.pool.end(); }
}

function mapCase(row) {
  return {
    id: row.id, caseId: row.external_id, request: row.request_text, category: row.category,
    priority: row.priority, humanReview: row.human_review, status: row.status, summary: row.summary,
    nextAction: row.next_action, missing: row.missing, procedure: row.procedure, audit: row.audit,
    engine: row.engine, decision: row.decision, decisionNote: row.decision_note,
    decidedBy: row.decided_by, createdAt: row.created_at, updatedAt: row.updated_at, decidedAt: row.decided_at,
  };
}

module.exports = { PostgresCaseStore };
