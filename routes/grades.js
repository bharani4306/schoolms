// ─────────────────────────────────────────────────────────────
//  Grades Routes  —  /api/grades
// ─────────────────────────────────────────────────────────────
const express = require('express');
const { clickhouse } = require('../db/clickhouse');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/grades?student_id=STU001  — student can only get own
router.get('/', async (req, res) => {
  const sid = req.user.role === 'student' ? req.user.id : (req.query.student_id || '');
  try {
    const query = sid
      ? `SELECT * FROM grades WHERE student_id={sid:String} ORDER BY exam_date DESC`
      : `SELECT * FROM grades ORDER BY exam_date DESC LIMIT 500`;
    const result = await clickhouse.query({
      query,
      query_params: { sid },
      format: 'JSONEachRow',
    });
    res.json(await result.json());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/grades/summary?student_id=  — per-subject averages
router.get('/summary', async (req, res) => {
  const sid = req.user.role === 'student' ? req.user.id : req.query.student_id;
  if (!sid) return res.status(400).json({ error: 'student_id required' });
  try {
    const result = await clickhouse.query({
      query: `SELECT subject,
                avg(marks/max_marks*100) AS percentage,
                max(marks) AS highest,
                count() AS attempts
              FROM grades WHERE student_id={sid:String}
              GROUP BY subject ORDER BY subject`,
      query_params: { sid },
      format: 'JSONEachRow',
    });
    res.json(await result.json());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/grades  — add grade (teacher only)
router.post('/', requireRole('teacher'), async (req, res) => {
  const { student_id, subject, exam_type, marks, max_marks, exam_date } = req.body;
  if (!student_id || !subject || marks === undefined)
    return res.status(400).json({ error: 'student_id, subject, marks required' });
  try {
    await clickhouse.insert({
      table: 'grades',
      values: [{ student_id, subject, exam_type, marks: Number(marks),
                 max_marks: Number(max_marks) || 100, exam_date,
                 teacher_id: req.user.id }],
      format: 'JSONEachRow',
    });
    res.status(201).json({ message: 'Grade recorded' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
