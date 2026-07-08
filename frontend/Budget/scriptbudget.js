/* =====================================================
   NAGARIK AAWAZ — BUDGET PAGE SCRIPT
===================================================== */

function setLang(lang) {
  document.body.classList.toggle('lang-mode-en', lang === 'en');
  document.getElementById('btn-ne').classList.toggle('active', lang === 'ne');
  document.getElementById('btn-en').classList.toggle('active', lang === 'en');
  localStorage.setItem('nagarikAawazLang', lang);
}

function toNepaliDigits(num) {
  const map = {'0':'०','1':'१','2':'२','3':'३','4':'४','5':'५','6':'६','7':'७','8':'८','9':'९'};
  return String(num).split('').map(d => map[d] || d).join('');
}

function toggleVote(btn) {
  const voted = btn.classList.toggle('voted');
  const span = btn.querySelector('[data-vote]');
  let count = parseInt(span.textContent, 10);
  span.textContent = voted ? count + 1 : count - 1;
}

document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('nagarikAawazLang');
  if (saved === 'en') setLang('en');

  // populate ward dropdown 1-33
  const wardSelect = document.getElementById('wardFilter');
  for (let i = 1; i <= 33; i++) {
    const optNe = document.createElement('option');
    optNe.setAttribute('data-lang', 'ne');
    optNe.textContent = 'वडा नं. ' + toNepaliDigits(i);
    wardSelect.appendChild(optNe);

    const optEn = document.createElement('option');
    optEn.setAttribute('data-lang', 'en');
    optEn.textContent = 'Ward ' + i;
    wardSelect.appendChild(optEn);
  }
});