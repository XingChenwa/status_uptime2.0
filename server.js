import express from 'express';
import cors from 'cors';
import initSqlJs from 'sql.js';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { randomBytes } from 'crypto';
import http from 'http';
import https from 'https';
import net from 'net';
import { exec } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_FILE = join(__dirname, 'status.db');

// ─────────────────────────────────────────────
// Database setup (sql.js – pure JS SQLite)
// ─────────────────────────────────────────────

const SQL = await initSqlJs();

let db;
if (existsSync(DB_FILE)) {
  db = new SQL.Database(readFileSync(DB_FILE));
} else {
  db = new SQL.Database();
}

function saveDb() {
  writeFileSync(DB_FILE, Buffer.from(db.export()));
}

function dbGet(sql, ...params) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row;
}

function dbAll(sql, ...params) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function dbRun(sql, ...params) {
  db.run(sql, params.length ? params : []);
  saveDb();
}

db.exec(`
  CREATE TABLE IF NOT EXISTS site_config (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS services (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    type           TEXT NOT NULL DEFAULT 'http',
    host           TEXT NOT NULL,
    timeout        INTEGER DEFAULT 10,
    hide_host      INTEGER DEFAULT 0,
    sort           INTEGER DEFAULT 0,
    current_status TEXT DEFAULT 'unknown',
    response_time  INTEGER DEFAULT 0,
    last_checked   TEXT
  );
  CREATE TABLE IF NOT EXISTS daily_history (
    service_id          TEXT NOT NULL,
    date                TEXT NOT NULL,
    up_count            INTEGER DEFAULT 0,
    down_count          INTEGER DEFAULT 0,
    total_count         INTEGER DEFAULT 0,
    total_response_time INTEGER DEFAULT 0,
    PRIMARY KEY (service_id, date)
  );
  CREATE TABLE IF NOT EXISTS admin_config (
    id        INTEGER PRIMARY KEY CHECK (id = 1),
    email     TEXT NOT NULL,
    smtp_host TEXT NOT NULL DEFAULT '',
    smtp_port INTEGER DEFAULT 587,
    smtp_user TEXT NOT NULL DEFAULT '',
    smtp_pass TEXT NOT NULL DEFAULT '',
    smtp_from TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS otp_tokens (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    code       TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    used       INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS incident_updates (
    id          TEXT PRIMARY KEY,
    incident_id TEXT NOT NULL,
    status      TEXT NOT NULL,
    message     TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS incidents (
    id                TEXT PRIMARY KEY,
    title             TEXT NOT NULL,
    message           TEXT NOT NULL DEFAULT '',
    status            TEXT NOT NULL DEFAULT 'investigating',
    affected_services TEXT NOT NULL DEFAULT '[]',
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL,
    resolved_at       TEXT
  );
`);

try { db.run('ALTER TABLE incidents ADD COLUMN affected_services TEXT NOT NULL DEFAULT \'[]\''); saveDb(); } catch (_) {}
try { db.run('ALTER TABLE services ADD COLUMN hide_host INTEGER DEFAULT 0'); saveDb(); } catch (_) {}
db.run('UPDATE site_config SET value = ? WHERE key = ? AND value = ?', ['', 'siteDesc', 'Real-time service monitoring']);
saveDb();
try { db.run('CREATE TABLE IF NOT EXISTS incident_updates (id TEXT PRIMARY KEY, incident_id TEXT NOT NULL, status TEXT NOT NULL, message TEXT NOT NULL DEFAULT \'\', created_at TEXT NOT NULL)'); saveDb(); } catch (_) {}

[
  ['siteName',        'My Status Page'],
  ['siteDesc',        ''],
  ['refreshInterval', '5'],
  ['retentionDays',   '90']
].forEach(([k, v]) => db.run('INSERT OR IGNORE INTO site_config (key, value) VALUES (?, ?)', [k, v]));

const svcCount = dbGet('SELECT COUNT(*) as c FROM services');
if (!svcCount || svcCount.c === 0) {
  db.run('INSERT INTO services (id, name, type, host, timeout, sort) VALUES (?, ?, ?, ?, ?, ?)',
    ['1', 'Example Website', 'http', 'https://example.com', 10, 0]);
}
saveDb();

// ─────────────────────────────────────────────
// Migrate data.json → SQLite (one-time)
// ─────────────────────────────────────────────

const DATA_FILE = join(__dirname, 'data.json');
if (existsSync(DATA_FILE)) {
  try {
    const old = JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
    db.exec('BEGIN');
    if (old.config) {
      Object.entries(old.config).forEach(([k, v]) =>
        db.run('INSERT OR IGNORE INTO site_config (key, value) VALUES (?, ?)', [k, String(v)])
      );
    }
    if (Array.isArray(old.services)) {
      old.services.forEach((s) =>
        db.run(
          `INSERT OR IGNORE INTO services
           (id, name, type, host, timeout, sort, current_status, response_time, last_checked)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [s.id, s.name, s.type, s.host, s.timeout || 10, s.sort || 0,
           s.currentStatus || 'unknown', s.responseTime || 0, s.lastChecked || null]
        )
      );
    }
    if (old.dailyHistory) {
      Object.entries(old.dailyHistory).forEach(([sid, days]) =>
        Object.entries(days).forEach(([date, d]) =>
          db.run(
            `INSERT OR IGNORE INTO daily_history
             (service_id, date, up_count, down_count, total_count, total_response_time)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [sid, date, d.up || 0, d.down || 0, d.total || 0, d.totalResponseTime || 0]
          )
        )
      );
    }
    db.exec('COMMIT');
    saveDb();
    console.log('[Migration] data.json imported to SQLite');
  } catch (e) {
    try { db.exec('ROLLBACK'); } catch (_) {}
    console.warn('[Migration] Failed:', e.message);
  }
}

// ─────────────────────────────────────────────
// Config helpers
// ─────────────────────────────────────────────

function getConfig() {
  const rows = dbAll('SELECT key, value FROM site_config');
  const cfg = {};
  rows.forEach(({ key, value }) => {
    cfg[key] = key === 'refreshInterval' || key === 'retentionDays' ? Number(value) : value;
  });
  return cfg;
}

function setConfig(updates) {
  Object.entries(updates).forEach(([k, v]) =>
    dbRun('INSERT OR REPLACE INTO site_config (key, value) VALUES (?, ?)', k, String(v))
  );
}

// ─────────────────────────────────────────────
// Service checkers
// ─────────────────────────────────────────────

function checkHttp(url, timeoutSec = 10) {
  return new Promise((resolve) => {
    const start = Date.now();
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout: timeoutSec * 1000, rejectUnauthorized: false }, (res) => {
      const elapsed = Date.now() - start;
      const status = res.statusCode < 400 ? 'up' : 'down';
      res.resume();
      resolve({ status, responseTime: elapsed, statusCode: res.statusCode });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 'down', responseTime: timeoutSec * 1000, error: 'Timeout' });
    });
    req.on('error', (err) => {
      resolve({ status: 'down', responseTime: Date.now() - start, error: err.message });
    });
  });
}

function checkTcp(host, port, timeoutSec = 10) {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    socket.setTimeout(timeoutSec * 1000);
    socket.connect(parseInt(port), host, () => {
      const elapsed = Date.now() - start;
      socket.destroy();
      resolve({ status: 'up', responseTime: elapsed });
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ status: 'down', responseTime: timeoutSec * 1000, error: 'Timeout' });
    });
    socket.on('error', (err) => {
      resolve({ status: 'down', responseTime: Date.now() - start, error: err.message });
    });
  });
}

function checkPing(host, timeoutSec = 10) {
  return new Promise((resolve) => {
    const start = Date.now();
    const isWin = process.platform === 'win32';
    const cmd = isWin
      ? `ping -n 1 -w ${timeoutSec * 1000} ${host}`
      : `ping -c 1 -W ${timeoutSec} ${host}`;

    exec(cmd, { timeout: (timeoutSec + 5) * 1000 }, (error, stdout) => {
      const elapsed = Date.now() - start;
      if (error) {
        resolve({ status: 'down', responseTime: elapsed, error: 'Host unreachable' });
        return;
      }
      const winMatch = stdout.match(/Average\s*=\s*(\d+)ms/i);
      const unixMatch = stdout.match(/time[<=](\d+(?:\.\d+)?)\s*ms/i);
      const rtt = winMatch
        ? parseInt(winMatch[1])
        : unixMatch
        ? parseFloat(unixMatch[1])
        : elapsed;
      resolve({ status: 'up', responseTime: rtt });
    });
  });
}

async function checkService(service) {
  try {
    const { type, host, timeout = 10 } = service;
    if (type === 'http' || type === 'https') {
      return await checkHttp(host, timeout);
    } else if (type === 'tcp') {
      const lastColon = host.lastIndexOf(':');
      if (lastColon === -1) return { status: 'down', responseTime: 0, error: 'Expected host:port' };
      const h = host.substring(0, lastColon);
      const p = host.substring(lastColon + 1);
      return await checkTcp(h, p, timeout);
    } else if (type === 'ping') {
      return await checkPing(host, timeout);
    }
    return { status: 'unknown', responseTime: 0 };
  } catch (err) {
    return { status: 'down', responseTime: 0, error: err.message };
  }
}

// ─────────────────────────────────────────────
// Check runner
// ─────────────────────────────────────────────

async function runAllChecks() {
  const services = dbAll('SELECT * FROM services');
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timestamp = now.toISOString();
  const cfg = getConfig();
  const retentionDays = cfg.retentionDays || 90;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  console.log(`[${timestamp}] Running checks for ${services.length} service(s)...`);

  await Promise.all(
    services.map(async (service) => {
      const result = await checkService({
        type: service.type,
        host: service.host,
        timeout: service.timeout
      });

      dbRun(
        `UPDATE services SET current_status = ?, response_time = ?, last_checked = ? WHERE id = ?`,
        result.status, result.responseTime, timestamp, service.id
      );

      dbRun(
        `INSERT INTO daily_history (service_id, date, up_count, down_count, total_count, total_response_time)
         VALUES (?, ?, ?, ?, 1, ?)
         ON CONFLICT(service_id, date) DO UPDATE SET
           up_count = up_count + excluded.up_count,
           down_count = down_count + excluded.down_count,
           total_count = total_count + 1,
           total_response_time = total_response_time + excluded.total_response_time`,
        service.id, dateStr,
        result.status === 'up' ? 1 : 0,
        result.status !== 'up' ? 1 : 0,
        result.responseTime
      );

      dbRun(`DELETE FROM daily_history WHERE service_id = ? AND date < ?`, service.id, cutoffStr);

      console.log(`  [${service.name}] ${result.status.toUpperCase()} – ${result.responseTime}ms`);
    })
  );
}

// ─────────────────────────────────────────────
// API helpers
// ─────────────────────────────────────────────

function buildBars(serviceId) {
  const histMap = {};
  dbAll('SELECT * FROM daily_history WHERE service_id = ?', serviceId)
    .forEach((r) => { histMap[r.date] = r; });

  const bars = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const day = histMap[key];
    if (day && day.total_count > 0) {
      const pct = day.up_count / day.total_count;
      const status = pct >= 0.99 ? 'up' : pct >= 0.5 ? 'degraded' : 'down';
      bars.push({
        date: key, status,
        uptime: Math.round(pct * 100),
        avgResponseTime: Math.round(day.total_response_time / day.total_count),
        checks: day.total_count
      });
    } else {
      bars.push({ date: key, status: 'nodata' });
    }
  }
  return bars;
}

function buildServiceResponse(service) {
  const bars = buildBars(service.id);
  const allDays = dbAll('SELECT * FROM daily_history WHERE service_id = ?', service.id);
  const totalChecks = allDays.reduce((a, d) => a + d.total_count, 0);
  const totalUp     = allDays.reduce((a, d) => a + d.up_count, 0);
  const overallUptime = totalChecks > 0 ? (totalUp / totalChecks * 100).toFixed(2) : null;

  return {
    id:            service.id,
    name:          service.name,
    type:          service.type,
    host:          service.host,
    timeout:       service.timeout,
    currentStatus: service.current_status || 'unknown',
    responseTime:  service.response_time  || 0,
    lastChecked:   service.last_checked   || null,
    sort:          service.sort           ?? 0,
    hideHost:      !!service.hide_host,
    bars,
    uptime: overallUptime
  };
}

// ─────────────────────────────────────────────
// Admin auth helpers
// ─────────────────────────────────────────────

function isAdminSetup() {
  return !!dbGet('SELECT id FROM admin_config WHERE id = 1');
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateToken() {
  return randomBytes(32).toString('hex');
}

async function sendOtpEmail(otp) {
  const admin = dbGet('SELECT * FROM admin_config WHERE id = 1');
  if (!admin) throw new Error('Admin not configured');
  const transporter = nodemailer.createTransport({
    host: admin.smtp_host,
    port: admin.smtp_port,
    secure: admin.smtp_port === 465,
    auth: { user: admin.smtp_user, pass: admin.smtp_pass }
  });
  await transporter.sendMail({
    from: admin.smtp_from || admin.smtp_user,
    to:   admin.email,
    subject: '[StatusPage] Your login code',
    text: `Your one-time login code is: ${otp}\n\nValid for 10 minutes. Do not share this code.`,
    html: `<p>Your one-time login code is:</p><h2 style="letter-spacing:6px;font-size:32px">${otp}</h2><p>Valid for 10 minutes.</p>`
  });
}

function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const session = dbGet('SELECT * FROM sessions WHERE token = ? AND expires_at > ?', token, Date.now());
  if (!session) return res.status(401).json({ error: 'Session expired or invalid' });
  next();
}

// ─────────────────────────────────────────────
// Express app
// ─────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());

// ── Public routes ──────────────────────────

app.get('/api/status', (_req, res) => {
  const services = dbAll('SELECT * FROM services ORDER BY sort ASC');
  res.json({
    config: getConfig(),
    services: services.map(buildServiceResponse),
    lastUpdated: new Date().toISOString()
  });
});

app.post('/api/check-all', requireAdmin, async (_req, res) => {
  await runAllChecks();
  res.json({ success: true });
});

// ── Admin auth routes ───────────────────────

app.get('/api/sadmin/check-setup', (_req, res) => {
  res.json({ isSetup: isAdminSetup() });
});

app.post('/api/sadmin/setup', (req, res) => {
  if (isAdminSetup()) return res.status(400).json({ error: 'Already configured' });
  const { email, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from } = req.body;
  if (!email || !smtp_host || !smtp_user || !smtp_pass) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  dbRun(
    `INSERT INTO admin_config (id, email, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from)
     VALUES (1, ?, ?, ?, ?, ?, ?)`,
    email, smtp_host, parseInt(smtp_port) || 587, smtp_user, smtp_pass, smtp_from || smtp_user
  );
  res.json({ success: true });
});

app.post('/api/sadmin/send-otp', async (req, res) => {
  if (!isAdminSetup()) return res.status(400).json({ error: 'Not configured' });
  const admin = dbGet('SELECT email FROM admin_config WHERE id = 1');
  if (req.body.email !== admin.email) {
    return res.status(403).json({ error: 'Email does not match admin email' });
  }
  const otp = generateOtp();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  dbRun('DELETE FROM otp_tokens WHERE used = 1 OR expires_at < ?', Date.now());
  dbRun('INSERT INTO otp_tokens (code, expires_at) VALUES (?, ?)', otp, expiresAt);
  try {
    await sendOtpEmail(otp);
    res.json({ success: true, message: 'OTP sent to admin email' });
  } catch (err) {
    console.error('[OTP] Email send failed:', err.message);
    res.status(500).json({ error: 'Failed to send email: ' + err.message });
  }
});

app.post('/api/sadmin/verify-otp', (req, res) => {
  if (!isAdminSetup()) return res.status(400).json({ error: 'Not configured' });
  const { code } = req.body;
  const row = dbGet(
    'SELECT * FROM otp_tokens WHERE code = ? AND used = 0 AND expires_at > ? ORDER BY id DESC LIMIT 1',
    code, Date.now()
  );
  if (!row) return res.status(401).json({ error: 'Invalid or expired code' });
  dbRun('UPDATE otp_tokens SET used = 1 WHERE id = ?', row.id);
  const token = generateToken();
  const now = Date.now();
  dbRun('INSERT INTO sessions (token, created_at, expires_at) VALUES (?, ?, ?)', token, now, now + 24 * 60 * 60 * 1000);
  res.json({ success: true, token });
});

app.get('/api/sadmin/verify-session', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (!token) return res.json({ valid: false });
  const session = dbGet('SELECT * FROM sessions WHERE token = ? AND expires_at > ?', token, Date.now());
  res.json({ valid: !!session });
});

app.post('/api/sadmin/logout', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (token) dbRun('DELETE FROM sessions WHERE token = ?', token);
  res.json({ success: true });
});

app.get('/api/sadmin/admin-config', requireAdmin, (_req, res) => {
  const row = dbGet('SELECT email, smtp_host, smtp_port, smtp_user, smtp_from FROM admin_config WHERE id = 1');
  res.json(row || {});
});

app.put('/api/sadmin/admin-config', requireAdmin, (req, res) => {
  const { email, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from } = req.body;
  if (smtp_pass) {
    dbRun(
      `UPDATE admin_config SET email=?, smtp_host=?, smtp_port=?, smtp_user=?, smtp_pass=?, smtp_from=? WHERE id=1`,
      email, smtp_host, parseInt(smtp_port) || 587, smtp_user, smtp_pass, smtp_from || smtp_user
    );
  } else {
    dbRun(
      `UPDATE admin_config SET email=?, smtp_host=?, smtp_port=?, smtp_user=?, smtp_from=? WHERE id=1`,
      email, smtp_host, parseInt(smtp_port) || 587, smtp_user, smtp_from || smtp_user
    );
  }
  res.json({ success: true });
});

// ── Incidents (public read, admin write) ──

app.get('/api/incidents', (_req, res) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const rows = dbAll(
    'SELECT * FROM incidents WHERE created_at >= ? ORDER BY created_at DESC',
    cutoff.toISOString()
  );
  const result = rows.map(inc => ({
    ...inc,
    updates: dbAll('SELECT * FROM incident_updates WHERE incident_id = ? ORDER BY created_at DESC', inc.id)
  }));
  res.json(result);
});

app.post('/api/incidents', requireAdmin, (req, res) => {
  const { title, message, status, affected_services } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const id = Date.now().toString();
  const now = new Date().toISOString();
  const st = status || 'investigating';
  const aff = JSON.stringify(Array.isArray(affected_services) ? affected_services : []);
  dbRun(
    'INSERT INTO incidents (id, title, message, status, affected_services, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    id, title, '', st, aff, now, now
  );
  if (message && message.trim()) {
    dbRun('INSERT INTO incident_updates (id, incident_id, status, message, created_at) VALUES (?, ?, ?, ?, ?)',
      id + '_0', id, st, message.trim(), now);
  }
  saveDb();
  res.json({ success: true, incident: dbGet('SELECT * FROM incidents WHERE id = ?', id) });
});

app.put('/api/incidents/:id', requireAdmin, (req, res) => {
  const inc = dbGet('SELECT * FROM incidents WHERE id = ?', req.params.id);
  if (!inc) return res.status(404).json({ error: 'Not found' });
  const { title, message, status, affected_services } = req.body;
  const now = new Date().toISOString();
  const resolvedAt = status === 'resolved' && inc.status !== 'resolved' ? now : (inc.resolved_at || null);
  const aff = affected_services !== undefined ? JSON.stringify(Array.isArray(affected_services) ? affected_services : []) : (inc.affected_services || '[]');
  dbRun(
    'UPDATE incidents SET title=?, message=?, status=?, affected_services=?, updated_at=?, resolved_at=? WHERE id=?',
    title ?? inc.title, message ?? inc.message, status ?? inc.status, aff, now, resolvedAt, req.params.id
  );
  res.json({ success: true, incident: dbGet('SELECT * FROM incidents WHERE id = ?', req.params.id) });
});

app.post('/api/incidents/:id/updates', requireAdmin, (req, res) => {
  const inc = dbGet('SELECT * FROM incidents WHERE id = ?', req.params.id);
  if (!inc) return res.status(404).json({ error: 'Not found' });
  const { status, message } = req.body;
  if (!status || !message) return res.status(400).json({ error: 'status and message required' });
  const uid = Date.now().toString();
  const now = new Date().toISOString();
  const resolvedAt = status === 'resolved' && inc.status !== 'resolved' ? now : (inc.resolved_at || null);
  dbRun('INSERT INTO incident_updates (id, incident_id, status, message, created_at) VALUES (?, ?, ?, ?, ?)',
    uid, req.params.id, status, message, now);
  dbRun('UPDATE incidents SET status=?, updated_at=?, resolved_at=? WHERE id=?',
    status, now, resolvedAt, req.params.id);
  saveDb();
  res.json({ success: true });
});

app.delete('/api/incidents/:id', requireAdmin, (req, res) => {
  if (!dbGet('SELECT id FROM incidents WHERE id = ?', req.params.id))
    return res.status(404).json({ error: 'Not found' });
  dbRun('DELETE FROM incident_updates WHERE incident_id = ?', req.params.id);
  dbRun('DELETE FROM incidents WHERE id = ?', req.params.id);
  saveDb();
  res.json({ success: true });
});

// ── Config CRUD (admin protected) ──────────

app.get('/api/config', (_req, res) => {
  res.json(getConfig());
});

app.put('/api/config', requireAdmin, (req, res) => {
  const oldInterval = getConfig().refreshInterval;
  setConfig(req.body);
  const newInterval = Number(req.body.refreshInterval) || oldInterval;
  if (newInterval !== oldInterval) restartScheduler(newInterval);
  res.json({ success: true, config: getConfig() });
});

// ── Services CRUD (admin protected) ────────

app.post('/api/services', requireAdmin, async (req, res) => {
  const id = Date.now().toString();
  const sortRow = dbGet('SELECT MAX(sort) as m FROM services');
  const sortMax = sortRow?.m ?? -1;
  dbRun(
    `INSERT INTO services (id, name, type, host, timeout, hide_host, sort) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id, req.body.name || 'New Service', req.body.type || 'http',
    req.body.host || '', parseInt(req.body.timeout) || 10, req.body.hide_host ? 1 : 0, sortMax + 1
  );

  const svc = dbGet('SELECT * FROM services WHERE id = ?', id);
  const result = await checkService(svc);
  const ts = new Date().toISOString();
  const dateStr = ts.split('T')[0];
  dbRun('UPDATE services SET current_status=?, response_time=?, last_checked=? WHERE id=?',
    result.status, result.responseTime, ts, id);
  dbRun(
    `INSERT INTO daily_history (service_id, date, up_count, down_count, total_count, total_response_time)
     VALUES (?, ?, ?, ?, 1, ?)`,
    id, dateStr, result.status === 'up' ? 1 : 0, result.status !== 'up' ? 1 : 0, result.responseTime
  );

  res.json({ success: true, service: buildServiceResponse(dbGet('SELECT * FROM services WHERE id=?', id)) });
});

app.put('/api/services/:id', requireAdmin, (req, res) => {
  const svc = dbGet('SELECT * FROM services WHERE id = ?', req.params.id);
  if (!svc) return res.status(404).json({ error: 'Not found' });
  dbRun(
    `UPDATE services SET name=?, type=?, host=?, timeout=?, hide_host=? WHERE id=?`,
    req.body.name    ?? svc.name,
    req.body.type    ?? svc.type,
    req.body.host    ?? svc.host,
    req.body.timeout !== undefined ? parseInt(req.body.timeout) : svc.timeout,
    req.body.hide_host !== undefined ? (req.body.hide_host ? 1 : 0) : svc.hide_host,
    req.params.id
  );
  res.json({ success: true, service: buildServiceResponse(dbGet('SELECT * FROM services WHERE id=?', req.params.id)) });
});

app.delete('/api/services/:id', requireAdmin, (req, res) => {
  const svc = dbGet('SELECT id FROM services WHERE id = ?', req.params.id);
  if (!svc) return res.status(404).json({ error: 'Not found' });
  dbRun('DELETE FROM services WHERE id = ?', req.params.id);
  dbRun('DELETE FROM daily_history WHERE service_id = ?', req.params.id);
  res.json({ success: true });
});

// ─────────────────────────────────────────────
// Scheduler
// ─────────────────────────────────────────────

let schedulerTimer = null;

function restartScheduler(minutes) {
  if (schedulerTimer) clearInterval(schedulerTimer);
  const ms = minutes * 60 * 1000;
  schedulerTimer = setInterval(() => runAllChecks().catch(console.error), ms);
  console.log(`Scheduler: checks every ${minutes} minute(s) (${ms}ms)`);
}

// ─────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`\n✅ StatusPage API running → http://localhost:${PORT}\n`);
  const cfg = getConfig();
  restartScheduler(cfg.refreshInterval || 5);
  await runAllChecks().catch(console.error);
});
