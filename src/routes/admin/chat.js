/**
 * Admin Chat Routes + UI
 */

const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../../middleware/authMiddleware');
const ChatService = require('../../services/chatService');
const ExportStorageService = require('../../services/exportStorageService');
const ChatJobRunService = require('../../services/chatJobRunService');
const ChatProfileVersionService = require('../../services/chatProfileVersionService');
const ShopperProfileService = require('../../services/shopperProfileService');
const PreferencesService = require('../../services/preferencesService');
const ChatPreferenceDecayJob = require('../../jobs/chatPreferenceDecayJob');
const ChatSessionSummaryJob = require('../../jobs/chatSessionSummaryJob');
const pool = require('../../db/pool');

router.use(requireAdmin);

async function loadCurrentProfile(userId) {
  return {
    shopper: await ShopperProfileService.getShopperProfile(userId).catch(() => null),
    preferences: await PreferencesService.getPreferences(userId).catch(() => null),
  };
}

router.get('/analytics', async (req, res) => {
  try {
    const { from, to } = req.query;
    const data = await ChatService.getAnalytics({
      from: from ? new Date(from) : null,
      to: to ? new Date(to) : null,
    });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/tags', async (_req, res) => {
  try {
    const tags = await ChatService.listTags();
    res.json({ success: true, data: tags });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/tags', async (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ success: false, error: 'name is required' });
    }
    const created = await ChatService.createTag(name.trim().toLowerCase());
    res.json({ success: true, data: created });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/sessions/:id/tags', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const tags = await ChatService.getSessionTags(sessionId);
    res.json({ success: true, data: tags });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/sessions/:id/tags', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const { tag_id } = req.body || {};
    if (!tag_id) {
      return res.status(400).json({ success: false, error: 'tag_id is required' });
    }
    const added = await ChatService.addTagToSession(sessionId, parseInt(tag_id), req.userId || null);
    res.json({ success: true, data: added });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/sessions/:id/tags/:tagId', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const tagId = parseInt(req.params.tagId);
    const removed = await ChatService.removeTagFromSession(sessionId, tagId);
    res.json({ success: true, data: removed });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/flags/queue', async (_req, res) => {
  try {
    const data = await ChatService.listFlagQueue();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/flags/export', async (req, res) => {
  try {
    const { format = 'json', status = 'open' } = req.query;
    const data = await ChatService.exportRange({
      onlyFlagged: true,
      flagStatus: status || null,
    });

    if (format === 'csv') {
      const rows = [];
      rows.push(['type','session_id','user_id','role','content','note','label','flag_status','created_at']);

      data.sessions.forEach((s) => {
        rows.push(['session', s.id, s.user_id || '', '', '', '', s.label || '', '', s.created_at]);
      });
      data.messages.forEach((m) => {
        rows.push(['message', m.session_id, '', m.role, (m.content || '').replace(/\n/g, ' '), '', '', '', m.created_at]);
      });
      data.notes.forEach((n) => {
        rows.push(['note', n.session_id, n.admin_user_id || '', '', '', (n.note || '').replace(/\n/g, ' '), '', '', n.created_at]);
      });
      data.flags.forEach((f) => {
        rows.push(['flag', f.session_id, f.created_by || '', '', '', f.reason || '', '', f.status || '', f.created_at]);
      });

      const csv = rows.map((r) => r.map((v) => {
        const s = String(v ?? '');
        if (s.includes(',') || s.includes('"')) {
          return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      }).join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="chat-flagged-export.csv"');
      return res.send(csv);
    }

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/exports', async (req, res) => {
  try {
    const { storage = process.env.CHAT_EXPORT_STORAGE || 'local' } = req.query;
    const bucket = process.env.CHAT_EXPORT_BUCKET || '';
    const prefix = process.env.CHAT_EXPORT_PREFIX || 'chat-exports';
    const localDir = process.env.CHAT_EXPORT_DIR || undefined;

    const objects = await ExportStorageService.listObjects({
      provider: storage,
      bucket,
      prefix: storage === 'local' ? localDir : prefix,
    });

    res.json({ success: true, data: objects });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/exports/runs', async (req, res) => {
  try {
    const { limit = '100' } = req.query;
    const runs = await ChatService.listExportRuns(parseInt(limit, 10));
    res.json({ success: true, data: runs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/exports/download', async (req, res) => {
  try {
    const { key, storage = process.env.CHAT_EXPORT_STORAGE || 'local', expires_in } = req.query;
    if (!key) {
      return res.status(400).json({ success: false, error: 'key is required' });
    }

    if (storage === 'local') {
      const fs = require('fs');
      const path = require('path');
      const localDir = process.env.CHAT_EXPORT_DIR || path.join(process.cwd(), 'exports');
      const filePath = path.join(localDir, key);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, error: 'file not found' });
      }
      return res.download(filePath);
    }

    const url = await ExportStorageService.getDownloadUrl({
      provider: storage,
      bucket: process.env.CHAT_EXPORT_BUCKET || '',
      key,
      expiresIn: parseInt(expires_in, 10) || parseInt(process.env.CHAT_EXPORT_URL_TTL_SECONDS || '3600', 10),
      publicBaseUrl: process.env.CHAT_EXPORT_PUBLIC_BASE || null,
    });

    res.json({ success: true, data: { url } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/flags', async (req, res) => {
  try {
    const { status } = req.query;
    const flags = await ChatService.listFlags({ status: status || null });
    res.json({ success: true, data: flags });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/profile-diffs', async (req, res) => {
  try {
    const { user_id, limit = '50' } = req.query;
    const params = [];
    let where = '';
    if (user_id) {
      params.push(parseInt(user_id));
      where = 'WHERE user_id = $1';
    }
    params.push(parseInt(limit));
    const result = await pool.query(
      `SELECT id, user_id, before_profile, after_profile, created_at
       FROM chat_profile_diffs ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length}`,
      params
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/profile-versions', async (req, res) => {
  try {
    const { user_id, limit = '20' } = req.query;
    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }
    const versions = await ChatProfileVersionService.listVersions(parseInt(user_id, 10), parseInt(limit, 10));
    res.json({ success: true, data: versions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/profile-versions/:id/preview', async (req, res) => {
  try {
    const versionId = parseInt(req.params.id, 10);
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }
    const versions = await ChatProfileVersionService.listVersions(parseInt(user_id, 10), 1);
    const current = await loadCurrentProfile(parseInt(user_id, 10));
    const versionRes = await pool.query(
      'SELECT id, snapshot, created_at FROM chat_profile_versions WHERE id = $1 AND user_id = $2',
      [versionId, parseInt(user_id, 10)]
    );
    if (versionRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'version not found' });
    }
    res.json({ success: true, data: { version: versionRes.rows[0], current, latest_versions: versions } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/profile-versions/:id/restore', async (req, res) => {
  try {
    const versionId = parseInt(req.params.id, 10);
    const { user_id } = req.body || {};
    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }
    const restored = await ChatProfileVersionService.restoreVersion(parseInt(user_id, 10), versionId);
    if (!restored) {
      return res.status(404).json({ success: false, error: 'version not found' });
    }
    res.json({ success: true, data: restored });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/reviews', async (req, res) => {
  try {
    const { status = 'open' } = req.query;
    const result = await ChatService.listReviewItems(status);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/jobs/runs', async (req, res) => {
  try {
    const { limit = '10' } = req.query;
    const runs = await ChatJobRunService.getLatestRuns(parseInt(limit, 10));
    res.json({ success: true, data: runs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/jobs/run', async (req, res) => {
  try {
    const { job } = req.body || {};
    if (!job) {
      return res.status(400).json({ success: false, error: 'job is required' });
    }
    const jobName = String(job);
    if (!['preference_decay', 'session_summary'].includes(jobName)) {
      return res.status(400).json({ success: false, error: 'unsupported job' });
    }

    let runner;
    if (jobName === 'preference_decay') {
      runner = new ChatPreferenceDecayJob();
    } else {
      runner = new ChatSessionSummaryJob();
    }

    await runner.run();
    await ChatJobRunService.logRun(jobName, 'completed', { trigger: 'admin', user_id: req.userId || null });
    res.json({ success: true, data: { job: jobName, status: 'completed' } });
  } catch (error) {
    await ChatJobRunService.logRun(req.body?.job || 'unknown', 'failed', { error: error.message, trigger: 'admin', user_id: req.userId || null });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/reviews', async (req, res) => {
  try {
    const { session_id, message_id, reason, priority = 2 } = req.body || {};
    if (!session_id || !reason) {
      return res.status(400).json({ success: false, error: 'session_id and reason are required' });
    }
    const created = await ChatService.createReviewItem({
      sessionId: parseInt(session_id),
      messageId: message_id ? parseInt(message_id) : null,
      reason,
      priority: parseInt(priority, 10) || 2,
      createdBy: req.userId || null,
    });
    res.json({ success: true, data: created });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/reviews/:id/resolve', async (req, res) => {
  try {
    const { resolution_notes } = req.body || {};
    const resolved = await ChatService.resolveReviewItem({
      reviewId: parseInt(req.params.id),
      resolvedBy: req.userId || null,
      resolutionNotes: resolution_notes || null,
    });
    res.json({ success: true, data: resolved });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/reviews/:id/feedback', async (req, res) => {
  try {
    const { rating } = req.body || {};
    if (!rating) {
      return res.status(400).json({ success: false, error: 'rating is required' });
    }
    const reviewId = parseInt(req.params.id);
    const review = await pool.query(
      'SELECT message_id FROM chat_review_items WHERE id = $1',
      [reviewId]
    );
    if (review.rows.length === 0 || !review.rows[0].message_id) {
      return res.status(404).json({ success: false, error: 'review item not found or missing message_id' });
    }
    await ChatService.submitFeedback(review.rows[0].message_id, parseInt(rating, 10), 'review_feedback');
    res.json({ success: true, data: { review_id: reviewId } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/flags', async (req, res) => {
  try {
    const { session_id, reason } = req.body || {};
    if (!session_id || !reason) {
      return res.status(400).json({ success: false, error: 'session_id and reason are required' });
    }
    const created = await ChatService.createFlag(parseInt(session_id), reason.trim(), req.userId || null);
    res.json({ success: true, data: created });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/flags/:id/resolve', async (req, res) => {
  try {
    const flagId = parseInt(req.params.id);
    const resolved = await ChatService.resolveFlag(flagId, req.userId || null);
    res.json({ success: true, data: resolved });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/export', async (req, res) => {
  try {
    const {
      from,
      to,
      format = 'json',
      storage = 'local',
      only_flagged,
      flag_status
    } = req.query;
    const data = await ChatService.exportRange({
      from: from ? new Date(from) : null,
      to: to ? new Date(to) : null,
      onlyFlagged: only_flagged === 'true',
      flagStatus: flag_status || null,
    });

    if (format === 'csv') {
      const rows = [];
      rows.push(['type','session_id','user_id','role','content','note','label','created_at']);

      data.sessions.forEach((s) => {
        rows.push(['session', s.id, s.user_id || '', '', '', '', s.label || '', s.created_at]);
      });
      data.messages.forEach((m) => {
        rows.push(['message', m.session_id, '', m.role, (m.content || '').replace(/\n/g, ' '), '', '', m.created_at]);
      });
      data.notes.forEach((n) => {
        rows.push(['note', n.session_id, n.admin_user_id || '', '', '', (n.note || '').replace(/\n/g, ' '), '', n.created_at]);
      });

      const csv = rows.map((r) => r.map((v) => {
        const s = String(v ?? '');
        if (s.includes(',') || s.includes('"')) {
          return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      }).join(',')).join('\n');

      if (storage && storage !== 'local') {
        const key = `chat-exports/chat-export-${Date.now()}.csv`;
        const location = await ExportStorageService.uploadBuffer({
          provider: storage,
          bucket: process.env.CHAT_EXPORT_BUCKET || '',
          key,
          contentType: 'text/csv',
          data: Buffer.from(csv, 'utf-8'),
          localDir: process.env.CHAT_EXPORT_DIR,
        });
        await ChatService.logExportRun({
          storageProvider: storage,
          bucket: process.env.CHAT_EXPORT_BUCKET || '',
          exportKey: key,
          format: 'csv',
          onlyFlagged: only_flagged === 'true',
          from: from ? new Date(from) : null,
          to: to ? new Date(to) : null,
          recordCounts: {
            sessions: data.sessions.length,
            messages: data.messages.length,
            notes: data.notes.length,
            flags: data.flags.length,
          },
          createdBy: req.userId || null,
        });
        return res.json({ success: true, data: { storage: location, key } });
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=\"chat-export.csv\"');
      return res.send(csv);
    }

    if (storage && storage !== 'local') {
      const key = `chat-exports/chat-export-${Date.now()}.json`;
      const location = await ExportStorageService.uploadBuffer({
        provider: storage,
        bucket: process.env.CHAT_EXPORT_BUCKET || '',
        key,
        contentType: 'application/json',
        data: Buffer.from(JSON.stringify(data, null, 2), 'utf-8'),
        localDir: process.env.CHAT_EXPORT_DIR,
      });
      await ChatService.logExportRun({
        storageProvider: storage,
        bucket: process.env.CHAT_EXPORT_BUCKET || '',
        exportKey: key,
        format: 'json',
        onlyFlagged: only_flagged === 'true',
        from: from ? new Date(from) : null,
        to: to ? new Date(to) : null,
        recordCounts: {
          sessions: data.sessions.length,
          messages: data.messages.length,
          notes: data.notes.length,
          flags: data.flags.length,
        },
        createdBy: req.userId || null,
      });
      return res.json({ success: true, data: { storage: location, key } });
    }

    await ChatService.logExportRun({
      storageProvider: storage,
      bucket: storage === 'local' ? null : (process.env.CHAT_EXPORT_BUCKET || ''),
      exportKey: null,
      format: format === 'csv' ? 'csv' : 'json',
      onlyFlagged: only_flagged === 'true',
      from: from ? new Date(from) : null,
      to: to ? new Date(to) : null,
      recordCounts: {
        sessions: data.sessions.length,
        messages: data.messages.length,
        notes: data.notes.length,
        flags: data.flags.length,
      },
      createdBy: req.userId || null,
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/saved-searches', async (req, res) => {
  try {
    const searches = await ChatService.listSavedSearches(req.userId || null);
    res.json({ success: true, data: searches });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/saved-searches', async (req, res) => {
  try {
    const { name, filters } = req.body || {};
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ success: false, error: 'name is required' });
    }
    const created = await ChatService.createSavedSearch(name.trim(), req.userId || null, filters || {});
    res.json({ success: true, data: created });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/saved-searches/:id', async (req, res) => {
  try {
    const deleted = await ChatService.deleteSavedSearch(parseInt(req.params.id), req.userId || null);
    res.json({ success: true, data: deleted });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/sessions', async (req, res) => {
  try {
    const {
      limit = '50',
      user_id,
      q,
      from,
      to
    } = req.query;

    const sessions = await ChatService.listSessions({
      limit: parseInt(limit),
      userId: user_id ? parseInt(user_id) : null,
      query: q || null,
      from: from ? new Date(from) : null,
      to: to ? new Date(to) : null,
    });
    res.json({ success: true, data: sessions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/sessions/:id/notes', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const notes = await ChatService.getSessionNotes(sessionId);
    res.json({ success: true, data: notes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/sessions/:id/notes', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const { note } = req.body || {};

    if (!note || typeof note !== 'string') {
      return res.status(400).json({ success: false, error: 'note is required' });
    }

    const created = await ChatService.addSessionNote(sessionId, req.userId || null, note.trim());
    res.json({ success: true, data: created });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/sessions/:id/export', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const exportData = await ChatService.getSessionExport(sessionId);
    res.json({ success: true, data: exportData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/sessions/:id/label', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const { label } = req.body || {};
    if (!label || typeof label !== 'string') {
      return res.status(400).json({ success: false, error: 'label is required' });
    }
    const updated = await ChatService.setSessionLabel(sessionId, label.trim());
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/sessions/:id', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const messages = await ChatService.getSessionMessages(sessionId);
    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/ui', async (_req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Muse Chat Admin</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f4f1ed;
      --ink: #221f1b;
      --muted: #6f655b;
      --accent: #0f766e;
      --panel: #ffffff;
      --border: #e2dcd4;
      --subtle: #faf7f2;
      --chip: #efe7de;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "GT Walsheim", "Avenir Next", "Segoe UI", sans-serif;
      background: radial-gradient(circle at top left, #fefaf4 0%, #f4efe7 55%, #efe8dd 100%);
      color: var(--ink);
    }
    .wrap {
      max-width: 1240px;
      margin: 36px auto 60px;
      padding: 24px;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 24px;
      margin-bottom: 20px;
    }
    h1 { margin: 0; font-size: 28px; }
    p { margin: 4px 0 0; color: var(--muted); }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .panel {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 18px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.06);
    }
    .panel h3 { margin-top: 0; }
    label { display: block; font-size: 13px; color: var(--muted); margin-bottom: 6px; }
    input, textarea, select {
      width: 100%;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 10px 12px;
      font-size: 14px;
      font-family: inherit;
      background: #fff;
    }
    textarea { min-height: 110px; resize: vertical; }
    .row { margin-bottom: 12px; }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; }
    button {
      border: none;
      background: var(--accent);
      color: white;
      padding: 10px 16px;
      border-radius: 999px;
      cursor: pointer;
      font-weight: 600;
    }
    button.secondary { background: #efe7de; color: var(--ink); }
    button.ghost { background: transparent; color: var(--ink); border: 1px solid var(--border); }
    pre {
      background: #121212;
      color: #e7e7e7;
      padding: 14px;
      border-radius: 12px;
      overflow: auto;
      font-size: 12px;
    }
    .item {
      display: grid;
      grid-template-columns: 72px 1fr;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid var(--border);
    }
    .item:last-child { border-bottom: none; }
    .thumb {
      width: 72px; height: 90px; border-radius: 10px; background: #e7e2dc; overflow: hidden;
      display: flex; align-items: center; justify-content: center; color: var(--muted); font-size: 12px;
    }
    .pill { display: inline-block; background: var(--chip); padding: 3px 8px; border-radius: 999px; font-size: 11px; margin-right: 6px; }

    .table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .table th, .table td {
      text-align: left;
      padding: 8px 10px;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
    }
    .table th { color: var(--muted); font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
    .table tr:hover { background: var(--subtle); cursor: pointer; }
    .chip { background: var(--chip); border-radius: 999px; padding: 2px 8px; display: inline-block; font-size: 11px; }
    .mono { font-family: "SFMono-Regular", "Menlo", "Monaco", monospace; font-size: 12px; }

    .message-list {
      max-height: 380px;
      overflow: auto;
      padding-right: 4px;
    }
    .message {
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 10px 12px;
      margin-bottom: 10px;
      background: #fff;
    }
    .message.assistant { border-left: 4px solid var(--accent); }
    .message.user { border-left: 4px solid #d4a373; }
    .message .meta { color: var(--muted); font-size: 11px; margin-bottom: 6px; }

    @media (max-width: 980px) {
      .grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <div>
        <h1>Muse Chat Admin</h1>
        <p>Scaffolding view for sessions, transcripts, and live chat runs.</p>
      </div>
    </header>

    <div class="grid">
      <section class="panel">
        <h3>Run a Chat</h3>
        <div class="row">
          <label>Admin Bearer Token</label>
          <input id="token" placeholder="Paste admin JWT" />
        </div>
        <div class="row">
          <label>Session ID (optional)</label>
          <input id="sessionId" placeholder="Leave blank to start new session" />
        </div>
        <div class="row">
          <label>Message</label>
          <textarea id="message" placeholder="Ask Muse for editorial guidance or a curated search..."></textarea>
        </div>
        <div class="row">
          <label>History (optional JSON array)</label>
          <textarea id="history" placeholder='[{"role":"user","content":"I want a summer capsule"}]'></textarea>
        </div>
        <div class="row">
          <label>Context (optional JSON)</label>
          <textarea id="context" placeholder='{"channel":"admin","locale":"en-US"}'></textarea>
        </div>
        <div class="actions">
          <button id="runBtn">Run Chat</button>
          <button class="secondary" id="clearBtn">Clear</button>
        </div>
      </section>

      <section class="panel">
        <h3>Response</h3>
        <pre id="response">Waiting for request...</pre>
        <div id="items"></div>
      </section>
    </div>

    <div class="grid" style="margin-top:20px;">
      <section class="panel">
        <div class="actions" style="justify-content: space-between; margin-bottom: 12px;">
          <div>
            <strong>Analytics Overview</strong>
            <div style="color: var(--muted); font-size: 12px;">Intent volume + top queries</div>
          </div>
          <div class="actions">
            <input id="analyticsFrom" placeholder="From (YYYY-MM-DD)" />
            <input id="analyticsTo" placeholder="To (YYYY-MM-DD)" />
            <button class="ghost" id="refreshAnalytics">Refresh</button>
          </div>
        </div>
        <div class="row" style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <label>Saved Searches</label>
            <select id="savedSearchSelect"></select>
          </div>
          <div>
            <label>Save Current Filter As</label>
            <input id="savedSearchName" placeholder="e.g. Recent size issues" />
          </div>
        </div>
        <div class="actions" style="margin-bottom: 10px;">
          <button class="ghost" id="applySavedSearch">Apply Saved Search</button>
          <button class="ghost" id="saveSearchBtn">Save Search</button>
          <button class="ghost" id="deleteSearchBtn">Delete Saved</button>
        </div>

        <div class="row" style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <div class="chip" id="totalMessages">Total messages: 0</div>
          </div>
        </div>
        <div class="row">
          <table class="table" id="intentTable">
            <thead>
              <tr><th>Intent</th><th>Count</th></tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
        <div class="row">
          <table class="table" id="queryTable">
            <thead>
              <tr><th>Top Query</th><th>Count</th></tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
        <div class="row" style="margin-top: 10px;">
          <strong>Export Range</strong>
          <div class="row" style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <input id="exportFrom" placeholder="From (YYYY-MM-DD)" />
            <input id="exportTo" placeholder="To (YYYY-MM-DD)" />
          </div>
          <div class="row" style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px;">
            <div>
              <label>Storage</label>
              <select id="exportStorage">
                <option value="local">Local</option>
                <option value="s3">S3</option>
                <option value="gcs">GCS</option>
              </select>
            </div>
            <div></div>
          </div>
          <div class="actions" style="margin-top: 8px;">
            <button class="ghost" id="exportJsonBtn">Export JSON</button>
            <button class="ghost" id="exportCsvBtn">Export CSV</button>
          </div>
        </div>
        <div class="row" style="margin-top: 10px;">
          <label>Signed URL TTL (seconds)</label>
          <input id="exportTtl" placeholder="3600" />
        </div>
        <div class="row" style="margin-top: 10px;">
          <div class="actions" style="justify-content: space-between;">
            <strong>Export History</strong>
            <button class="ghost" id="refreshExports">Refresh</button>
          </div>
          <table class="table" id="exportTable">
            <thead>
              <tr><th>Key</th><th>Updated</th><th>Download</th></tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
        <div class="row" style="margin-top: 10px;">
          <div class="actions" style="justify-content: space-between;">
            <strong>Export Runs</strong>
            <button class="ghost" id="refreshRuns">Refresh</button>
          </div>
          <table class="table" id="exportRunsTable">
            <thead>
              <tr><th>When</th><th>Format</th><th>Flagged</th><th>Counts</th><th>Storage</th></tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </section>


      <section class="panel">
        <div class="actions" style="justify-content: space-between; margin-bottom: 12px;">
          <div>
            <strong>Flag Queue</strong>
            <div style="color: var(--muted); font-size: 12px;">Open flags needing review</div>
          </div>
          <div class="actions">
            <button class="ghost" id="refreshFlags">Refresh</button>
            <button class="ghost" id="exportFlaggedJson">Export Flagged JSON</button>
            <button class="ghost" id="exportFlaggedCsv">Export Flagged CSV</button>
          </div>
        </div>
        <table class="table" id="flagTable">
          <thead>
            <tr><th>Flag</th><th>Session</th><th>Reason</th><th>Created</th><th>Action</th></tr>
          </thead>
          <tbody></tbody>
        </table>
      </section>

      <section class="panel">
        <div class="actions" style="justify-content: space-between; margin-bottom: 12px;">
          <div>
            <strong>Review Queue</strong>
            <div style="color: var(--muted); font-size: 12px;">Human-in-the-loop review items</div>
          </div>
          <div class="actions">
            <button class="ghost" id="refreshReviews">Refresh</button>
          </div>
        </div>
        <table class="table" id="reviewTable">
          <thead>
            <tr><th>ID</th><th>Session</th><th>Reason</th><th>Priority</th><th>Created</th><th>Action</th></tr>
          </thead>
          <tbody></tbody>
        </table>
      </section>

      <section class="panel">
        <div class="actions" style="justify-content: space-between; margin-bottom: 12px;">
          <div>
            <strong>Profile Diffs</strong>
            <div style="color: var(--muted); font-size: 12px;">Before/after snapshots from chat</div>
          </div>
          <div class="actions">
            <button class="ghost" id="refreshDiffs">Refresh</button>
          </div>
        </div>
        <table class="table" id="diffTable">
          <thead>
            <tr><th>User</th><th>Created</th><th>View</th></tr>
          </thead>
          <tbody></tbody>
        </table>
        <div class="row" style="margin-top: 12px;">
          <strong>Diff Snapshot</strong>
          <pre id="diffPreview" style="margin-top: 8px;">Select a diff row to preview.</pre>
        </div>
      </section>

      <section class="panel">
        <div class="actions" style="justify-content: space-between; margin-bottom: 12px;">
          <div>
            <strong>Profile Versions</strong>
            <div style="color: var(--muted); font-size: 12px;">Preview + restore stored profile snapshots</div>
          </div>
          <div class="actions">
            <button class="ghost" id="refreshVersions">Refresh</button>
          </div>
        </div>
        <div class="row" style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <label>User ID</label>
            <input id="versionUserId" placeholder="Enter user id" />
          </div>
          <div style="display:flex; align-items:end;">
            <button class="ghost" id="loadVersionsBtn">Load Versions</button>
          </div>
        </div>
        <table class="table" id="versionsTable">
          <thead>
            <tr><th>ID</th><th>Created</th><th>Action</th></tr>
          </thead>
          <tbody></tbody>
        </table>
        <div class="row" style="margin-top: 12px;">
          <strong>Preview Diff (Current vs Selected)</strong>
          <pre id="profilePreview" style="margin-top: 8px;">Select a version to preview changes.</pre>
        </div>
      </section>

      <section class="panel">
        <div class="actions" style="justify-content: space-between; margin-bottom: 12px;">
          <div>
            <strong>Job Dashboard</strong>
            <div style="color: var(--muted); font-size: 12px;">Run maintenance jobs and see recent runs</div>
          </div>
          <div class="actions">
            <button class="ghost" id="refreshJobRuns">Refresh</button>
          </div>
        </div>
        <div class="row" style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <label>Job</label>
            <select id="jobSelect">
              <option value="preference_decay">Preference Decay</option>
              <option value="session_summary">Session Summaries</option>
            </select>
          </div>
          <div style="display:flex; align-items:end;">
            <button class="ghost" id="runJobBtn">Run Job</button>
          </div>
        </div>
        <table class="table" id="jobRunsTable">
          <thead>
            <tr><th>Job</th><th>Status</th><th>Run At</th><th>Meta</th></tr>
          </thead>
          <tbody></tbody>
        </table>
      </section>

      <section class="panel">
        <div class="actions" style="justify-content: space-between; margin-bottom: 12px;">
          <div>
            <strong>Chat Sessions</strong>
            <div style="color: var(--muted); font-size: 12px;">Latest sessions with last message preview</div>
          </div>
          <div class="actions">
            <input id="sessionLimit" type="number" min="1" max="200" value="50" style="width:110px" />
            <button class="ghost" id="refreshSessions">Refresh</button>
          </div>
        </div>
        <div class="row" style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <label>Saved Searches</label>
            <select id="savedSearchSelect"></select>
          </div>
          <div>
            <label>Save Current Filter As</label>
            <input id="savedSearchName" placeholder="e.g. Recent size issues" />
          </div>
        </div>
        <div class="actions" style="margin-bottom: 10px;">
          <button class="ghost" id="applySavedSearch">Apply Saved Search</button>
          <button class="ghost" id="saveSearchBtn">Save Search</button>
          <button class="ghost" id="deleteSearchBtn">Delete Saved</button>
        </div>

        <div class="row" style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <label>User ID</label>
            <input id="filterUserId" placeholder="Optional" />
          </div>
          <div>
            <label>Keyword</label>
            <input id="filterQuery" placeholder="Search message text" />
          </div>
        </div>
        <div class="row" style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <label>Saved Searches</label>
            <select id="savedSearchSelect"></select>
          </div>
          <div>
            <label>Save Current Filter As</label>
            <input id="savedSearchName" placeholder="e.g. Recent size issues" />
          </div>
        </div>
        <div class="actions" style="margin-bottom: 10px;">
          <button class="ghost" id="applySavedSearch">Apply Saved Search</button>
          <button class="ghost" id="saveSearchBtn">Save Search</button>
          <button class="ghost" id="deleteSearchBtn">Delete Saved</button>
        </div>

        <div class="row" style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <label>From (ISO)</label>
            <input id="filterFrom" placeholder="2026-02-01" />
          </div>
          <div>
            <label>To (ISO)</label>
            <input id="filterTo" placeholder="2026-02-03" />
          </div>
        </div>
        <table class="table" id="sessionsTable">
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Messages</th>
              <th>Last Message</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </section>

      <section class="panel">
        <div class="actions" style="justify-content: space-between; margin-bottom: 12px;">
          <div>
            <strong>Session Transcript</strong>
            <div style="color: var(--muted); font-size: 12px;">Select a session to load messages.</div>
          </div>
          <div class="actions">
            <button class="ghost" id="loadSessionBtn">Load Session</button>
          </div>
        </div>
        <div class="row">
          <label>Selected Session ID</label>
          <input id="selectedSession" placeholder="Click a row in the sessions table" />
        </div>
        <div class="row">
          <label>Session Label</label>
          <input id="sessionLabel" placeholder="e.g. size-issue, trend-request" />
        </div>
        <div class="actions">
          <button class="ghost" id="saveLabelBtn">Save Label</button>
        </div>
        <div class="message-list" id="messageList"></div>
        <div style="margin-top: 12px;">
          <strong>Session Tags</strong>
          <div class="row" style="margin-top: 8px;">
            <input id="tagInput" placeholder="e.g. quality-issue, pricing, size" />
          </div>
          <div class="actions">
            <button class="ghost" id="addTagBtn">Add Tag</button>
          </div>
          <div id="tagList" style="margin-top: 10px;"></div>
        </div>
        <div style="margin-top: 16px;">
          <strong>Session Flag</strong>
          <div class="row" style="margin-top: 8px;">
            <textarea id="flagInput" placeholder="Why does this session need review?"></textarea>
          </div>
          <div class="actions">
            <button class="ghost" id="flagSessionBtn">Flag Session</button>
          </div>
          <div id="flagStatus" style="margin-top: 8px; color: var(--muted); font-size: 12px;"></div>
        </div>

        <div style="margin-top: 16px;">
          <strong>Session Notes</strong>
          <div class="row" style="margin-top: 8px;">
            <textarea id="noteInput" placeholder="Add an internal note about this session..."></textarea>
          </div>
          <div class="actions">
            <button class="ghost" id="saveNoteBtn">Save Note</button>
            <button class="ghost" id="exportSessionBtn">Export JSON</button>
          </div>
          <div id="notesList" style="margin-top: 10px;"></div>
        </div>
      </section>
    </div>
  </div>

  <script>
    const runBtn = document.getElementById('runBtn');
    const clearBtn = document.getElementById('clearBtn');
    const responseEl = document.getElementById('response');
    const itemsEl = document.getElementById('items');
    const sessionsTableBody = document.querySelector('#sessionsTable tbody');
    const refreshSessionsBtn = document.getElementById('refreshSessions');
    const sessionLimitInput = document.getElementById('sessionLimit');
    const selectedSessionInput = document.getElementById('selectedSession');
    const loadSessionBtn = document.getElementById('loadSessionBtn');
    const messageList = document.getElementById('messageList');
    const notesList = document.getElementById('notesList');
    const noteInput = document.getElementById('noteInput');
    const saveNoteBtn = document.getElementById('saveNoteBtn');
    const exportSessionBtn = document.getElementById('exportSessionBtn');
    const filterUserId = document.getElementById('filterUserId');
    const filterQuery = document.getElementById('filterQuery');
    const filterFrom = document.getElementById('filterFrom');
    const filterTo = document.getElementById('filterTo');
    const tagInput = document.getElementById('tagInput');
    const addTagBtn = document.getElementById('addTagBtn');
    const tagList = document.getElementById('tagList');
    const flagInput = document.getElementById('flagInput');
    const flagSessionBtn = document.getElementById('flagSessionBtn');
    const flagStatus = document.getElementById('flagStatus');
    const analyticsFrom = document.getElementById('analyticsFrom');
    const analyticsTo = document.getElementById('analyticsTo');
    const refreshAnalytics = document.getElementById('refreshAnalytics');
    const intentTableBody = document.querySelector('#intentTable tbody');
    const queryTableBody = document.querySelector('#queryTable tbody');
    const totalMessages = document.getElementById('totalMessages');
    const refreshFlags = document.getElementById('refreshFlags');
    const flagTableBody = document.querySelector('#flagTable tbody');
    const savedSearchSelect = document.getElementById('savedSearchSelect');
    const savedSearchName = document.getElementById('savedSearchName');
    const applySavedSearch = document.getElementById('applySavedSearch');
    const saveSearchBtn = document.getElementById('saveSearchBtn');
    const deleteSearchBtn = document.getElementById('deleteSearchBtn');
    const sessionLabel = document.getElementById('sessionLabel');
    const saveLabelBtn = document.getElementById('saveLabelBtn');
    const exportFrom = document.getElementById('exportFrom');
    const exportTo = document.getElementById('exportTo');
    const exportJsonBtn = document.getElementById('exportJsonBtn');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const exportStorage = document.getElementById('exportStorage');
    const exportTtl = document.getElementById('exportTtl');
    const exportFlaggedJson = document.getElementById('exportFlaggedJson');
    const exportFlaggedCsv = document.getElementById('exportFlaggedCsv');
    const refreshExports = document.getElementById('refreshExports');
    const exportTableBody = document.querySelector('#exportTable tbody');
    const refreshRuns = document.getElementById('refreshRuns');
    const exportRunsTableBody = document.querySelector('#exportRunsTable tbody');
    const refreshReviews = document.getElementById('refreshReviews');
    const reviewTableBody = document.querySelector('#reviewTable tbody');
    const refreshDiffs = document.getElementById('refreshDiffs');
    const diffTableBody = document.querySelector('#diffTable tbody');
    const diffPreview = document.getElementById('diffPreview');
    const refreshVersions = document.getElementById('refreshVersions');
    const versionUserId = document.getElementById('versionUserId');
    const loadVersionsBtn = document.getElementById('loadVersionsBtn');
    const versionsTableBody = document.querySelector('#versionsTable tbody');
    const profilePreview = document.getElementById('profilePreview');
    const refreshJobRuns = document.getElementById('refreshJobRuns');
    const jobSelect = document.getElementById('jobSelect');
    const runJobBtn = document.getElementById('runJobBtn');
    const jobRunsTableBody = document.querySelector('#jobRunsTable tbody');

    function safeJson(text, fallback) {
      try { return JSON.parse(text); } catch { return fallback; }
    }

    function computeDiff(before, after, path = '') {
      const changes = [];
      const beforeVal = before ?? null;
      const afterVal = after ?? null;

      const isObject = (val) => val && typeof val === 'object' && !Array.isArray(val);

      if (isObject(beforeVal) && isObject(afterVal)) {
        const keys = new Set([...Object.keys(beforeVal), ...Object.keys(afterVal)]);
        keys.forEach((key) => {
          const nextPath = path ? `${path}.${key}` : key;
          changes.push(...computeDiff(beforeVal[key], afterVal[key], nextPath));
        });
        return changes;
      }

      if (Array.isArray(beforeVal) || Array.isArray(afterVal)) {
        if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
          changes.push({ path, before: beforeVal, after: afterVal });
        }
        return changes;
      }

      if (beforeVal !== afterVal) {
        changes.push({ path, before: beforeVal, after: afterVal });
      }
      return changes;
    }

    function renderDiff(previewEl, before, after) {
      const changes = computeDiff(before, after);
      if (!changes.length) {
        previewEl.textContent = 'No changes detected.';
        return;
      }
      previewEl.textContent = JSON.stringify(changes, null, 2);
    }

    function renderItems(items) {
      itemsEl.innerHTML = '';
      if (!items || items.length === 0) return;

      items.forEach((item) => {
        const row = document.createElement('div');
        row.className = 'item';
        const thumb = document.createElement('div');
        thumb.className = 'thumb';
        if (item.primary_image_url) {
          const img = document.createElement('img');
          img.src = item.primary_image_url;
          img.alt = item.canonical_name || 'item';
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.objectFit = 'cover';
          thumb.innerHTML = '';
          thumb.appendChild(img);
        } else {
          thumb.textContent = 'No image';
        }

        const body = document.createElement('div');
        body.innerHTML = `
          <div><strong>${item.canonical_name || 'Untitled'}</strong></div>
          <div>${item.brand_name || ''}</div>
          <div>
            <span class="pill">${item.category || 'category'}</span>
            <span class="pill">${item.sale_price || item.min_price || 'price n/a'}</span>
          </div>
        `;

        row.appendChild(thumb);
        row.appendChild(body);
        itemsEl.appendChild(row);
      });
    }

    async function fetchSessions() {
      const token = document.getElementById('token').value.trim();
      const limit = parseInt(sessionLimitInput.value || '50', 10);
      const params = new URLSearchParams({ limit: String(limit) });
      if (filterUserId.value.trim()) params.set('user_id', filterUserId.value.trim());
      if (filterQuery.value.trim()) params.set('q', filterQuery.value.trim());
      if (filterFrom.value.trim()) params.set('from', filterFrom.value.trim());
      if (filterTo.value.trim()) params.set('to', filterTo.value.trim());

      const res = await fetch(`/api/v1/admin/chat/sessions?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      return data.data || [];
    }

    function renderTags(tags) {
      tagList.innerHTML = '';
      if (!tags || tags.length === 0) {
        tagList.innerHTML = '<div class="chip">No tags</div>';
        return;
      }
      tags.forEach((tag) => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.style.marginRight = '6px';
        chip.style.display = 'inline-flex';
        chip.style.alignItems = 'center';
        chip.textContent = tag.name;
        chip.addEventListener('click', async () => {
          const token = document.getElementById('token').value.trim();
          const sessionId = selectedSessionInput.value.trim();
          await fetch(`/api/v1/admin/chat/sessions/${sessionId}/tags/${tag.id}`, {
            method: 'DELETE',
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          await loadSessionTags(sessionId);
        });
        tagList.appendChild(chip);
      });
    }

    async function loadSessionTags(sessionId) {
      const token = document.getElementById('token').value.trim();
      const res = await fetch(`/api/v1/admin/chat/sessions/${sessionId}/tags`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      renderTags(data.data || []);
    }

    async function loadFlags() {
      const token = document.getElementById('token').value.trim();
      const res = await fetch('/api/v1/admin/chat/flags/queue', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      const flags = data.data || [];
      flagTableBody.innerHTML = '';
      if (!flags.length) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="5">No open flags</td>';
        flagTableBody.appendChild(tr);
        return;
      }
      flags.forEach((flag) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="mono">${flag.id}</td>
          <td class="mono">${flag.session_id}</td>
          <td>${flag.reason}</td>
          <td>${new Date(flag.created_at).toLocaleString()}</td>
          <td><button class="ghost" data-flag="${flag.id}">Resolve</button></td>
        `;
        tr.querySelector('button').addEventListener('click', async () => {
          const token = document.getElementById('token').value.trim();
          await fetch(`/api/v1/admin/chat/flags/${flag.id}/resolve`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          await loadFlags();
        });
        tr.addEventListener('click', () => {
          selectedSessionInput.value = flag.session_id;
        });
        flagTableBody.appendChild(tr);
      });
    }

    async function loadAnalytics() {
      const token = document.getElementById('token').value.trim();
      const params = new URLSearchParams();
      if (analyticsFrom.value.trim()) params.set('from', analyticsFrom.value.trim());
      if (analyticsTo.value.trim()) params.set('to', analyticsTo.value.trim());

      const res = await fetch(`/api/v1/admin/chat/analytics?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      const payload = data.data || { total_messages: 0, intents: [], top_queries: [] };

      totalMessages.textContent = `Total messages: ${payload.total_messages}`;
      intentTableBody.innerHTML = '';
      payload.intents.forEach((row) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${row.intent}</td><td>${row.count}</td>`;
        intentTableBody.appendChild(tr);
      });

      queryTableBody.innerHTML = '';
      payload.top_queries.forEach((row) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${row.query || '-'}</td><td>${row.count}</td>`;
        queryTableBody.appendChild(tr);
      });
    }

    async function loadProfileDiffs() {
      const token = document.getElementById('token').value.trim();
      const res = await fetch('/api/v1/admin/chat/profile-diffs', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      const diffs = data.data || [];
      diffTableBody.innerHTML = '';
      if (!diffs.length) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="3">No profile diffs yet</td>';
        diffTableBody.appendChild(tr);
        return;
      }
      diffs.forEach((diff) => {
        const tr = document.createElement('tr');
        const button = document.createElement('button');
        button.className = 'ghost';
        button.textContent = 'Preview';
        button.addEventListener('click', () => {
          const before = typeof diff.before_profile === 'string' ? safeJson(diff.before_profile, {}) : (diff.before_profile || {});
          const after = typeof diff.after_profile === 'string' ? safeJson(diff.after_profile, {}) : (diff.after_profile || {});
          renderDiff(diffPreview, before, after);
        });
        tr.innerHTML = `<td class="mono">${diff.user_id}</td><td>${new Date(diff.created_at).toLocaleString()}</td>`;
        const td = document.createElement('td');
        td.appendChild(button);
        tr.appendChild(td);
        diffTableBody.appendChild(tr);
      });
    }

    async function loadProfileVersions() {
      const userId = versionUserId.value.trim();
      if (!userId) {
        profilePreview.textContent = 'Enter a user id to load versions.';
        return;
      }
      const token = document.getElementById('token').value.trim();
      const params = new URLSearchParams({ user_id: userId });
      const res = await fetch(`/api/v1/admin/chat/profile-versions?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      const versions = data.data || [];
      versionsTableBody.innerHTML = '';
      if (!versions.length) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="3">No profile versions yet</td>';
        versionsTableBody.appendChild(tr);
        return;
      }
      versions.forEach((version) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="mono">${version.id}</td><td>${new Date(version.created_at).toLocaleString()}</td>`;
        const td = document.createElement('td');
        const previewBtn = document.createElement('button');
        previewBtn.className = 'ghost';
        previewBtn.textContent = 'Preview';
        previewBtn.addEventListener('click', async () => {
          await previewProfileVersion(version.id, userId);
        });
        const restoreBtn = document.createElement('button');
        restoreBtn.className = 'ghost';
        restoreBtn.style.marginLeft = '6px';
        restoreBtn.textContent = 'Restore';
        restoreBtn.addEventListener('click', async () => {
          if (!confirm('Restore this profile version?')) return;
          await restoreProfileVersion(version.id, userId);
        });
        td.appendChild(previewBtn);
        td.appendChild(restoreBtn);
        tr.appendChild(td);
        versionsTableBody.appendChild(tr);
      });
    }

    async function previewProfileVersion(versionId, userId) {
      const token = document.getElementById('token').value.trim();
      const params = new URLSearchParams({ user_id: userId });
      const res = await fetch(`/api/v1/admin/chat/profile-versions/${versionId}/preview?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (!data.success) {
        profilePreview.textContent = data.error || 'Unable to preview version.';
        return;
      }
      const current = data.data.current || {};
      const version = data.data.version || {};
      const snapshot = typeof version.snapshot === 'string' ? safeJson(version.snapshot, {}) : (version.snapshot || {});
      renderDiff(profilePreview, current, snapshot);
    }

    async function restoreProfileVersion(versionId, userId) {
      const token = document.getElementById('token').value.trim();
      const res = await fetch(`/api/v1/admin/chat/profile-versions/${versionId}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ user_id: parseInt(userId, 10) })
      });
      const data = await res.json();
      if (!data.success) {
        profilePreview.textContent = data.error || 'Unable to restore version.';
        return;
      }
      profilePreview.textContent = 'Profile restored. Reload versions to preview updated changes.';
    }

    async function loadJobRuns() {
      const token = document.getElementById('token').value.trim();
      const res = await fetch('/api/v1/admin/chat/jobs/runs?limit=10', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      const runs = data.data || [];
      jobRunsTableBody.innerHTML = '';
      if (!runs.length) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="4">No job runs recorded yet</td>';
        jobRunsTableBody.appendChild(tr);
        return;
      }
      runs.forEach((run) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${run.job_name}</td>
          <td>${run.status}</td>
          <td>${new Date(run.run_at).toLocaleString()}</td>
          <td class="mono">${run.metadata ? JSON.stringify(run.metadata) : '-'}</td>
        `;
        jobRunsTableBody.appendChild(tr);
      });
    }

    async function runJob() {
      const token = document.getElementById('token').value.trim();
      const job = jobSelect.value;
      const res = await fetch('/api/v1/admin/chat/jobs/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ job })
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || 'Job run failed');
      }
      await loadJobRuns();
    }

    function renderNotes(notes) {
      notesList.innerHTML = '';
      if (!notes || notes.length === 0) {
        notesList.innerHTML = '<div class="chip">No notes yet</div>';
        return;
      }
      notes.forEach((note) => {
        const div = document.createElement('div');
        div.className = 'message';
        div.innerHTML = `<div class="meta">${new Date(note.created_at).toLocaleString()}</div><div>${note.note}</div>`;
        notesList.appendChild(div);
      });
    }

    async function loadSavedSearches() {
      const token = document.getElementById('token').value.trim();
      const res = await fetch('/api/v1/admin/chat/saved-searches', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      const searches = data.data || [];
      savedSearchSelect.innerHTML = '<option value="">Select saved...</option>';
      searches.forEach((s) => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name;
        opt.dataset.filters = JSON.stringify(s.filters || {});
        savedSearchSelect.appendChild(opt);
      });
    }

    function renderSessions(sessions) {
      sessionsTableBody.innerHTML = '';
      if (!sessions.length) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="5">No sessions found.</td>`;
        sessionsTableBody.appendChild(row);
        return;
      }

      sessions.forEach((session) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="mono">${session.id}</td>
          <td>${session.user_id || '-'} </td>
          <td><span class="chip">${session.message_count || 0}</span></td>
          <td>${(session.last_message || '').slice(0, 80)}</td>
          <td>${new Date(session.updated_at).toLocaleString()}</td>
        `;
        row.addEventListener('click', () => {
          selectedSessionInput.value = session.id;
        });
        sessionsTableBody.appendChild(row);
      });
    }

    async function loadSessionNotes(sessionId) {
      const token = document.getElementById('token').value.trim();
      const res = await fetch(`/api/v1/admin/chat/sessions/${sessionId}/notes`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      renderNotes(data.data || []);
    }

    async function loadSessionMessages() {
      const token = document.getElementById('token').value.trim();
      const sessionId = selectedSessionInput.value.trim();
      if (!sessionId) return;

      const res = await fetch(`/api/v1/admin/chat/sessions/${sessionId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      const messages = data.data || [];
      messageList.innerHTML = '';

      messages.forEach((msg) => {
        const div = document.createElement('div');
        div.className = `message ${msg.role}`;
        div.innerHTML = `
          <div class="meta">${msg.role} · ${new Date(msg.created_at).toLocaleString()}</div>
          <div>${msg.content}</div>
        `;
        messageList.appendChild(div);
      });

      await loadSessionNotes(sessionId);
      await loadSessionTags(sessionId);
    }

    runBtn.addEventListener('click', async () => {
      const token = document.getElementById('token').value.trim();
      const sessionId = document.getElementById('sessionId').value.trim();
      const message = document.getElementById('message').value.trim();
      const history = safeJson(document.getElementById('history').value.trim(), []);
      const context = safeJson(document.getElementById('context').value.trim(), {});

      responseEl.textContent = 'Loading...';
      itemsEl.innerHTML = '';

      const payload = { message, history, context };
      if (sessionId) payload.session_id = sessionId;

      const res = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      responseEl.textContent = JSON.stringify(data, null, 2);
      if (data && data.data && data.data.items) {
        renderItems(data.data.items);
      }
      if (data && data.data && data.data.session_id) {
        document.getElementById('sessionId').value = data.data.session_id;
      }
    });

    clearBtn.addEventListener('click', () => {
      responseEl.textContent = 'Waiting for request...';
      itemsEl.innerHTML = '';
      document.getElementById('message').value = '';
      document.getElementById('history').value = '';
      document.getElementById('context').value = '';
    });

    refreshSessionsBtn.addEventListener('click', async () => {
      const sessions = await fetchSessions();
      renderSessions(sessions);
      await loadAnalytics();
      await loadFlags();
      await loadSavedSearches();
    });

    saveNoteBtn.addEventListener('click', async () => {
      const token = document.getElementById('token').value.trim();
      const sessionId = selectedSessionInput.value.trim();
      const note = noteInput.value.trim();
      if (!sessionId || !note) return;

      await fetch(`/api/v1/admin/chat/sessions/${sessionId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ note })
      });

      noteInput.value = '';
      await loadSessionNotes(sessionId);
      await loadSessionTags(sessionId);
    });

    exportSessionBtn.addEventListener('click', async () => {
      const token = document.getElementById('token').value.trim();
      const sessionId = selectedSessionInput.value.trim();
      if (!sessionId) return;

      const res = await fetch(`/api/v1/admin/chat/sessions/${sessionId}/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data.data || {}, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-session-${sessionId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    addTagBtn.addEventListener('click', async () => {
      const token = document.getElementById('token').value.trim();
      const sessionId = selectedSessionInput.value.trim();
      const name = tagInput.value.trim().toLowerCase();
      if (!sessionId || !name) return;

      const tagRes = await fetch('/api/v1/admin/chat/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ name })
      });
      const tagData = await tagRes.json();
      const tag = tagData.data;

      if (tag && tag.id) {
        await fetch(`/api/v1/admin/chat/sessions/${sessionId}/tags`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ tag_id: tag.id })
        });
      }

      tagInput.value = '';
      await loadSessionTags(sessionId);
    });

    flagSessionBtn.addEventListener('click', async () => {
      const token = document.getElementById('token').value.trim();
      const sessionId = selectedSessionInput.value.trim();
      const reason = flagInput.value.trim();
      if (!sessionId || !reason) return;

      await fetch('/api/v1/admin/chat/flags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ session_id: sessionId, reason })
      });
      flagInput.value = '';
      flagStatus.textContent = 'Session flagged for review.';
    });

    applySavedSearch.addEventListener('click', async () => {
      const selected = savedSearchSelect.options[savedSearchSelect.selectedIndex];
      if (!selected || !selected.dataset.filters) return;
      const filters = JSON.parse(selected.dataset.filters || '{}');
      filterUserId.value = filters.user_id || '';
      filterQuery.value = filters.q || '';
      filterFrom.value = filters.from || '';
      filterTo.value = filters.to || '';
      await fetchSessions().then(renderSessions);
    });

    saveSearchBtn.addEventListener('click', async () => {
      const token = document.getElementById('token').value.trim();
      const name = savedSearchName.value.trim();
      if (!name) return;
      const filters = {
        user_id: filterUserId.value.trim(),
        q: filterQuery.value.trim(),
        from: filterFrom.value.trim(),
        to: filterTo.value.trim(),
      };
      await fetch('/api/v1/admin/chat/saved-searches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ name, filters })
      });
      savedSearchName.value = '';
      await loadSavedSearches();
    });

    deleteSearchBtn.addEventListener('click', async () => {
      const token = document.getElementById('token').value.trim();
      const id = savedSearchSelect.value;
      if (!id) return;
      await fetch(`/api/v1/admin/chat/saved-searches/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      await loadSavedSearches();
    });

    exportJsonBtn.addEventListener('click', async () => {
      const token = document.getElementById('token').value.trim();
      const params = new URLSearchParams();
      if (exportFrom.value.trim()) params.set('from', exportFrom.value.trim());
      if (exportTo.value.trim()) params.set('to', exportTo.value.trim());
      params.set('format', 'json');
      params.set('storage', exportStorage.value);
      if (exportTtl.value.trim()) params.set('expires_in', exportTtl.value.trim());

      const res = await fetch(`/api/v1/admin/chat/export?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (exportStorage.value !== 'local') {
        responseEl.textContent = JSON.stringify(data, null, 2);
        return;
      }
      const blob = new Blob([JSON.stringify(data.data || {}, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'chat-export.json';
      a.click();
      URL.revokeObjectURL(url);
    });

    exportCsvBtn.addEventListener('click', async () => {
      const token = document.getElementById('token').value.trim();
      const params = new URLSearchParams();
      if (exportFrom.value.trim()) params.set('from', exportFrom.value.trim());
      if (exportTo.value.trim()) params.set('to', exportTo.value.trim());
      params.set('format', 'csv');
      params.set('storage', exportStorage.value);
      if (exportTtl.value.trim()) params.set('expires_in', exportTtl.value.trim());

      const res = await fetch(`/api/v1/admin/chat/export?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (exportStorage.value !== 'local') {
        const data = await res.json();
        responseEl.textContent = JSON.stringify(data, null, 2);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'chat-export.csv';
      a.click();
      URL.revokeObjectURL(url);
    });

    exportFlaggedJson.addEventListener('click', async () => {
      const token = document.getElementById('token').value.trim();
      const res = await fetch('/api/v1/admin/chat/flags/export?format=json', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data.data || {}, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'chat-flagged-export.json';
      a.click();
      URL.revokeObjectURL(url);
    });

    exportFlaggedCsv.addEventListener('click', async () => {
      const token = document.getElementById('token').value.trim();
      const res = await fetch('/api/v1/admin/chat/flags/export?format=csv', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'chat-flagged-export.csv';
      a.click();
      URL.revokeObjectURL(url);
    });

    async function loadExports() {
      const token = document.getElementById('token').value.trim();
      const storage = exportStorage.value;
      const res = await fetch(`/api/v1/admin/chat/exports?storage=${storage}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      const exports = data.data || [];
      exportTableBody.innerHTML = '';
      if (!exports.length) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="3">No exports found</td>';
        exportTableBody.appendChild(tr);
        return;
      }
      exports.forEach((obj) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="mono">${obj.key}</td>
          <td>${new Date(obj.updated_at).toLocaleString()}</td>
          <td><button class="ghost" data-key="${obj.key}">Download</button></td>
        `;
        tr.querySelector('button').addEventListener('click', async () => {
          const token = document.getElementById('token').value.trim();
          const params = new URLSearchParams({ key: obj.key, storage: exportStorage.value });
          if (exportTtl.value.trim()) params.set('expires_in', exportTtl.value.trim());
          const res = await fetch(`/api/v1/admin/chat/exports/download?${params.toString()}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (exportStorage.value === 'local') {
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = obj.key.split('/').pop();
            a.click();
            URL.revokeObjectURL(url);
            return;
          }
          const data = await res.json();
          if (data && data.data && data.data.url) {
            window.open(data.data.url, '_blank');
          }
        });
        exportTableBody.appendChild(tr);
      });
    }

    async function loadExportRuns() {
      const token = document.getElementById('token').value.trim();
      const res = await fetch('/api/v1/admin/chat/exports/runs?limit=100', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      const runs = data.data || [];
      exportRunsTableBody.innerHTML = '';
      if (!runs.length) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="5">No export runs found</td>';
        exportRunsTableBody.appendChild(tr);
        return;
      }
      runs.forEach((run) => {
        const counts = run.record_counts || {};
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${new Date(run.created_at).toLocaleString()}</td>
          <td>${run.format}</td>
          <td>${run.only_flagged ? 'yes' : 'no'}</td>
          <td>${counts.sessions || 0} sessions / ${counts.messages || 0} messages</td>
          <td>${run.storage_provider}${run.export_key ? ` (${run.export_key})` : ''}</td>
        `;
        exportRunsTableBody.appendChild(tr);
      });
    }

    async function loadReviews() {
      const token = document.getElementById('token').value.trim();
      const res = await fetch('/api/v1/admin/chat/reviews?status=open', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      const reviews = data.data || [];
      reviewTableBody.innerHTML = '';
      if (!reviews.length) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="6">No review items</td>';
        reviewTableBody.appendChild(tr);
        return;
      }
        reviews.forEach((review) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="mono">${review.id}</td>
          <td class="mono">${review.session_id}</td>
          <td>${review.reason}</td>
          <td>${review.priority}</td>
          <td>${new Date(review.created_at).toLocaleString()}</td>
          <td>
            <button class="ghost" data-review="${review.id}" data-action="resolve">Resolve</button>
            <button class="ghost" data-review="${review.id}" data-action="thumbs-up">Good</button>
            <button class="ghost" data-review="${review.id}" data-action="thumbs-down">Bad</button>
          </td>
        `;
        tr.querySelectorAll('button').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const token = document.getElementById('token').value.trim();
            const action = btn.dataset.action;
            if (action === 'resolve') {
              await fetch(`/api/v1/admin/chat/reviews/${review.id}/resolve`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ resolution_notes: 'Reviewed' })
              });
            } else {
              const rating = action === 'thumbs-up' ? 5 : 1;
              await fetch(`/api/v1/admin/chat/reviews/${review.id}/feedback`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ rating })
              });
            }
            await loadReviews();
          });
        });
        tr.addEventListener('click', () => {
          selectedSessionInput.value = review.session_id;
        });
        reviewTableBody.appendChild(tr);
      });
    }

    refreshExports.addEventListener('click', async () => {
      await loadExports();
    });

    refreshRuns.addEventListener('click', async () => {
      await loadExportRuns();
    });

    refreshReviews.addEventListener('click', async () => {
      await loadReviews();
    });

    refreshDiffs.addEventListener('click', async () => {
      await loadProfileDiffs();
    });

    loadVersionsBtn.addEventListener('click', async () => {
      await loadProfileVersions();
    });

    refreshVersions.addEventListener('click', async () => {
      await loadProfileVersions();
    });

    refreshJobRuns.addEventListener('click', async () => {
      await loadJobRuns();
    });

    runJobBtn.addEventListener('click', async () => {
      await runJob();
    });

    saveLabelBtn.addEventListener('click', async () => {
      const token = document.getElementById('token').value.trim();
      const sessionId = selectedSessionInput.value.trim();
      const label = sessionLabel.value.trim();
      if (!sessionId || !label) return;
      await fetch(`/api/v1/admin/chat/sessions/${sessionId}/label`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ label })
      });
    });

    refreshFlags.addEventListener('click', async () => {
      await loadFlags();
    });

    refreshAnalytics.addEventListener('click', async () => {
      await loadAnalytics();
      await loadFlags();
      await loadSavedSearches();
    });

    loadSessionBtn.addEventListener('click', async () => {
      await loadSessionMessages();
    });

    window.addEventListener('load', async () => {
      const sessions = await fetchSessions();
      renderSessions(sessions);
      await loadAnalytics();
      await loadFlags();
      await loadSavedSearches();
      await loadExports();
      await loadExportRuns();
      await loadReviews();
      await loadProfileDiffs();
      await loadJobRuns();
    });
  </script>
</body>
</html>`);
});});

module.exports = router;
