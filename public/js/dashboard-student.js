// ─────────────────────────────────────────────────────────────
//  Student Dashboard JS
// ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth('student')) return;
  const user = getUser();

  // ── Sidebar profile ─────────────────────────────────────────
  document.getElementById('sb-name').textContent = user.name;
  document.getElementById('sb-id').textContent   = user.id;
  document.getElementById('sb-avatar').textContent = initials(user.name);
  document.getElementById('sb-avatar').className = `avatar-placeholder ${avatarColors(user.name)}`;

  // ── Time display ────────────────────────────────────────────
  const timeEl = document.getElementById('topbar-time');
  const updateTime = () => { timeEl.textContent = new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }); };
  updateTime(); setInterval(updateTime, 1000);

  // ── Section navigation ──────────────────────────────────────
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.dash-section');
  const pageTitle = document.getElementById('page-title');

  const sectionTitles = {
    overview: 'Overview', profile: 'My Profile', grades: 'Grades & Marks',
    attendance: 'Attendance', announcements: 'Announcements', teachers: 'Teachers'
  };

  function showSection(name) {
    navItems.forEach(n => n.classList.toggle('active', n.dataset.section === name));
    sections.forEach(s => s.classList.toggle('active', s.id === `section-${name}`));
    pageTitle.textContent = sectionTitles[name] || name;
    if (!loadedSections.has(name)) { loadSection(name); loadedSections.add(name); }
  }

  const loadedSections = new Set();
  navItems.forEach(n => n.addEventListener('click', () => showSection(n.dataset.section)));

  // ── Logout ──────────────────────────────────────────────────
  document.getElementById('logout-btn').addEventListener('click', () => {
    clearSession();
    window.location.href = '/login-student.html';
  });

  // ── Load all data ────────────────────────────────────────────
  async function loadSection(name) {
    switch(name) {
      case 'overview':     await loadOverview();      break;
      case 'profile':      await loadProfile();       break;
      case 'grades':       await loadGrades();        break;
      case 'attendance':   await loadAttendance();    break;
      case 'announcements': await loadAnnouncements(); break;
      case 'teachers':     await loadTeachers();      break;
    }
  }

  // Load overview on start
  showSection('overview');

  // ─────────────────────────────────────────────────────────────
  //  OVERVIEW
  // ─────────────────────────────────────────────────────────────
  async function loadOverview() {
    try {
      const [gradeSummary, attSummary, grades, announcements] = await Promise.all([
        Api.getGradeSummary(user.id),
        Api.getAttendanceSummary(user.id),
        Api.getGrades(user.id),
        Api.getAnnouncements(),
      ]);

      // Stats
      const avgScore = gradeSummary.length
        ? (gradeSummary.reduce((s,g) => s + parseFloat(g.percentage), 0) / gradeSummary.length).toFixed(1)
        : '—';

      document.getElementById('stat-avg').textContent = avgScore !== '—' ? `${avgScore}%` : '—';
      document.getElementById('stat-att').textContent = `${attSummary.percentage}%`;
      document.getElementById('stat-grade').textContent = avgScore !== '—' ? gradeLabel(avgScore) : '—';
      document.getElementById('stat-subjects').textContent = gradeSummary.length;

      // Animate counts
      const statEls = document.querySelectorAll('.stat-value');
      statEls.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(10px)';
        el.style.transition = 'opacity 0.5s, transform 0.5s';
        setTimeout(() => { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; }, 100);
      });

      // Recent grades
      const tbody = document.getElementById('recent-grades-body');
      const recent = grades.slice(0, 8);
      if (recent.length) {
        tbody.innerHTML = recent.map(g => {
          const pct = ((g.marks / g.max_marks) * 100).toFixed(1);
          const gl = gradeLabel(pct);
          const pctColor = parseFloat(pct) >= 80 ? 'var(--emerald-400)' : parseFloat(pct) >= 60 ? 'var(--amber-400)' : 'var(--rose-400)';
          return `<tr>
            <td><strong>${g.subject}</strong></td>
            <td><span class="badge badge-purple">${g.exam_type}</span></td>
            <td>${g.marks}</td>
            <td style="color:var(--text-muted)">${g.max_marks}</td>
            <td><strong style="color:${pctColor}">${pct}%</strong></td>
            <td style="color:var(--text-muted)">${formatDate(g.exam_date)}</td>
            <td><span class="badge ${parseFloat(pct)>=80?'badge-emerald':parseFloat(pct)>=60?'badge-amber':'badge-rose'}">${gl}</span></td>
          </tr>`;
        }).join('');
      } else {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px">No exam records found.</td></tr>`;
      }

      // Overview announcements
      const annContainer = document.getElementById('overview-announcements');
      annContainer.innerHTML = announcements.slice(0,3).map(a => `
        <div class="ann-item">
          <div class="ann-top">
            <span class="ann-title">${a.title}</span>
            <span class="badge ${a.audience==='all'?'badge-blue':a.audience==='students'?'badge-emerald':'badge-amber'}">${a.audience}</span>
          </div>
          <div class="ann-content">${a.content}</div>
          <div class="ann-date">📅 ${formatDate(a.created_at)}</div>
        </div>
      `).join('') || '<div style="color:var(--text-muted);text-align:center;padding:12px">No announcements.</div>';

    } catch (err) {
      showToast('Failed to load dashboard: ' + err.message, 'error');
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  PROFILE
  // ─────────────────────────────────────────────────────────────
  async function loadProfile() {
    try {
      const s = await Api.getStudent(user.id);
      const av = document.getElementById('profile-avatar');
      av.textContent = initials(s.name);
      av.className = `avatar-placeholder ${avatarColors(s.name)}`;
      document.getElementById('profile-name').textContent = s.name;
      document.getElementById('profile-sub').textContent = `Class ${s.class}-${s.section} • Roll #${s.roll_no}`;
      document.getElementById('profile-badges').innerHTML = `
        <span class="badge badge-blue">Class ${s.class}-${s.section}</span>
        <span class="badge badge-emerald">${s.status === 'active' ? 'Active' : 'Inactive'}</span>
        <span class="badge badge-purple">${s.gender}</span>
      `;
      document.getElementById('profile-detail-grid').innerHTML = `
        ${detailItem('Student ID', s.id)}
        ${detailItem('Full Name', s.name)}
        ${detailItem('Email', s.email || '—')}
        ${detailItem('Phone', s.phone || '—')}
        ${detailItem('Class', `${s.class}-${s.section}`)}
        ${detailItem('Roll No.', s.roll_no)}
        ${detailItem('Date of Birth', formatDate(s.dob))}
        ${detailItem('Gender', s.gender)}
        ${detailItem('Address', s.address || '—')}
        ${detailItem('Joined', formatDate(s.created_at))}
      `;
      document.getElementById('parent-detail-grid').innerHTML = `
        ${detailItem('Parent/Guardian Name', s.parent_name || '—')}
        ${detailItem('Parent Phone', s.parent_phone || '—')}
      `;
    } catch (err) { showToast(err.message, 'error'); }
  }

  function detailItem(label, value) {
    return `<div class="detail-item"><div class="detail-label">${label}</div><div class="detail-value">${value}</div></div>`;
  }

  // ─────────────────────────────────────────────────────────────
  //  GRADES
  // ─────────────────────────────────────────────────────────────
  let allGradesData = [];
  async function loadGrades() {
    try {
      const [grades, summary] = await Promise.all([
        Api.getGrades(user.id),
        Api.getGradeSummary(user.id),
      ]);
      allGradesData = grades;

      // Subject performance bars
      const subjectList = document.getElementById('grade-subject-list');
      subjectList.innerHTML = summary.map(g => {
        const pct = parseFloat(g.percentage).toFixed(1);
        const color = parseFloat(pct) >= 80 ? 'var(--emerald-400)' : parseFloat(pct) >= 60 ? 'var(--amber-400)' : 'var(--rose-400)';
        const gradeFill = parseFloat(pct) >= 80 ? 'linear-gradient(90deg,var(--emerald-500),var(--cyan-400))'
          : parseFloat(pct) >= 60 ? 'linear-gradient(90deg,var(--amber-500),var(--amber-400))'
          : 'linear-gradient(90deg,var(--rose-500),var(--rose-400))';
        return `<div class="gsb-row">
          <div class="gsb-header">
            <div>
              <span class="gsb-name">${g.subject}</span>
              <span class="gsb-attempts" style="margin-left:8px">${g.attempts} exam(s)</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <span class="gsb-pct" style="color:${color}">${pct}%</span>
              <span class="badge ${parseFloat(pct)>=80?'badge-emerald':parseFloat(pct)>=60?'badge-amber':'badge-rose'}">${gradeLabel(pct)}</span>
            </div>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width:0%;background:${gradeFill}" data-width="${pct}%"></div>
          </div>
        </div>`;
      }).join('') || '<div style="color:var(--text-muted);text-align:center">No grade data yet.</div>';

      // Animate progress bars
      setTimeout(() => {
        document.querySelectorAll('.progress-fill[data-width]').forEach(el => {
          el.style.width = el.dataset.width;
        });
      }, 200);

      // Summary cards
      const summaryEl = document.getElementById('grade-summary-cards');
      if (summary.length) {
        const avg = (summary.reduce((s,g) => s + parseFloat(g.percentage), 0) / summary.length).toFixed(1);
        const best = summary.reduce((b,g) => parseFloat(g.percentage) > parseFloat(b.percentage) ? g : b, summary[0]);
        summaryEl.innerHTML = `
          <div class="att-mini glass-card" style="border-radius:var(--radius-md)">
            <div class="att-mini-val" style="color:var(--blue-300)">${avg}%</div>
            <div class="att-mini-label">Overall Average</div>
          </div>
          <div class="att-mini glass-card" style="border-radius:var(--radius-md)">
            <div class="att-mini-val" style="color:var(--emerald-400)">${gradeLabel(avg)}</div>
            <div class="att-mini-label">Overall Grade</div>
          </div>
          <div class="att-mini glass-card" style="border-radius:var(--radius-md);grid-column:span 2">
            <div class="att-mini-val" style="color:var(--amber-400);font-size:1.1rem">${best.subject}</div>
            <div class="att-mini-label">Best Subject (${parseFloat(best.percentage).toFixed(1)}%)</div>
          </div>
        `;
      }

      // All grades table
      renderGradesTable(grades);

      // Filter
      document.getElementById('grade-exam-filter').addEventListener('change', (e) => {
        const filtered = e.target.value ? allGradesData.filter(g => g.exam_type === e.target.value) : allGradesData;
        renderGradesTable(filtered);
      });

    } catch (err) { showToast(err.message, 'error'); }
  }

  function renderGradesTable(grades) {
    const tbody = document.getElementById('all-grades-body');
    if (!grades.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px">No records found.</td></tr>`;
      return;
    }
    tbody.innerHTML = grades.map(g => {
      const pct = ((g.marks / g.max_marks) * 100).toFixed(1);
      const gl  = gradeLabel(pct);
      const pctColor = parseFloat(pct) >= 80 ? 'var(--emerald-400)' : parseFloat(pct) >= 60 ? 'var(--amber-400)' : 'var(--rose-400)';
      return `<tr>
        <td><strong>${g.subject}</strong></td>
        <td><span class="badge badge-purple">${g.exam_type}</span></td>
        <td><strong>${g.marks}</strong></td>
        <td style="color:var(--text-muted)">${g.max_marks}</td>
        <td><strong style="color:${pctColor}">${pct}%</strong></td>
        <td><span class="badge ${parseFloat(pct)>=80?'badge-emerald':parseFloat(pct)>=60?'badge-amber':'badge-rose'}">${gl}</span></td>
        <td style="color:var(--text-muted)">${formatDate(g.exam_date)}</td>
      </tr>`;
    }).join('');
  }

  // ─────────────────────────────────────────────────────────────
  //  ATTENDANCE
  // ─────────────────────────────────────────────────────────────
  let allAttData = [];
  async function loadAttendance() {
    try {
      const [att, summary] = await Promise.all([
        Api.getAttendance(user.id),
        Api.getAttendanceSummary(user.id),
      ]);
      allAttData = att;

      // Summary cards
      document.getElementById('att-summary-cards').innerHTML = `
        <div class="att-mini"><div class="att-mini-val" style="color:var(--emerald-400)">${summary.Present || 0}</div><div class="att-mini-label">Present</div></div>
        <div class="att-mini"><div class="att-mini-val" style="color:var(--rose-400)">${summary.Absent || 0}</div><div class="att-mini-label">Absent</div></div>
        <div class="att-mini"><div class="att-mini-val" style="color:var(--amber-400)">${summary.Late || 0}</div><div class="att-mini-label">Late</div></div>
        <div class="att-mini"><div class="att-mini-val" style="color:var(--text-muted)">${summary.total || 0}</div><div class="att-mini-label">Total Days</div></div>
      `;

      // Circle gauge
      const pct = parseFloat(summary.percentage || 0);
      document.getElementById('att-pct-val').textContent = `${pct}%`;
      const circle = document.getElementById('att-circle-fill');
      const circumference = 346;
      circle.style.stroke = pct >= 85 ? 'url(#attGrad)' : pct >= 70 ? '#f59e0b' : '#f43f5e';
      setTimeout(() => {
        circle.style.strokeDashoffset = circumference - (circumference * pct / 100);
      }, 300);

      document.getElementById('att-legend').textContent =
        pct >= 85 ? '🟢 Excellent attendance!' : pct >= 70 ? '🟡 Needs improvement' : '🔴 Poor — attend more classes';

      // History table
      renderAttTable(att);

      document.getElementById('att-status-filter').addEventListener('change', (e) => {
        const filtered = e.target.value ? allAttData.filter(a => a.status === e.target.value) : allAttData;
        renderAttTable(filtered);
      });
    } catch (err) { showToast(err.message, 'error'); }
  }

  function renderAttTable(records) {
    const tbody = document.getElementById('att-history-body');
    if (!records.length) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:24px">No attendance records found.</td></tr>`;
      return;
    }
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    tbody.innerHTML = records.map(a => {
      const d = new Date(a.date);
      const dayName = isNaN(d) ? '' : dayNames[d.getDay()];
      const statusClass = { Present:'badge-emerald', Absent:'badge-rose', Late:'badge-amber', Holiday:'badge-blue' }[a.status] || 'badge-blue';
      return `<tr>
        <td>${formatDate(a.date)}</td>
        <td style="color:var(--text-muted)">${dayName}</td>
        <td><span class="badge ${statusClass}">${a.status}</span></td>
      </tr>`;
    }).join('');
  }

  // ─────────────────────────────────────────────────────────────
  //  ANNOUNCEMENTS
  // ─────────────────────────────────────────────────────────────
  async function loadAnnouncements() {
    try {
      const ann = await Api.getAnnouncements();
      const container = document.getElementById('full-announcements');
      container.innerHTML = ann.map(a => `
        <div class="ann-item">
          <div class="ann-top">
            <span class="ann-title">${a.title}</span>
            <span class="badge ${a.audience==='all'?'badge-blue':a.audience==='students'?'badge-emerald':'badge-amber'}">${a.audience}</span>
          </div>
          <div class="ann-content">${a.content}</div>
          <div class="ann-date">📅 ${formatDate(a.created_at)}</div>
        </div>
      `).join('') || '<div style="color:var(--text-muted);text-align:center;padding:24px">No announcements available.</div>';
    } catch (err) { showToast(err.message, 'error'); }
  }

  // ─────────────────────────────────────────────────────────────
  //  TEACHERS
  // ─────────────────────────────────────────────────────────────
  async function loadTeachers() {
    try {
      const teachers = await Api.getTeachers();
      const grid = document.getElementById('teachers-grid');
      grid.innerHTML = teachers.map(t => `
        <div class="glass-card" style="padding:20px;display:flex;flex-direction:column;gap:12px">
          <div style="display:flex;align-items:center;gap:12px">
            <div class="avatar-placeholder ${avatarColors(t.name)}" style="width:48px;height:48px;font-size:1.1rem">${initials(t.name)}</div>
            <div>
              <div style="font-weight:700;font-size:0.95rem">${t.name}</div>
              <div style="font-size:0.75rem;color:var(--text-muted)">${t.id}</div>
            </div>
          </div>
          <div class="divider" style="margin:0"></div>
          <div style="display:flex;flex-direction:column;gap:6px;font-size:0.8rem">
            <div style="display:flex;gap:8px"><span style="color:var(--text-muted);width:80px">Subject</span><strong>${t.subject || '—'}</strong></div>
            <div style="display:flex;gap:8px"><span style="color:var(--text-muted);width:80px">Dept.</span><span>${t.department || '—'}</span></div>
            <div style="display:flex;gap:8px"><span style="color:var(--text-muted);width:80px">Qual.</span><span>${t.qualification || '—'}</span></div>
            <div style="display:flex;gap:8px"><span style="color:var(--text-muted);width:80px">Exp.</span><span>${t.experience} years</span></div>
            <div style="display:flex;gap:8px"><span style="color:var(--text-muted);width:80px">Email</span><span style="color:var(--blue-300)">${t.email || '—'}</span></div>
          </div>
          <span class="badge badge-emerald" style="align-self:flex-start">${t.status}</span>
        </div>
      `).join('') || '<div style="color:var(--text-muted)">No teachers found.</div>';
    } catch (err) { showToast(err.message, 'error'); }
  }

  // ── Responsive sidebar toggle ─────────────────────────────
  const sidebarToggle = document.getElementById('sidebar-toggle');
  if (window.innerWidth <= 768) { sidebarToggle.style.display = 'flex'; }
  sidebarToggle.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });
  window.addEventListener('resize', () => {
    sidebarToggle.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
  });
});
