/* ================================================================
   NAGARIK AAWAZ — scriptindex.js
   Sections:
     1.  Language toggle
     2.  Init
================================================================ */

/* ── 1. Language toggle ── */
function setLang(lang) {
  document.body.classList.toggle('lang-mode-en', lang === 'en');
  document.getElementById('btn-ne').classList.toggle('active', lang === 'ne');
  document.getElementById('btn-en').classList.toggle('active', lang === 'en');
  localStorage.setItem('nagarikAawazLang', lang);
}

/* ── 2. Init ── */
document.addEventListener('DOMContentLoaded', function() {
  var savedLang = localStorage.getItem('nagarikAawazLang');
  if (savedLang === 'en') setLang('en');
});