/**
 * Chat Export Job
 *
 * Usage:
 *   node src/jobs/chatExportJob.js --from=2026-02-01 --to=2026-02-03 --format=csv --storage=s3
 *   node src/jobs/chatExportJob.js --only-flagged=true --format=json --storage=local
 */

const path = require('path');
const ChatService = require('../services/chatService');
const ExportStorageService = require('../services/exportStorageService');
const { logExportRun } = require('../services/chatService');

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  args.forEach((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    parsed[key] = value ?? true;
  });
  return parsed;
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toBool(value) {
  return value === true || value === 'true';
}

function buildCsv(data) {
  const rows = [];
  rows.push(['type', 'session_id', 'user_id', 'role', 'content', 'note', 'label', 'flag_status', 'created_at']);

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

  return rows.map((r) => r.map((v) => {
    const s = String(v ?? '');
    if (s.includes(',') || s.includes('"')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }).join(',')).join('\n');
}

async function main() {
  const args = parseArgs();
  const from = toDate(args.from);
  const to = toDate(args.to);
  const format = args.format || 'json';
  const storage = args.storage || process.env.CHAT_EXPORT_STORAGE || 'local';
  const bucket = args.bucket || process.env.CHAT_EXPORT_BUCKET || '';
  const prefix = args.prefix || process.env.CHAT_EXPORT_PREFIX || 'chat-exports';
  const outputDir = args.output_dir || process.env.CHAT_EXPORT_DIR || path.join(process.cwd(), 'exports');
  const retentionDays = parseInt(args.retention_days || process.env.CHAT_EXPORT_RETENTION_DAYS || '30', 10);
  const onlyFlagged = toBool(args.only_flagged || false);
  const flagStatus = args.flag_status || null;

  const data = await ChatService.exportRange({ from, to, onlyFlagged, flagStatus });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const keyBase = `${prefix}/chat-export-${timestamp}`;

  let payload;
  let contentType;
  let key;

  if (format === 'csv') {
    payload = Buffer.from(buildCsv(data), 'utf-8');
    contentType = 'text/csv';
    key = `${keyBase}.csv`;
  } else {
    payload = Buffer.from(JSON.stringify(data, null, 2), 'utf-8');
    contentType = 'application/json';
    key = `${keyBase}.json`;
  }

  const location = await ExportStorageService.uploadBuffer({
    provider: storage,
    bucket,
    key,
    contentType,
    data: payload,
    localDir: outputDir,
  });

  await logExportRun({
    storageProvider: storage,
    bucket,
    exportKey: key,
    format,
    onlyFlagged,
    from,
    to,
    recordCounts: {
      sessions: data.sessions.length,
      messages: data.messages.length,
      notes: data.notes.length,
      flags: data.flags.length,
    },
    createdBy: null,
  });

  if (retentionDays && retentionDays > 0) {
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const objects = await ExportStorageService.listObjects({
      provider: storage,
      bucket,
      prefix: storage === 'local' ? outputDir : prefix,
    });
    const toDelete = objects
      .filter((obj) => obj.updated_at && obj.updated_at.getTime() < cutoff)
      .map((obj) => obj.key);

    if (toDelete.length > 0) {
      await ExportStorageService.deleteObjects({
        provider: storage,
        bucket,
        keys: toDelete,
        localDir: outputDir,
      });
    }
  }

  console.log(`Export complete: ${location.location || location}`);
}

main().catch((error) => {
  console.error('Chat export failed:', error);
  process.exit(1);
});
