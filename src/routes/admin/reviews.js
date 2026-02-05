/**
 * Admin Review Moderation Routes
 */

const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../../middleware/authMiddleware');
const pool = require('../../db/pool');

router.use(requireAdmin);

router.get('/', async (req, res) => {
  res.send(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Muse Admin - Reviews</title>
        <style>
          body { font-family: system-ui, sans-serif; margin: 24px; color: #333; }
          h1 { margin: 0 0 16px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { text-align: left; padding: 10px; border-bottom: 1px solid #ddd; }
          .btn { border: 1px solid #ccc; background: #f7f7f7; padding: 6px 10px; cursor: pointer; }
          .muted { color: #777; font-size: 12px; }
          .status-pill { padding: 2px 8px; border-radius: 12px; background: #eee; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>Review Moderation</h1>
        <table id="reviewTable">
          <thead>
            <tr>
              <th>ID</th>
              <th>Item</th>
              <th>Rating</th>
              <th>Reports</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
        <script>
          async function loadReviews() {
            const res = await fetch('/api/v1/admin/reviews/list');
            const data = await res.json();
            const rows = data.data || [];
            const tbody = document.querySelector('#reviewTable tbody');
            tbody.innerHTML = '';
            rows.forEach(row => {
              const tr = document.createElement('tr');
              tr.innerHTML = \`
                <td>\${row.id}</td>
                <td>\${row.item_id}</td>
                <td>\${row.rating}</td>
                <td>\${row.report_count}</td>
                <td><span class="status-pill">\${row.status}</span></td>
                <td>
                  <button class="btn" data-action="hide" data-id="\${row.id}">Hide</button>
                  <button class="btn" data-action="publish" data-id="\${row.id}">Publish</button>
                </td>
              \`;
              tbody.appendChild(tr);
            });

            tbody.querySelectorAll('button').forEach(btn => {
              btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const action = e.currentTarget.getAttribute('data-action');
                await fetch('/api/v1/admin/reviews/' + id + '/status', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: action === 'hide' ? 'hidden' : 'published' })
                });
                loadReviews();
              });
            });
          }
          loadReviews();
        </script>
      </body>
    </html>
  `);
});

router.get('/list', async (req, res) => {
  try {
    const query = `
      SELECT
        r.id,
        r.item_id,
        r.rating,
        r.status,
        COUNT(rr.id)::int as report_count
      FROM item_reviews r
      LEFT JOIN review_reports rr ON rr.review_id = r.id
      GROUP BY r.id
      ORDER BY report_count DESC, r.created_at DESC
      LIMIT 200
    `;
    const result = await pool.query(query);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:reviewId/status', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { status } = req.body;
    if (!['published', 'hidden'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    const result = await pool.query(
      `UPDATE item_reviews SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [status, reviewId]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
