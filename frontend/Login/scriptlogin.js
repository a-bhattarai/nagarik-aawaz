/* =====================================================
   NAGARIK AAWAZ — LOGIN PAGE SCRIPT
===================================================== */
/* ================================================================
   NAGARIK AAWAZ — login.js
   1.  Language toggle
   2.  Mobile nav (hamburger)
   3.  Step navigation
   4.  Password visibility toggle
   5.  OTP auto-advance, backspace, paste
   6.  Login form — validation + role-based redirect
   7.  Forgot password step 1 — send OTP
   8.  Forgot password step 2 — verify OTP
   9.  Forgot password step 3 — set new password
   10. OTP resend timer
   11. DOMContentLoaded init
================================================================ */

/* ── 1. Language toggle ── */
function setLang(lang) {
  document.body.classList.toggle('lang-mode-en', lang === 'en');
  document.getElementById('btn-ne').classList.toggle('active', lang === 'ne');
  document.getElementById('btn-en').classList.toggle('active', lang === 'en');
  localStorage.setItem('nagarikAawazLang', lang);
}

/* ── 2. Mobile nav ── */
function initMobileNav() {
  const toggle   = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');
  const iconOpen = document.getElementById('iconHamburger');
  const iconX    = document.getElementById('iconClose');

  toggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    iconOpen.style.display = isOpen ? 'none'  : 'block';
    iconX.style.display    = isOpen ? 'block' : 'none';
  });

  document.addEventListener('click', (e) => {
    if (!toggle.contains(e.target) && !navLinks.contains(e.target)) {
      navLinks.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      iconOpen.style.display = 'block';
      iconX.style.display    = 'none';
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      navLinks.classList.remove('open');
      iconOpen.style.display = 'block';
      iconX.style.display    = 'none';
    }
  });
}

/* ── 3. Step navigation ── */
function goToStep(stepId) {
  document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
  document.getElementById(stepId).classList.add('active');

  // Clear alert banners
  ['loginAlert', 'forgotAlert'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('show');
  });

  // Reset OTP error
  const otpErr = document.getElementById('resetOtpError');
  if (otpErr) otpErr.style.display = 'none';

  // Start countdown when entering OTP step
  if (stepId === 'stepForgot2') startResetOtpTimer();

  // Scroll card into view on small screens
  document.querySelector('.auth-card').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ── 4. Password visibility toggle ── */
const SVG_EYE_OPEN = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const SVG_EYE_OFF  = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

function togglePassword(inputId, btn) {
  const input   = document.getElementById(inputId);
  const showing = input.type === 'text';
  input.type    = showing ? 'password' : 'text';
  btn.innerHTML = showing ? SVG_EYE_OPEN : SVG_EYE_OFF;
  btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
}

/* ── 5. OTP boxes — auto-advance, backspace, paste ── */
function initOtpBoxes() {
  const boxes = document.querySelectorAll('.otp-box');
  boxes.forEach((box, idx) => {

    box.addEventListener('input', () => {
      box.value = box.value.replace(/\D/g, '').slice(-1);
      if (box.value && idx < boxes.length - 1) boxes[idx + 1].focus();
    });

    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && idx > 0) boxes[idx - 1].focus();
    });

    box.addEventListener('paste', (e) => {
      e.preventDefault();
      const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
      digits.split('').forEach((d, i) => { if (boxes[i]) boxes[i].value = d; });
      boxes[Math.min(digits.length, boxes.length - 1)].focus();
    });
  });
}

/* ── 6. Login form — validation + role-based redirect ── */
document.getElementById('loginForm').addEventListener('submit', function (e) {
  e.preventDefault();
  clearAllErrors();
  document.getElementById('loginAlert').classList.remove('show');

  const role     = document.getElementById('role').value.trim();
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  let valid = true;

  if (!role)                                        { markError('role',     'roleError');     valid = false; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))   { markError('email',    'emailError');    valid = false; }
  if (!password)                                    { markError('password', 'passwordError'); valid = false; }

  if (!valid) return;

  // Persist remembered email
  if (document.getElementById('rememberMe').checked) {
    localStorage.setItem('nagarikAawazRememberedEmail', email);
  } else {
    localStorage.removeItem('nagarikAawazRememberedEmail');
  }

  // Loading state
  const btn      = document.getElementById('loginBtn');
  const origHTML = btn.innerHTML;
  btn.disabled   = true;
  btn.innerHTML  = `<span class="spinner"></span><span>Loading…</span>`;

  /* ── Backend hook ─────────────────────────────────────────────
     Replace the setTimeout below with a real fetch when ready:

     fetch('/api/auth/login', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ role, email, password })
     })
     .then(res => res.json())
     .then(data => {
       if (data.token) {
         localStorage.setItem('nagarikAawazToken', data.token);
         redirectByRole(data.role);
       } else {
         document.getElementById('loginAlert').classList.add('show');
       }
     })
     .catch(() => document.getElementById('loginAlert').classList.add('show'))
     .finally(() => { btn.disabled = false; btn.innerHTML = origHTML; });
  ─────────────────────────────────────────────────────────────── */

  // Demo — simulate 900ms delay then redirect by selected role
  setTimeout(() => {
    btn.disabled  = false;
    btn.innerHTML = origHTML;
    redirectByRole(role);
  }, 900);
});

function redirectByRole(role) {
  const routes = {
    citizen: 'dashboard-citizen.html',
    ward:    'dashboard-ward.html',
    metro:   'dashboard-metro.html',
  };
  if (routes[role]) {
    window.location.href = routes[role];
  } else {
    document.getElementById('loginAlert').classList.add('show');
  }
}

/* ── 7. Forgot step 1 — send OTP ── */
document.getElementById('forgotEmailForm').addEventListener('submit', function (e) {
  e.preventDefault();
  const emailEl = document.getElementById('resetEmail');
  const grp     = emailEl.closest('.form-group');
  emailEl.classList.remove('error');
  grp.classList.remove('has-error');
  document.getElementById('forgotAlert').classList.remove('show');

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value.trim())) {
    emailEl.classList.add('error');
    grp.classList.add('has-error');
    return;
  }

  // Backend hook: fetch('/api/auth/forgot-password', { method:'POST', body: JSON.stringify({ email: emailEl.value.trim() }) })

  const email = emailEl.value.trim();
  document.getElementById('resetOtpEmailNe').textContent = email;
  document.getElementById('resetOtpEmailEn').textContent = email;
  goToStep('stepForgot2');
});

/* ── 8. Forgot step 2 — verify OTP ── */
document.getElementById('resetOtpForm').addEventListener('submit', function (e) {
  e.preventDefault();
  const otp   = Array.from(document.querySelectorAll('.otp-box')).map(b => b.value).join('');
  const errEl = document.getElementById('resetOtpError');
  errEl.style.display = 'none';

  if (otp.length !== 6) {
    errEl.style.display = 'flex';
    return;
  }

  // Backend hook: fetch('/api/auth/verify-reset-otp', { method:'POST', body: JSON.stringify({ otp }) })

  goToStep('stepForgot3');
});

/* ── 9. Forgot step 3 — set new password ── */
document.getElementById('newPasswordForm').addEventListener('submit', function (e) {
  e.preventDefault();
  ['newPassword', 'confirmNewPassword'].forEach(id => {
    document.getElementById(id).classList.remove('error');
    document.getElementById(id).closest('.form-group').classList.remove('has-error');
  });

  const newPw  = document.getElementById('newPassword').value;
  const confPw = document.getElementById('confirmNewPassword').value;
  let valid = true;

  if (newPw.length < 8)   { markError('newPassword');         valid = false; }
  if (newPw !== confPw)   { markError('confirmNewPassword');  valid = false; }

  if (!valid) return;

  // Backend hook: fetch('/api/auth/reset-password', { method:'POST', body: JSON.stringify({ password: newPw }) })

  goToStep('stepForgotSuccess');
});

/* ── 10. OTP resend timer ── */
let resetTimerInterval;

function startResetOtpTimer() {
  let secs = 30;
  const btn = document.getElementById('resendResetBtn');
  btn.classList.add('disabled');
  updateTimerDisplay(secs);

  clearInterval(resetTimerInterval);
  resetTimerInterval = setInterval(() => {
    secs--;
    updateTimerDisplay(secs);
    if (secs <= 0) {
      clearInterval(resetTimerInterval);
      btn.classList.remove('disabled');
      document.getElementById('resetTimerNe').textContent = '';
      document.getElementById('resetTimerEn').textContent = '';
    }
  }, 1000);
}

function updateTimerDisplay(s) {
  document.getElementById('resetTimerNe').textContent = `(${toNepaliDigits(s)})`;
  document.getElementById('resetTimerEn').textContent = `(${s})`;
}

function resendResetOtp() {
  if (document.getElementById('resendResetBtn').classList.contains('disabled')) return;
  // Backend hook: fetch('/api/auth/resend-reset-otp', { method: 'POST' })
  startResetOtpTimer();
}

function toNepaliDigits(n) {
  const map = {'0':'०','1':'१','2':'२','3':'३','4':'४','5':'५','6':'६','7':'७','8':'८','9':'९'};
  return String(n).split('').map(d => map[d] ?? d).join('');
}

/* ── Shared helpers ── */
function markError(inputId, errorId) {
  const el  = document.getElementById(inputId);
  const grp = el.closest('.form-group');
  el.classList.add('error');
  grp.classList.add('has-error');
}

function clearAllErrors() {
  document.querySelectorAll('.form-group').forEach(g => {
    g.classList.remove('has-error');
    g.querySelectorAll('input, select').forEach(el => el.classList.remove('error'));
  });
}

/* ── 11. Init ── */
document.addEventListener('DOMContentLoaded', () => {
  // Restore saved language preference
  const savedLang = localStorage.getItem('nagarikAawazLang');
  if (savedLang === 'en') setLang('en');

  // Mobile nav
  initMobileNav();

  // OTP keyboard behaviour
  initOtpBoxes();

  // Pre-fill remembered email
  const remembered = localStorage.getItem('nagarikAawazRememberedEmail');
  if (remembered) {
    document.getElementById('email').value = remembered;
    document.getElementById('rememberMe').checked = true;
  }
});