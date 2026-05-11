// ─────────────────────────────────────────────────────────────
//  Teacher Routes  —  /api/teachers
// ─────────────────────────────────────────────────────────────
const express  = require('express');
const bcrypt   = require('bcryptjs');
const { clickhouse } = require('../db/clickhouse');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/teachers  — list all (any authenticated user)
router.get('/', async (_req, res) => {
  try {
    const result = await clickhouse.query({
      query: `SELECT id,name,email,phone,subject,department,qualification,experience,join_date,status,created_at
              FROM teachers WHERE status='active' ORDER BY name`,
      format: 'JSONEachRow',
    });
    res.json(await result.json());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/teachers/me  — own profile (teacher)
router.get('/me', requireRole('teacher'), async (req, res) => {
  try {
    const result = await clickhouse.query({
      query: `SELECT id,name,email,phone,subject,department,qualification,experience,join_date,address,status,created_at
              FROM teachers WHERE id={id:String} LIMIT 1`,
      query_params: { id: req.user.id },
      format: 'JSONEachRow',
    });
    const rows = await result.json();
    if (!rows.length) return res.status(404).json({ error: 'Teacher not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/teachers/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await clickhouse.query({
      query: `SELECT id,name,email,phone,subject,department,qualification,experience,join_date,status,created_at
              FROM teachers WHERE id={id:String} LIMIT 1`,
      query_params: { id: req.params.id },
      format: 'JSONEachRow',
    });
    const rows = await result.json();
    if (!rows.length) return res.status(404).json({ error: 'Teacher not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/teachers  — create teacher
router.post('/', requireRole('teacher'), async (req, res) => {
  const { id, name, email, phone, subject, department, qualification,
          experience, join_date, address, password } = req.body;
  if (!id || !name || !password) return res.status(400).json({ error: 'id, name, password required' });
  try {
    const password_hash = await bcrypt.hash(password, 10);
    await clickhouse.insert({
      table: 'teachers',
      values: [{ id, name, email, phone, subject, department, qualification,
                 experience: Number(experience), join_date, address, password_hash, status:'active' }],
      format: 'JSONEachRow',
    });
    res.status(201).json({ message: 'Teacher created', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
