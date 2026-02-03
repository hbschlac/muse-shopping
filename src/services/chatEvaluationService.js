const pool = require('../db/pool');

class ChatEvaluationService {
  static async createRun({ name, metadata = null }) {
    const result = await pool.query(
      `INSERT INTO chat_eval_runs (name, metadata)
       VALUES ($1, $2)
       RETURNING *`,
      [name, metadata ? JSON.stringify(metadata) : null]
    );
    return result.rows[0];
  }

  static async recordCase({ runId, caseName, prompt, expected, actual, passed, notes = null }) {
    const result = await pool.query(
      `INSERT INTO chat_eval_cases (run_id, case_name, prompt, expected, actual, passed, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [runId, caseName, prompt, JSON.stringify(expected), JSON.stringify(actual), passed, notes]
    );
    return result.rows[0];
  }

  static async finalizeRun({ runId, total, passed, failed }) {
    const result = await pool.query(
      `UPDATE chat_eval_runs
       SET total_cases = $2, passed_cases = $3, failed_cases = $4
       WHERE id = $1
       RETURNING *`,
      [runId, total, passed, failed]
    );
    return result.rows[0];
  }
}

module.exports = ChatEvaluationService;
