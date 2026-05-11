// ─────────────────────────────────────────────────────────────
//  Student Routes  —  /api/students  (teacher-accessible)
// ─────────────────────────────────────────────────────────────
const express  = require('express');
const bcrypt   = require('bcryptjs');
const { clickhouse } = require('../db/clickhouse');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/students  — list all (teachers) or own profile (student)
router.get('/', async (req, res) => {
  try {
    let query;
    if (req.user.role === 'teacher') {
      query = `SELECT id,name,email,phone,class,section,roll_no,gender,parent_name,parent_phone,teacher_id,status,created_at
               FROM students ORDER BY class, section, roll_no`;
    } else {
      query = `SELECT id,name,email,phone,class,section,roll_no,dob,gender,address,parent_name,parent_phone,teacher_id,status,created_at
               FROM students WHERE id = {id:String} LIMIT 1`;
    }
    const result = await clickhouse.query({
      query,
      query_params: { id: req.user.id },
      format: 'JSONEachRow',
    });
    const rows = await result.json();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/students/:id  — get one student
router.get('/:id', async (req, res) => {
  // Student can only view their own profile
  if (req.user.role === 'student' && req.user.id !== req.params.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  try {
    const result = await clickhouse.query({
      query: `SELECT id,name,email,phone,class,section,roll_no,dob,gender,address,parent_name,parent_phone,teacher_id,status,created_at
              FROM students WHERE id = {id:String} LIMIT 1`,
      query_params: { id: req.params.id },
      format: 'JSONEachRow',
    });
    const rows = await result.json();
    if (!rows.length) return res.status(404).json({ error: 'Student not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/students  — add new student (teacher only)
router.post('/', requireRole('teacher'), async (req, res) => {
  const { id, name, email, phone, class: cls, section, roll_no, dob,
          gender, address, parent_name, parent_phone, teacher_id, password } = req.body;
  if (!id || !name || !password) return res.status(400).json({ error: 'id, name and password are required' });

  try {
    const password_hash = await bcrypt.hash(password, 10);
    await clickhouse.insert({
      table: 'students',
      values: [{ id, name, email, phone, class: cls, section, roll_no: Number(roll_no),
                 dob, gender, address, parent_name, parent_phone, teacher_id, password_hash, status:'active' }],
      format: 'JSONEachRow',
    });
    res.status(201).json({ message: 'Student created', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/students/:id  — update student (teacher only)
router.put('/:id', requireRole('teacher'), async (req, res) => {
  const { name, email, phone, class: cls, section, roll_no, address, parent_name, parent_phone, status } = req.body;
  try {
    await clickhouse.command({
      query: `ALTER TABLE students UPDATE
              name={name:String}, email={email:String}, phone={phone:String},
              class={cls:String}, section={section:String}, roll_no={roll_no:UInt16},
              address={address:String}, parent_name={parent_name:String},
              parent_phone={parent_phone:String}, status={status:String}
              WHERE id = {id:String}`,
      query_params: { name, email, phone, cls, section, roll_no: Number(roll_no),
                      address, parent_name, parent_phone, status, id: req.params.id },
    });
    res.json({ message: 'Student updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/students/:id  — soft-delete (teacher only)
router.delete('/:id', requireRole('teacher'), async (req, res) => {
  try {
    await clickhouse.command({
      query: `ALTER TABLE students UPDATE status='inactive' WHERE id = {id:String}`,
      query_params: { id: req.params.id },
    });
    res.json({ message: 'Student deactivated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
