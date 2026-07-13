/* ================================================================
   NAGARIK AAWAZ — scriptlogin.js
================================================================ */

const API = 'http://localhost:5000/api';

// Stores email across forgot-password steps
let forgotEmail = '';
let resetTimerInterval;

/* ── Language ── */
function setLang(lang) {
  document.body.classList.toggle('lang-mode-en', lang === 'en');
  document.getElementById('btn-ne').classList.toggle('active', lang === 'ne');
  document.getElementById('btn-en').classList.toggle('active', lang === 'en');
  localStorage.setItem('nagarikAawazLang', lang);
}

function toNepaliDigits(n) {
  const map = {'0':'०','1':'१','2':'२','3':'३','4':'४','5':'५','6':'६','7':'७','8':'८','9':'९'};
  return String(n).split('').map(d => map[d] ?? d).join('');
}

/* ── Step navigation ── */
function goToStep(stepId) {
  document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
  document.getElementById(stepId)?.classList.add('active');
  ['loginAlert', 'forgotAlert'].forEach(id => document.getElementById(id)?.classList.remove('show'));
  if (stepId === 'stepForgot2') startResetOtpTimer();
  document.querySelector('.auth-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── Password toggle ── */
const EYE_OPEN = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_OFF  = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  const show = input.type === 'text';
  input.type = show ? 'password' : 'text';
  btn.innerHTML = show ? EYE_OPEN : EYE_OFF;
}

/* ── Validation helpers ── */
function markError(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('error');
  el.closest('.form-group')?.classList.add('has-error');
}

function clearErrors() {
  document.querySelectorAll('.form-group.has-error').forEach(g => g.classList.remove('has-error'));
  document.querySelectorAll('input.error').forEach(el => el.classList.remove('error'));
}

/* ── OTP box auto-advance ── */
function initOtpBoxes() {
  document.querySelectorAll('.otp-box, .reset-otp-box').forEach((box, i, all) => {
    const group = all;
    box.addEventListener('input', () => {
      box.value = box.value.replace(/\D/g, '').slice(-1);
      if (box.value && i < group.length - 1) group[i + 1].focus();
    });
    box.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !box.value && i > 0) group[i - 1].focus();
    });
    box.addEventListener('paste', e => {
      e.preventDefault();
      const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
      digits.split('').forEach((d, j) => { if (group[j]) group[j].value = d; });
      group[Math.min(digits.length, group.length - 1)].focus();
    });
  });
}

/* ── Reset OTP timer ── */
function startResetOtpTimer() {
  let secs = 30;
  const btn  = document.getElementById('resendResetBtn');
  if (btn) btn.classList.add('disabled');
  clearInterval(resetTimerInterval);
  resetTimerInterval = setInterval(() => {
    secs--;
    const neEl = document.getElementById('resetTimerNe');
    const enEl = document.getElementById('resetTimerEn');
    if (neEl) neEl.textContent = `(${toNepaliDigits(secs)})`;
    if (enEl) enEl.textContent = `(${secs})`;
    if (secs <= 0) {
      clearInterval(resetTimerInterval);
      if (btn)  btn.classList.remove('disabled');
      if (neEl) neEl.textContent = '';
      if (enEl) enEl.textContent = '';
    }
  }, 1000);
}

async function resendResetOtp() {
  const btn = document.getElementById('resendResetBtn');
  if (btn?.classList.contains('disabled')) return;
  try {
    await fetch(`${API}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: forgotEmail }),
    });
    startResetOtpTimer();
  } catch {}
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  /* Language */
  const savedLang = localStorage.getItem('nagarikAawazLang');
  if (savedLang === 'en') setLang('en');

  /* Restore remembered email */
  const remembered = localStorage.getItem('nagarikAawazRememberedEmail');
  if (remembered) {
    const emailEl = document.getElementById('email');
    if (emailEl) emailEl.value = remembered;
    const rememberEl = document.getElementById('rememberMe');
    if (rememberEl) rememberEl.checked = true;
  }

  initOtpBoxes();

  /* ─────────────────────────────────────────
     LOGIN FORM
  ───────────────────────────────────────── */
  document.getElementById('loginForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    clearErrors();
    document.getElementById('loginAlert')?.classList.remove('show');

    const email    = document.getElementById('email')?.value.trim();
    const password = document.getElementById('password')?.value;
    let valid = true;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { markError('email');    valid = false; }
    if (!password)                                   { markError('password'); valid = false; }
    if (!valid) return;

    if (document.getElementById('rememberMe')?.checked) {
      localStorage.setItem('nagarikAawazRememberedEmail', email);
    } else {
      localStorage.removeItem('nagarikAawazRememberedEmail');
    }

    const btn      = document.getElementById('loginBtn');
    const origHTML = btn?.innerHTML;
    if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spinner"></span>`; }

    try {
      const res  = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Backend determines role — no need to send it
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok) {
        // Persist everything needed across pages
        localStorage.setItem('nagarikAawazToken',    data.token);
        localStorage.setItem('nagarikAawazRole',     data.role);
        localStorage.setItem('nagarikAawazWard',     String(data.ward));
        localStorage.setItem('nagarikAawazName',     data.fullName);

        // Redirect based on role returned by backend
        const routes = {
          citizen:       'dashboard-citizen.html',
          ward_official: 'dashboard-ward.html',
          metro_admin:   'dashboard-metro.html',
        };
        window.location.href = routes[data.role] || 'index.html';
      } else {
        const alertEl = document.getElementById('loginAlert');
        if (alertEl) {
          // Try to update both lang spans if they exist
          const neSpan = alertEl.querySelector('[data-lang="ne"]');
          const enSpan = alertEl.querySelector('[data-lang="en"]');
          if (neSpan) neSpan.textContent = data.message || 'इमेल वा पासवर्ड मिलेन।';
          if (enSpan) enSpan.textContent = data.message || 'Incorrect email or password.';
          alertEl.classList.add('show');
        }
      }
    } catch {
      document.getElementById('loginAlert')?.classList.add('show');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = origHTML; }
    }
  });

  /* ─────────────────────────────────────────
     FORGOT PASSWORD — STEP 1: send OTP
  ───────────────────────────────────────── */
  document.getElementById('forgotEmailForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    clearErrors();
    document.getElementById('forgotAlert')?.classList.remove('show');

    const email = document.getElementById('resetEmail')?.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { markError('resetEmail'); return; }

    try {
      const res  = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        forgotEmail = email;
        // Show the email in OTP step
        ['resetOtpEmailNe', 'resetOtpEmailEn'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.textContent = email;
        });
        goToStep('stepForgot2');
      } else {
        document.getElementById('forgotAlert')?.classList.add('show');
      }
    } catch {
      document.getElementById('forgotAlert')?.classList.add('show');
    }
  });

  /* ─────────────────────────────────────────
     FORGOT PASSWORD — STEP 2: verify OTP
  ───────────────────────────────────────── */
  document.getElementById('resetOtpForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const boxes = document.querySelectorAll('.reset-otp-box');
    const otp   = Array.from(boxes).map(b => b.value).join('');
    const errEl = document.getElementById('resetOtpError');
    if (errEl) errEl.style.display = 'none';

    if (otp.length !== 6) {
      if (errEl) errEl.style.display = 'flex';
      return;
    }

    try {
      const res  = await fetch(`${API}/auth/verify-reset-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, otp }),
      });
      if (res.ok) {
        // Keep OTP in sessionStorage so step 3 can send it with the new password
        sessionStorage.setItem('nagarikAawazResetOtp', otp);
        goToStep('stepForgot3');
      } else {
        if (errEl) errEl.style.display = 'flex';
      }
    } catch {
      if (errEl) errEl.style.display = 'flex';
    }
  });

  /* ─────────────────────────────────────────
     FORGOT PASSWORD — STEP 3: new password
  ───────────────────────────────────────── */
  document.getElementById('newPasswordForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    clearErrors();

    const newPassword        = document.getElementById('newPassword')?.value;
    const confirmNewPassword = document.getElementById('confirmNewPassword')?.value;
    let valid = true;
    if (!newPassword || newPassword.length < 8) { markError('newPassword');        valid = false; }
    if (newPassword !== confirmNewPassword)      { markError('confirmNewPassword'); valid = false; }
    if (!valid) return;

    const otp = sessionStorage.getItem('nagarikAawazResetOtp') || '';

    try {
      const res  = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, otp, newPassword, confirmNewPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        sessionStorage.removeItem('nagarikAawazResetOtp');
        goToStep('stepForgotSuccess');
      } else {
        alert(data.message || 'Password reset failed.');
      }
    } catch {
      alert('Network error. Please try again.');
    }
  });
});