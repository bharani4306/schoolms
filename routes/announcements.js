// ─────────────────────────────────────────────────────────────
//  Announcements Routes  —  /api/announcements
// ─────────────────────────────────────────────────────────────
const express = require('express');
const { clickhouse } = require('../db/clickhouse');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/announcements  — filtered by audience
router.get('/', async (req, res) => {
  const role = req.user.role; // 'student' | 'teacher'
  const audience = role === 'student' ? "'all','students'" : "'all','teachers'";
  try {
    const result = await clickhouse.query({
      query: `SELECT * FROM announcements WHERE audience IN (${audience})
              ORDER BY created_at DESC LIMIT 20`,
      format: 'JSONEachRow',
    });
    res.json(await result.json());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/announcements  — create (teacher only)
router.post('/', requireRole('teacher'), async (req, res) => {
  const { title, content, audience } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'title and content required' });
  try {
    await clickhouse.insert({
      table: 'announcements',
      values: [{ title, content, audience: audience || 'all', author_id: req.user.id }],
      format: 'JSONEachRow',
    });
    res.status(201).json({ message: 'Announcement posted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
