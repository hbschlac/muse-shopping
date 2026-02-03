const pool = require('../db/pool');

class ChatJobRunService {
  static async logRun(jobName, status = 'completed', metadata = null) {
    await pool.query(
      `INSERT INTO chat_job_runs (job_name, status, metadata)
       VALUES ($1, $2, $3)`,
      [jobName, status, metadata ? JSON.stringify(metadata) : null]
    );
  }

  static async getLatestRuns(limit = 5) {
    const res = await pool.query(
      `SELECT job_name, status, run_at, metadata
       FROM chat_job_runs
       ORDER BY run_at DESC
       LIMIT $1`,
      [limit]
    );
    return res.rows;
  }
}

module.exports = ChatJobRunService;
