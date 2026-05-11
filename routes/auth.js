// ─────────────────────────────────────────────────────────────
//  Auth Routes  —  POST /api/auth/login/:role
// ─────────────────────────────────────────────────────────────
const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { clickhouse } = require('../db/clickhouse');

const router = express.Router();
const JWT_SECRET  = process.env.JWT_SECRET;
const JWT_EXPIRES = '8h';

// ── POST /api/auth/login/student ─────────────────────────────
router.post('/login/student', async (req, res) => {
  const { id, password } = req.body;
  if (!id || !password) return res.status(400).json({ error: 'ID and password are required' });

  try {
    const result = await clickhouse.query({
      query: `SELECT * FROM students WHERE id = {id:String} AND status = 'active' LIMIT 1`,
      query_params: { id },
      format: 'JSONEachRow',
    });
    const rows = await result.json();
    if (!rows.length) return res.status(401).json({ error: 'Invalid student ID or password' });

    const student = rows[0];
    const match = await bcrypt.compare(password, student.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid student ID or password' });

    const token = jwt.sign(
      { id: student.id, name: student.name, role: 'student', class: student.class, section: student.section },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    const { password_hash, ...safeStudent } = student;
    res.json({ token, user: safeStudent, role: 'student' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed', detail: err.message });
  }
});

// ── POST /api/auth/login/teacher ─────────────────────────────
router.post('/login/teacher', async (req, res) => {
  const { id, password } = req.body;
  if (!id || !password) return res.status(400).json({ error: 'ID and password are required' });

  try {
    const result = await clickhouse.query({
      query: `SELECT * FROM teachers WHERE id = {id:String} AND status = 'active' LIMIT 1`,
      query_params: { id },
      format: 'JSONEachRow',
    });
    const rows = await result.json();
    if (!rows.length) return res.status(401).json({ error: 'Invalid teacher ID or password' });

    const teacher = rows[0];
    const match = await bcrypt.compare(password, teacher.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid teacher ID or password' });

    const token = jwt.sign(
      { id: teacher.id, name: teacher.name, role: 'teacher', subject: teacher.subject },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    const { password_hash, ...safeTeacher } = teacher;
    res.json({ token, user: safeTeacher, role: 'teacher' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed', detail: err.message });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────
router.post('/logout', (_req, res) => {
  // JWT is stateless – client just drops the token
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
