// ─────────────────────────────────────────────────────────────
//  API Client — wraps all fetch calls to the backend
// ─────────────────────────────────────────────────────────────

const API_BASE = window.location.origin + '/api';

function getToken() { return localStorage.getItem('school_ms_token'); }
function getUser()  { try { return JSON.parse(localStorage.getItem('school_ms_user')); } catch { return null; } }
function getRole()  { return localStorage.getItem('school_ms_role'); }

function saveSession(data) {
  localStorage.setItem('school_ms_token', data.token);
  localStorage.setItem('school_ms_user',  JSON.stringify(data.user));
  localStorage.setItem('school_ms_role',  data.role);
}

function clearSession() {
  localStorage.removeItem('school_ms_token');
  localStorage.removeItem('school_ms_user');
  localStorage.removeItem('school_ms_role');
}

function requireAuth(role) {
  const token = getToken();
  const userRole = getRole();
  if (!token) { window.location.href = role === 'teacher' ? '/login-teacher.html' : '/login-student.html'; return false; }
  if (role && userRole !== role) { window.location.href = '/index.html'; return false; }
  return true;
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

const Api = {
  // Auth
  loginStudent: (id, password) => apiFetch('/auth/login/student', { method:'POST', body: JSON.stringify({ id, password }) }),
  loginTeacher: (id, password) => apiFetch('/auth/login/teacher', { method:'POST', body: JSON.stringify({ id, password }) }),

  // Students
  getStudents: ()      => apiFetch('/students'),
  getStudent:  (id)    => apiFetch(`/students/${id}`),
  createStudent: (data)=> apiFetch('/students', { method:'POST', body: JSON.stringify(data) }),
  updateStudent: (id, data) => apiFetch(`/students/${id}`, { method:'PUT', body: JSON.stringify(data) }),
  deleteStudent: (id)  => apiFetch(`/students/${id}`, { method:'DELETE' }),

  // Teachers
  getTeachers: ()    => apiFetch('/teachers'),
  getTeacherMe: ()   => apiFetch('/teachers/me'),
  getTeacher: (id)   => apiFetch(`/teachers/${id}`),
  createTeacher: (d) => apiFetch('/teachers', { method:'POST', body: JSON.stringify(d) }),

  // Grades
  getGrades: (studentId) => apiFetch(`/grades${studentId ? '?student_id=' + studentId : ''}`),
  getGradeSummary: (studentId) => apiFetch(`/grades/summary?student_id=${studentId}`),
  addGrade: (data) => apiFetch('/grades', { method:'POST', body: JSON.stringify(data) }),

  // Attendance
  getAttendance: (studentId, from, to) => {
    let q = studentId ? `?student_id=${studentId}` : '?';
    if (from) q += `&from=${from}`;
    if (to)   q += `&to=${to}`;
    return apiFetch(`/attendance${q}`);
  },
  getAttendanceSummary: (studentId) => apiFetch(`/attendance/summary?student_id=${studentId}`),
  markAttendance: (records) => apiFetch('/attendance', { method:'POST', body: JSON.stringify(records) }),

  // Announcements
  getAnnouncements: () => apiFetch('/announcements'),
  postAnnouncement: (data) => apiFetch('/announcements', { method:'POST', body: JSON.stringify(data) }),
};

// ── Toast helper ──────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3100);
}

// ── Utility ───────────────────────────────────────────────────
function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  return isNaN(d) ? str : d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}

function gradeLabel(pct) {
  const p = parseFloat(pct);
  if (p >= 90) return 'A+';
  if (p >= 80) return 'A';
  if (p >= 70) return 'B+';
  if (p >= 60) return 'B';
  if (p >= 50) return 'C';
  return 'D';
}

function avatarColors(name) {
  const colors = ['av-blue','av-amber','av-emerald','av-purple','av-rose','av-cyan'];
  const idx = (name || '?').charCodeAt(0) % colors.length;
  return colors[idx];
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
}

function animateCount(el, target, duration = 1200) {
  let start = 0;
  const step = (ts) => {
    if (!start) start = ts;
    const progress = Math.min((ts - start) / duration, 1);
    el.textContent = Math.floor(progress * target);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target;
  };
  requestAnimationFrame(step);
}
