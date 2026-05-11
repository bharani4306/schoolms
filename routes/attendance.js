// ─────────────────────────────────────────────────────────────
//  Attendance Routes  —  /api/attendance
// ─────────────────────────────────────────────────────────────
const express = require('express');
const { clickhouse } = require('../db/clickhouse');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/attendance?student_id=STU001&from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/', async (req, res) => {
  const sid = req.user.role === 'student' ? req.user.id : (req.query.student_id || '');
  const from = req.query.from || '2024-01-01';
  const to   = req.query.to   || new Date().toISOString().split('T')[0];

  try {
    const query = sid
      ? `SELECT * FROM attendance WHERE student_id={sid:String} AND date BETWEEN {from:String} AND {to:String} ORDER BY date DESC`
      : `SELECT * FROM attendance WHERE date BETWEEN {from:String} AND {to:String} ORDER BY date DESC LIMIT 1000`;
    const result = await clickhouse.query({
      query, query_params: { sid, from, to }, format: 'JSONEachRow',
    });
    res.json(await result.json());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/attendance/summary?student_id=
router.get('/summary', async (req, res) => {
  const sid = req.user.role === 'student' ? req.user.id : req.query.student_id;
  if (!sid) return res.status(400).json({ error: 'student_id required' });
  try {
    const result = await clickhouse.query({
      query: `SELECT status, count() AS total FROM attendance
              WHERE student_id={sid:String} GROUP BY status`,
      query_params: { sid },
      format: 'JSONEachRow',
    });
    const rows = await result.json();
    const summary = { Present: 0, Absent: 0, Late: 0, Holiday: 0, total: 0 };
    rows.forEach(r => { summary[r.status] = Number(r.total); summary.total += Number(r.total); });
    summary.percentage = summary.total > 0
      ? (((summary.Present + summary.Late * 0.5) / summary.total) * 100).toFixed(1)
      : '0.0';
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/attendance  — mark attendance (teacher only)
router.post('/', requireRole('teacher'), async (req, res) => {
  const records = req.body; // Array: [{ student_id, date, status }]
  if (!Array.isArray(records) || !records.length)
    return res.status(400).json({ error: 'Provide an array of attendance records' });
  try {
    await clickhouse.insert({
      table: 'attendance',
      values: records.map(r => ({ ...r, teacher_id: req.user.id })),
      format: 'JSONEachRow',
    });
    res.status(201).json({ message: `${records.length} attendance records saved` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
