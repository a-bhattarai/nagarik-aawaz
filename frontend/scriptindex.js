/* =====================================================
   NAGARIK AAWAZ — HOME PAGE SCRIPT
===================================================== */

/* ── Language toggle ── */
function setLang(lang) {
  document.body.classList.toggle('lang-mode-en', lang === 'en');
  document.getElementById('btn-ne').classList.toggle('active', lang === 'ne');
  document.getElementById('btn-en').classList.toggle('active', lang === 'en');
  localStorage.setItem('nagarikAawazLang', lang);
}

/* ── Mobile nav toggle ── */
function initMobileNav() {
  const toggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');
  if (!toggle || !navLinks) return;

  toggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  document.addEventListener('click', (e) => {
    if (!toggle.contains(e.target) && !navLinks.contains(e.target)) {
      navLinks.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      navLinks.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  const savedLang = localStorage.getItem('nagarikAawazLang');
  if (savedLang === 'en') setLang('en');
  initMobileNav();
});
