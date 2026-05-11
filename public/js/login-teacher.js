// Login page JS — teacher
document.addEventListener('DOMContentLoaded', () => {
  if (getToken() && getRole() === 'teacher') {
    window.location.href = '/dashboard-teacher.html';
    return;
  }

  const form      = document.getElementById('login-form');
  const errorMsg  = document.getElementById('error-msg');
  const submitBtn = document.getElementById('submit-btn');
  const btnText   = document.getElementById('btn-text');
  const spinner   = document.getElementById('btn-spinner');
  const togglePw  = document.getElementById('toggle-pw');
  const pwInput   = document.getElementById('teacher-password');
  const idInput   = document.getElementById('teacher-id');

  togglePw.addEventListener('click', () => {
    const isPass = pwInput.type === 'password';
    pwInput.type = isPass ? 'text' : 'password';
    document.getElementById('eye-icon').innerHTML = isPass
      ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`
      : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
  });

  document.getElementById('demo-id').addEventListener('click', () => {
    idInput.value = 'TCH001'; pwInput.value = 'teacher123'; errorMsg.classList.remove('visible');
  });
  document.getElementById('demo-id2').addEventListener('click', () => {
    idInput.value = 'TCH002'; pwInput.value = 'teacher123'; errorMsg.classList.remove('visible');
  });
  document.getElementById('demo-pw').addEventListener('click', () => {
    pwInput.value = 'teacher123';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = idInput.value.trim();
    const password = pwInput.value;
    if (!id || !password) { errorMsg.textContent = '⚠️ Please enter both ID and password.'; errorMsg.classList.add('visible'); return; }

    btnText.textContent = 'Signing in…';
    spinner.classList.remove('hidden');
    submitBtn.disabled = true;
    errorMsg.classList.remove('visible');

    try {
      const data = await Api.loginTeacher(id, password);
      saveSession(data);
      showToast(`Welcome, ${data.user.name}! 🏫`, 'success');
      setTimeout(() => { window.location.href = '/dashboard-teacher.html'; }, 800);
    } catch (err) {
      errorMsg.textContent = `⚠️ ${err.message}`;
      errorMsg.classList.add('visible');
      btnText.textContent = 'Sign In to Teacher Portal';
      spinner.classList.add('hidden');
      submitBtn.disabled = false;
    }
  });
});
