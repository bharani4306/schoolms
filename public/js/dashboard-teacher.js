// ─────────────────────────────────────────────────────────────
//  Teacher Dashboard JS
// ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth('teacher')) return;
  const user = getUser();

  // ── Sidebar profile ─────────────────────────────────────────
  document.getElementById('sb-name').textContent = user.name;
  document.getElementById('sb-id').textContent   = user.id;
  document.getElementById('sb-avatar').textContent = initials(user.name);

  // ── Time display ────────────────────────────────────────────
  const timeEl = document.getElementById('topbar-time');
  const updateTime = () => { timeEl.textContent = new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }); };
  updateTime(); setInterval(updateTime, 1000);

  // ── Section navigation ──────────────────────────────────────
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.dash-section');
  const pageTitle = document.getElementById('page-title');

  const sectionTitles = {
    overview: 'Overview', profile: 'My Profile', students: 'My Students',
    grades: 'Manage Marks', attendance: 'Mark Attendance', announcements: 'Announcements'
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
    window.location.href = '/login-teacher.html';
  });

  // ── Global Data ─────────────────────────────────────────────
  let allStudents = [];

  // ── Load sections ───────────────────────────────────────────
  async function loadSection(name) {
    switch(name) {
      case 'overview':     await loadOverview();      break;
      case 'profile':      await loadProfile();       break;
      case 'students':     await loadStudents();      break;
      case 'grades':       await loadGradesSetup();   break;
      case 'attendance':   await loadAttendanceSetup();break;
      case 'announcements': await loadAnnouncements(); break;
    }
  }

  showSection('overview');

  // ─────────────────────────────────────────────────────────────
  //  OVERVIEW
  // ─────────────────────────────────────────────────────────────
  async function loadOverview() {
    try {
      const [students, announcements] = await Promise.all([
        Api.getStudents(),
        Api.getAnnouncements(),
      ]);
      allStudents = students;

      document.getElementById('stat-students').textContent = students.length;
      document.getElementById('stat-grades').textContent = '245'; // Mocked count
      document.getElementById('stat-att-today').textContent = '92%'; // Mocked pct
      document.getElementById('stat-ann').textContent = announcements.filter(a => a.author_id === user.id).length;

      // Animate counts
      const statEls = document.querySelectorAll('.stat-value');
      statEls.forEach(el => {
        if(el.textContent === '—' || el.textContent.includes('%')) return;
        animateCount(el, parseInt(el.textContent), 1400);
      });

      // Ann preview
      const annContainer = document.getElementById('overview-announcements');
      annContainer.innerHTML = announcements.slice(0,3).map(a => `
        <div class="ann-item">
          <div class="ann-top">
            <span class="ann-title">${a.title}</span>
            <span class="badge ${a.audience==='all'?'badge-blue':a.audience==='students'?'badge-emerald':'badge-amber'}">${a.audience}</span>
          </div>
          <div class="ann-date">📅 ${formatDate(a.created_at)}</div>
        </div>
      `).join('') || '<div style="color:var(--text-muted);text-align:center;padding:12px">No announcements.</div>';

      // Roster preview
      const rosterBody = document.getElementById('overview-students-body');
      rosterBody.innerHTML = students.slice(0,5).map(s => `
        <tr>
          <td><span style="color:var(--text-muted)">${s.id}</span></td>
          <td><strong>${s.name}</strong></td>
          <td><span class="badge badge-purple">${s.class}-${s.section}</span></td>
        </tr>
      `).join('');
    } catch(err) { showToast(err.message, 'error'); }
  }

  // ─────────────────────────────────────────────────────────────
  //  PROFILE
  // ─────────────────────────────────────────────────────────────
  async function loadProfile() {
    try {
      const t = await Api.getTeacherMe();
      const av = document.getElementById('profile-avatar');
      av.textContent = initials(t.name);
      document.getElementById('profile-name').textContent = t.name;
      document.getElementById('profile-sub').textContent = `${t.subject} • ${t.department}`;
      document.getElementById('profile-badges').innerHTML = `
        <span class="badge badge-amber">${t.department}</span>
        <span class="badge badge-emerald">${t.status === 'active' ? 'Active' : 'Inactive'}</span>
      `;
      document.getElementById('profile-detail-grid').innerHTML = `
        ${detailItem('Teacher ID', t.id)}
        ${detailItem('Full Name', t.name)}
        ${detailItem('Email', t.email || '—')}
        ${detailItem('Phone', t.phone || '—')}
        ${detailItem('Subject', t.subject)}
        ${detailItem('Qualification', t.qualification || '—')}
        ${detailItem('Experience', `${t.experience} years`)}
        ${detailItem('Joined', formatDate(t.join_date))}
        ${detailItem('Address', t.address || '—')}
      `;
    } catch(err) { showToast(err.message, 'error'); }
  }

  function detailItem(label, value) {
    return `<div class="detail-item"><div class="detail-label">${label}</div><div class="detail-value">${value}</div></div>`;
  }

  // ─────────────────────────────────────────────────────────────
  //  STUDENTS LIST
  // ─────────────────────────────────────────────────────────────
  async function loadStudents() {
    try {
      if(!allStudents.length) allStudents = await Api.getStudents();
      
      // Populate class filter
      const classes = [...new Set(allStudents.map(s => `${s.class}-${s.section}`))].sort();
      const filter = document.getElementById('filter-class');
      filter.innerHTML = '<option value="">All Classes</option>' + classes.map(c => `<option value="${c}">${c}</option>`).join('');

      renderStudentsTable(allStudents);

      document.getElementById('search-student').addEventListener('input', e => filterStudents());
      document.getElementById('filter-class').addEventListener('change', e => filterStudents());

    } catch(err) { showToast(err.message, 'error'); }
  }

  function filterStudents() {
    const term = document.getElementById('search-student').value.toLowerCase();
    const cls = document.getElementById('filter-class').value;
    const filtered = allStudents.filter(s => {
      const matchTerm = s.name.toLowerCase().includes(term) || s.id.toLowerCase().includes(term);
      const matchCls = cls ? `${s.class}-${s.section}` === cls : true;
      return matchTerm && matchCls;
    });
    renderStudentsTable(filtered);
  }

  function renderStudentsTable(list) {
    const tbody = document.getElementById('students-body');
    if(!list.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px">No students found.</td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(s => `
      <tr>
        <td style="color:var(--text-muted)">${s.id}</td>
        <td><strong>${s.name}</strong></td>
        <td><span class="badge badge-purple">${s.class}-${s.section}</span></td>
        <td>${s.roll_no}</td>
        <td style="color:var(--text-muted);font-size:0.8rem">${s.parent_phone || '—'}</td>
        <td style="display:flex;gap:8px">
          <button class="btn btn-secondary btn-sm" onclick="viewStudent('${s.id}')">View</button>
          <button class="btn btn-primary btn-sm" onclick="editStudent('${s.id}')">Edit</button>
        </td>
      </tr>
    `).join('');
  }

  window.viewStudent = async (id) => {
    try {
      const s = await Api.getStudent(id);
      document.getElementById('mod-name').textContent = s.name;
      document.getElementById('mod-sub').textContent = `${s.id} • Class ${s.class}-${s.section}`;
      document.getElementById('mod-avatar').textContent = initials(s.name);
      document.getElementById('mod-details').innerHTML = `
        <div class="sd-row"><div class="sd-label">Email</div><div class="sd-value">${s.email || '—'}</div></div>
        <div class="sd-row"><div class="sd-label">Phone</div><div class="sd-value">${s.phone || '—'}</div></div>
        <div class="sd-row"><div class="sd-label">Roll No</div><div class="sd-value">${s.roll_no}</div></div>
        <div class="sd-row"><div class="sd-label">DOB</div><div class="sd-value">${formatDate(s.dob)}</div></div>
        <div class="sd-row" style="grid-column:span 2"><div class="sd-label">Address</div><div class="sd-value">${s.address || '—'}</div></div>
        <div class="sd-row"><div class="sd-label">Parent Name</div><div class="sd-value">${s.parent_name || '—'}</div></div>
        <div class="sd-row"><div class="sd-label">Parent Phone</div><div class="sd-value">${s.parent_phone || '—'}</div></div>
      `;
      document.getElementById('student-modal').classList.add('active');
    } catch(err) { showToast(err.message, 'error'); }
  };
  document.getElementById('close-student-modal').addEventListener('click', () => {
    document.getElementById('student-modal').classList.remove('active');
  });

  window.editStudent = async (id) => {
    try {
      const s = await Api.getStudent(id);
      document.getElementById('edit-student-id').value = s.id;
      document.getElementById('edit-name').value = s.name || '';
      document.getElementById('edit-email').value = s.email || '';
      document.getElementById('edit-phone').value = s.phone || '';
      document.getElementById('edit-class').value = s.class || '';
      document.getElementById('edit-section').value = s.section || '';
      document.getElementById('edit-roll').value = s.roll_no || '';
      document.getElementById('edit-pname').value = s.parent_name || '';
      document.getElementById('edit-pphone').value = s.parent_phone || '';
      document.getElementById('edit-address').value = s.address || '';
      document.getElementById('edit-student-modal').classList.add('active');
    } catch(err) { showToast(err.message, 'error'); }
  };

  document.getElementById('close-edit-modal').addEventListener('click', () => {
    document.getElementById('edit-student-modal').classList.remove('active');
  });

  document.getElementById('edit-student-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-save-student');
    btn.textContent = 'Saving…'; btn.disabled = true;
    try {
      const id = document.getElementById('edit-student-id').value;
      const data = {
        name: document.getElementById('edit-name').value,
        email: document.getElementById('edit-email').value,
        phone: document.getElementById('edit-phone').value,
        class_name: document.getElementById('edit-class').value,
        section: document.getElementById('edit-section').value,
        roll_no: document.getElementById('edit-roll').value,
        parent_name: document.getElementById('edit-pname').value,
        parent_phone: document.getElementById('edit-pphone').value,
        address: document.getElementById('edit-address').value
      };
      await Api.updateStudent(id, data);
      showToast('Student updated successfully!', 'success');
      document.getElementById('edit-student-modal').classList.remove('active');
      // Refresh list
      allStudents = await Api.getStudents();
      filterStudents();
    } catch(err) { showToast(err.message, 'error'); }
    finally { btn.textContent = 'Save Changes'; btn.disabled = false; }
  });

  // ─────────────────────────────────────────────────────────────
  //  GRADES
  // ─────────────────────────────────────────────────────────────
  async function loadGradesSetup() {
    if(!allStudents.length) allStudents = await Api.getStudents();
    const select = document.getElementById('grade-student-select');
    select.innerHTML = '<option value="">Choose student…</option>' + 
      allStudents.map(s => `<option value="${s.id}">${s.name} (${s.id}) - ${s.class}-${s.section}</option>`).join('');

    // Pre-fill subject if possible
    document.getElementById('grade-subject').value = user.subject || '';
    
    // Set date to today
    document.getElementById('grade-date').value = new Date().toISOString().split('T')[0];

    // Form submit
    document.getElementById('add-grade-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btn-save-grade');
      btn.textContent = 'Saving…'; btn.disabled = true;
      try {
        await Api.addGrade({
          student_id: document.getElementById('grade-student-select').value,
          subject: document.getElementById('grade-subject').value,
          exam_type: document.getElementById('grade-exam-type').value,
          marks: document.getElementById('grade-marks').value,
          max_marks: document.getElementById('grade-max').value,
          exam_date: document.getElementById('grade-date').value
        });
        showToast('Marks saved successfully!', 'success');
        document.getElementById('grade-marks').value = '';
        // Add to recent list manually for UI
        loadRecentGrades();
      } catch(err) { showToast(err.message, 'error'); }
      finally { btn.textContent = 'Save Marks'; btn.disabled = false; }
    });

    loadRecentGrades();
  }

  async function loadRecentGrades() {
    // Note: We don't have a teacher-specific grades endpoint in our simple API,
    // so we'll just fetch all grades and filter in UI (not ideal for prod, but ok here)
    try {
      const grades = await Api.getGrades();
      const myGrades = grades.filter(g => g.teacher_id === user.id).slice(0,10);
      const tbody = document.getElementById('teacher-recent-grades');
      
      if(!myGrades.length) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:var(--text-muted)">No entries yet.</td></tr>`;
        return;
      }
      
      tbody.innerHTML = myGrades.map(g => {
        const sName = allStudents.find(s => s.id === g.student_id)?.name || g.student_id;
        const pct = ((g.marks/g.max_marks)*100).toFixed(1);
        return `<tr>
          <td><div style="font-weight:600;font-size:0.85rem">${sName}</div><div style="font-size:0.7rem;color:var(--text-muted)">${g.exam_type}</div></td>
          <td>${g.subject}</td>
          <td><strong style="color:var(--blue-300)">${pct}%</strong></td>
        </tr>`;
      }).join('');
    } catch(err) {}
  }

  // ─────────────────────────────────────────────────────────────
  //  ATTENDANCE
  // ─────────────────────────────────────────────────────────────
  let rosterData = [];
  async function loadAttendanceSetup() {
    if(!allStudents.length) allStudents = await Api.getStudents();
    const classes = [...new Set(allStudents.map(s => `${s.class}-${s.section}`))].sort();
    const filter = document.getElementById('att-class-select');
    filter.innerHTML = '<option value="">Choose class…</option>' + classes.map(c => `<option value="${c}">${c}</option>`).join('');
    document.getElementById('att-date').value = new Date().toISOString().split('T')[0];

    document.getElementById('btn-load-class-att').addEventListener('click', () => {
      const cls = filter.value;
      if(!cls) { showToast('Select a class first', 'error'); return; }
      
      rosterData = allStudents.filter(s => `${s.class}-${s.section}` === cls);
      // Init everyone as present by default
      rosterData.forEach(s => s._attStatus = 'Present');
      
      renderAttRoster();
      document.getElementById('att-roster-container').style.display = 'block';
    });

    document.getElementById('btn-mark-all-p').addEventListener('click', () => {
      rosterData.forEach(s => s._attStatus = 'Present');
      renderAttRoster();
    });

    document.getElementById('btn-submit-att').addEventListener('click', async () => {
      const date = document.getElementById('att-date').value;
      if(!date) { showToast('Select a date', 'error'); return; }
      
      const records = rosterData.map(s => ({
        student_id: s.id, date, status: s._attStatus
      }));

      const btn = document.getElementById('btn-submit-att');
      btn.textContent = 'Submitting…'; btn.disabled = true;
      try {
        await Api.markAttendance(records);
        showToast(`Attendance marked for ${records.length} students!`, 'success');
        document.getElementById('att-roster-container').style.display = 'none';
        filter.value = '';
      } catch(err) { showToast(err.message, 'error'); }
      finally { btn.textContent = 'Submit Attendance'; btn.disabled = false; }
    });
  }

  function renderAttRoster() {
    const list = document.getElementById('att-roster-list');
    list.innerHTML = rosterData.map(s => `
      <div class="att-student-row">
        <div>
          <div class="att-student-name">${s.name}</div>
          <div class="att-student-class">${s.id}</div>
        </div>
        <div class="att-status-btns">
          <button class="att-status-btn ${s._attStatus==='Present'?'selected-present':''}" onclick="setAtt('${s.id}','Present')">P</button>
          <button class="att-status-btn ${s._attStatus==='Absent'?'selected-absent':''}" onclick="setAtt('${s.id}','Absent')">A</button>
          <button class="att-status-btn ${s._attStatus==='Late'?'selected-late':''}" onclick="setAtt('${s.id}','Late')">L</button>
        </div>
      </div>
    `).join('');
  }

  window.setAtt = (id, status) => {
    const s = rosterData.find(x => x.id === id);
    if(s) { s._attStatus = status; renderAttRoster(); }
  };

  // ─────────────────────────────────────────────────────────────
  //  ANNOUNCEMENTS
  // ─────────────────────────────────────────────────────────────
  async function loadAnnouncements() {
    try {
      // Setup form
      document.getElementById('add-ann-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-save-ann');
        btn.textContent = 'Posting…'; btn.disabled = true;
        try {
          await Api.postAnnouncement({
            title: document.getElementById('ann-title').value,
            audience: document.getElementById('ann-audience').value,
            content: document.getElementById('ann-content').value,
          });
          showToast('Announcement posted!', 'success');
          document.getElementById('ann-title').value = '';
          document.getElementById('ann-content').value = '';
          loadAnnouncementsList();
        } catch(err) { showToast(err.message, 'error'); }
        finally { btn.textContent = 'Post Notice'; btn.disabled = false; }
      });

      loadAnnouncementsList();
    } catch(err) {}
  }

  async function loadAnnouncementsList() {
    try {
      const ann = await Api.getAnnouncements();
      const myAnn = ann.filter(a => a.author_id === user.id);
      const container = document.getElementById('teacher-ann-list');
      container.innerHTML = myAnn.map(a => `
        <div class="ann-item">
          <div class="ann-top">
            <span class="ann-title">${a.title}</span>
            <span class="badge ${a.audience==='all'?'badge-blue':a.audience==='students'?'badge-emerald':'badge-amber'}">${a.audience}</span>
          </div>
          <div class="ann-content">${a.content}</div>
          <div class="ann-date">📅 ${formatDate(a.created_at)}</div>
        </div>
      `).join('') || '<div style="color:var(--text-muted);text-align:center;padding:12px">No announcements posted yet.</div>';
    } catch(err) {}
  }

  // ── Responsive sidebar toggle ─────────────────────────────
  const sidebarToggle = document.getElementById('sidebar-toggle');
  if (window.innerWidth <= 768) { sidebarToggle.style.display = 'flex'; }
  sidebarToggle.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });
});
