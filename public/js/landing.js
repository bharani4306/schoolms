// Landing page JS — animations, scroll effects, counter
document.addEventListener('DOMContentLoaded', () => {

  // Scroll navbar
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  });

  // Animate count-up stats
  const observerCb = (entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.querySelectorAll('[data-count]').forEach(el => {
          animateCount(el, parseInt(el.dataset.count), 1400);
        });
        obs.unobserve(entry.target);
      }
    });
  };
  const observer = new IntersectionObserver(observerCb, { threshold: 0.3 });
  document.querySelectorAll('.hero-stats').forEach(el => observer.observe(el));

  // Smooth scroll nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href');
      if (href.startsWith('#')) {
        e.preventDefault();
        document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Check if already logged in
  const token = localStorage.getItem('school_ms_token');
  const role  = localStorage.getItem('school_ms_role');
  if (token && role) {
    const target = role === 'teacher' ? 'dashboard-teacher.html' : 'dashboard-student.html';
    const banner = document.createElement('div');
    banner.style.cssText = `position:fixed;top:80px;right:24px;z-index:200;padding:12px 20px;
      background:rgba(37,99,235,0.15);border:1px solid rgba(37,99,235,0.4);border-radius:12px;
      font-size:0.82rem;color:#93c5fd;backdrop-filter:blur(12px);cursor:pointer;`;
    banner.innerHTML = `↩ Return to your dashboard`;
    banner.onclick = () => window.location.href = target;
    document.body.appendChild(banner);
  }

  // Intersection observer for fade-in
  const fadeObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.style.opacity = '1'; e.target.style.transform = 'translateY(0)'; }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.animate-fadeInUp').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    el.style.animationDelay = el.style.animationDelay || '0s';
    fadeObs.observe(el);
  });

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
});
