/* ================================================================
   NAGARIK AAWAZ — scriptregister.js
================================================================ */

const API = 'http://localhost:5000/api';

let registrationEmail = '';
let otpTimerInterval;

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
  document.querySelectorAll('input.error, select.error').forEach(el => el.classList.remove('error'));
}

function showBanner(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  const span = el.querySelector('span:not([data-lang])') || el;
  span.textContent = msg;
  el.classList.add('show');
}

function hideBanner(id) {
  document.getElementById(id)?.classList.remove('show');
}

function setBtnLoading(id, loading) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    btn.dataset.orig = btn.innerHTML;
    btn.innerHTML = `<span class="spinner"></span>`;
  } else {
    btn.innerHTML = btn.dataset.orig || '';
  }
}

/* ── OTP box auto-advance ── */
function initOtpBoxes() {
  const boxes = document.querySelectorAll('.otp-box');
  boxes.forEach((box, i) => {
    box.addEventListener('input', () => {
      box.value = box.value.replace(/\D/g, '').slice(-1);
      if (box.value && i < boxes.length - 1) boxes[i + 1].focus();
    });
    box.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !box.value && i > 0) boxes[i - 1].focus();
    });
    box.addEventListener('paste', e => {
      e.preventDefault();
      const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
      digits.split('').forEach((d, j) => { if (boxes[j]) boxes[j].value = d; });
      boxes[Math.min(digits.length, boxes.length - 1)].focus();
    });
  });
}

/* ── OTP countdown timer ── */
function startOtpTimer() {
  let secs = 30;
  const resendBtn = document.getElementById('resendOtpBtn');
    const timerNe = document.getElementById('timerNe');
    const timerEn = document.getElementById('timerEn');
  if (resendBtn) resendBtn.classList.add('disabled');
  clearInterval(otpTimerInterval);
  otpTimerInterval = setInterval(() => {
    secs--;
    if (timerNe) {
    timerNe.textContent = `(${toNepaliDigits(secs)})`;
}

if (timerEn) {
    timerEn.textContent = `(${secs})`;
}
    if (secs <= 0) {
      clearInterval(otpTimerInterval);
      if (resendBtn) resendBtn.classList.remove('disabled');
      if (timerNe) timerNe.textContent = '';
      if (timerEn) timerEn.textContent = '';
    }
  }, 1000);
}

/* ── Step 1: Register form ── */
async function handleRegisterSubmit(e) {
  e.preventDefault();
  clearErrors();
  hideBanner('registerAlert');

  const fullName        = document.getElementById('fullName')?.value.trim();
  const email           = document.getElementById('regEmail')?.value.trim();
  const phone           = document.getElementById('phone')?.value.trim();
  const ward            = document.getElementById('wardSelect')?.value;
  const password        = document.getElementById('password')?.value;
  const confirmPassword = document.getElementById('confirmPassword')?.value;

  let valid = true;
  if (!fullName)                                       { markError('fullName');        valid = false; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))      { markError('regEmail');        valid = false; }
  if (!phone)                                          { markError('phone');            valid = false; }
  if (!ward)                                           { markError('wardSelect');       valid = false; }
  if (!password || password.length < 8)               { markError('password');         valid = false; }
  if (password !== confirmPassword)                    { markError('confirmPassword');  valid = false; }
  if (!valid) return;

  setBtnLoading('registerBtn', true);

  try {
    const res  = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName, email, phone,
        ward: Number(ward),
        password, confirmPassword
      }),
    });
    const data = await res.json();

    if (res.ok) {
      registrationEmail = email;
      // Display email in OTP step
      document.querySelectorAll('.otp-email-target').forEach(el => { el.textContent = email; });
      goToStep('stepOtp');
      startOtpTimer();
    } else {
      showBanner('registerAlert', data.message || 'Registration failed. Please try again.');
    }
  } catch {
    showBanner('registerAlert', 'Network error. Please check your connection.');
  } finally {
    setBtnLoading('registerBtn', false);
  }
}

/* ── Step 2: Verify OTP ── */
async function handleOtpSubmit(e) {
  e.preventDefault();
  hideBanner('otpAlert');

  const boxes = document.querySelectorAll('.otp-box');
  const otp   = Array.from(boxes).map(b => b.value).join('');

  if (otp.length !== 6) {
    showBanner('otpAlert', document.body.classList.contains('lang-mode-en')
      ? 'Please enter all 6 digits.'
      : 'कृपया ६ अंकको OTP लेख्नुहोस्।');
    return;
  }

  setBtnLoading('verifyOtpBtn', true);

  try {
    const res  = await fetch(`${API}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: registrationEmail, otp }),
    });
    const data = await res.json();

    if (res.ok) {
      clearInterval(otpTimerInterval);
      goToStep('stepSuccess');
    } else {
      showBanner('otpAlert', data.message || 'Incorrect OTP. Please try again.');
    }
  } catch {
    showBanner('otpAlert', 'Network error. Please check your connection.');
  } finally {
    setBtnLoading('verifyOtpBtn', false);
  }
}

/* ── Resend OTP ── */
async function resendOtp() {
  const btn = document.getElementById('resendOtpBtn');
  if (btn?.classList.contains('disabled')) return;
  hideBanner('otpAlert');
  try {
    const res  = await fetch(`${API}/auth/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: registrationEmail }),
    });
    const data = await res.json();
    if (res.ok) startOtpTimer();
    else showBanner('otpAlert', data.message || 'Failed to resend OTP.');
  } catch {
    showBanner('otpAlert', 'Network error.');
  }
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  const savedLang = localStorage.getItem('nagarikAawazLang');
  if (savedLang === 'en') setLang('en');

  // Ward dropdown 1–33
  const wardSelect = document.getElementById('wardSelect');
  if (wardSelect) {
    for (let i = 1; i <= 33; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `वडा ${toNepaliDigits(i)} / Ward ${i}`;
      wardSelect.appendChild(opt);
    }
  }

  initOtpBoxes();

  document.getElementById('registerForm')?.addEventListener('submit', handleRegisterSubmit);
  document.getElementById('otpForm')?.addEventListener('submit', handleOtpSubmit);
});