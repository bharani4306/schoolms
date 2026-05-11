// ─────────────────────────────────────────────────────────────
//  Express Server — School Management System
// ─────────────────────────────────────────────────────────────
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { testConnection } = require('./db/clickhouse');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/students',      require('./routes/students'));
app.use('/api/teachers',      require('./routes/teachers'));
app.use('/api/grades',        require('./routes/grades'));
app.use('/api/attendance',    require('./routes/attendance'));
app.use('/api/announcements', require('./routes/announcements'));

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  const { clickhouse } = require('./db/clickhouse');
  try {
    const r = await clickhouse.query({ query: 'SELECT 1 AS ok', format: 'JSONEachRow' });
    const rows = await r.json();
    res.json({ status: 'ok', clickhouse: rows[0]?.ok === 1 ? 'connected' : 'error' });
  } catch {
    res.status(500).json({ status: 'error', clickhouse: 'disconnected' });
  }
});

// ── Catch-all: serve index.html for SPA routing ───────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`\n🏫  School MS Server running at http://localhost:${PORT}`);
  await testConnection();
  console.log(`📚  API docs available at http://localhost:${PORT}/api/health\n`);
});
