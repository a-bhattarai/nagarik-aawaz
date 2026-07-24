/* ================================================================
   NAGARIK AAWAZ — scriptlogin.js
   Sections:
     1.  Config & Helpers
     2.  Language toggle
     3.  Step navigation
     4.  Password toggle
     5.  OTP box auto-advance
     6.  Reset OTP timer
     7.  Login form handler
     8.  Forgot password handlers
     9.  Init
================================================================ */

/* ── 1. Config & Helpers ── */
const API = 'http://localhost:5000/api';
let forgotEmail = '';
let resetTimerInterval;

function toNepaliDigits(n) {
  var map = { '0': '०', '1': '१', '2': '२', '3': '३', '4': '४', '5': '५', '6': '६', '7': '७', '8': '८', '9': '९' };
  return String(n).split('').map(function(d) { return map[d] || d; }).join('');
}

/* ── 2. Language toggle ── */
function setLang(lang) {
  document.body.classList.toggle('lang-mode-en', lang === 'en');
  document.getElementById('btn-ne').classList.toggle('active', lang === 'ne');
  document.getElementById('btn-en').classList.toggle('active', lang === 'en');
  localStorage.setItem('nagarikAawazLang', lang);
}

/* ── 3. Step navigation ── */
function goToStep(stepId) {
  document.querySelectorAll('.form-step').forEach(function(s) { s.classList.remove('active'); });
  var target = document.getElementById(stepId);
  if (target) target.classList.add('active');
  
  ['loginAlert', 'forgotAlert'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('show');
  });
  
  if (stepId === 'stepForgot2') startResetOtpTimer();
  
  var card = document.querySelector('.auth-card');
  if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── 4. Password toggle ── */
const EYE_OPEN = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

function togglePassword(inputId, btn) {
  var input = document.getElementById(inputId);
  if (!input) return;
  var show = input.type === 'text';
  input.type = show ? 'password' : 'text';
  btn.innerHTML = show ? EYE_OPEN : EYE_OFF;
}

/* ── 5. OTP box auto-advance ── */
function initOtpBoxes() {
  document.querySelectorAll('.otp-box').forEach(function(box, i, all) {
    var group = all;
    box.addEventListener('input', function() {
      this.value = this.value.replace(/\D/g, '').slice(-1);
      if (this.value && i < group.length - 1) group[i + 1].focus();
    });
    box.addEventListener('keydown', function(e) {
      if (e.key === 'Backspace' && !this.value && i > 0) group[i - 1].focus();
    });
    box.addEventListener('paste', function(e) {
      e.preventDefault();
      var digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
      digits.split('').forEach(function(d, j) {
        if (group[j]) group[j].value = d;
      });
      var nextIdx = Math.min(digits.length, group.length - 1);
      if (group[nextIdx]) group[nextIdx].focus();
    });
  });
}

/* ── 6. Reset OTP timer ── */
function startResetOtpTimer() {
  var secs = 30;
  var btn = document.getElementById('resendResetBtn');
  if (btn) btn.classList.add('disabled');
  
  clearInterval(resetTimerInterval);
  resetTimerInterval = setInterval(function() {
    secs--;
    var neEl = document.getElementById('resetTimerNe');
    var enEl = document.getElementById('resetTimerEn');
    if (neEl) neEl.textContent = '(' + toNepaliDigits(secs) + ')';
    if (enEl) enEl.textContent = '(' + secs + ')';
    
    if (secs <= 0) {
      clearInterval(resetTimerInterval);
      if (btn) btn.classList.remove('disabled');
      if (neEl) neEl.textContent = '';
      if (enEl) enEl.textContent = '';
    }
  }, 1000);
}

async function resendResetOtp() {
  var btn = document.getElementById('resendResetBtn');
  if (btn && btn.classList.contains('disabled')) return;
  
  try {
    await fetch(API + '/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: forgotEmail })
    });
    startResetOtpTimer();
  } catch (err) {
    console.error('Resend OTP failed:', err);
  }
}

/* ── 7. Login form handler ── */
function setupLoginForm() {
  var form = document.getElementById('loginForm');
  if (!form) return;
  
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    clearErrors();
    document.getElementById('loginAlert')?.classList.remove('show');
    
    var email = document.getElementById('email')?.value.trim();
    var password = document.getElementById('password')?.value;
    var valid = true;
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      document.getElementById('email')?.classList.add('error');
      document.getElementById('email')?.closest('.form-group')?.classList.add('has-error');
      valid = false;
    }
    if (!password) {
      document.getElementById('password')?.classList.add('error');
      document.getElementById('password')?.closest('.form-group')?.classList.add('has-error');
      valid = false;
    }
    if (!valid) return;
    
    if (document.getElementById('rememberMe')?.checked) {
      localStorage.setItem('nagarikAawazRememberedEmail', email);
    } else {
      localStorage.removeItem('nagarikAawazRememberedEmail');
    }
    
    var btn = document.getElementById('loginBtn');
    var origHTML = btn?.innerHTML;
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>'; }
    
    try {
      var res = await fetch(API + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      var data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('nagarikAawazToken', data.token);
        localStorage.setItem('nagarikAawazRole', data.role);
        localStorage.setItem('nagarikAawazWard', String(data.ward));
        localStorage.setItem('nagarikAawazName', data.fullName);
        
        var routes = {
          citizen: 'dashboard-citizen.html',
          ward_official: 'dashboard-ward.html',
          metro_admin: 'dashboard-metro.html'
        };
        window.location.href = routes[data.role] || 'index.html';
      } else {
        var alertEl = document.getElementById('loginAlert');
        if (alertEl) {
          var neSpan = alertEl.querySelector('[data-lang="ne"]');
          var enSpan = alertEl.querySelector('[data-lang="en"]');
          if (neSpan) neSpan.textContent = data.message || 'इमेल वा पासवर्ड मिलेन।';
          if (enSpan) enSpan.textContent = data.message || 'Incorrect email or password.';
          alertEl.classList.add('show');
        }
      }
    } catch (err) {
      document.getElementById('loginAlert')?.classList.add('show');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = origHTML; }
    }
  });
}

function clearErrors() {
  document.querySelectorAll('.form-group.has-error').forEach(function(g) {
    g.classList.remove('has-error');
  });
  document.querySelectorAll('input.error').forEach(function(el) {
    el.classList.remove('error');
  });
}

/* ── 8. Forgot password handlers ── */
function setupForgotEmailForm() {
  var form = document.getElementById('forgotEmailForm');
  if (!form) return;
  
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    clearErrors();
    document.getElementById('forgotAlert')?.classList.remove('show');
    
    var email = document.getElementById('resetEmail')?.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      document.getElementById('resetEmail')?.classList.add('error');
      document.getElementById('resetEmail')?.closest('.form-group')?.classList.add('has-error');
      return;
    }
    
    try {
      var res = await fetch(API + '/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      var data = await res.json();
      
      if (res.ok) {
        forgotEmail = email;
        ['resetOtpEmailNe', 'resetOtpEmailEn'].forEach(function(id) {
          var el = document.getElementById(id);
          if (el) el.textContent = email;
        });
        goToStep('stepForgot2');
      } else {
        document.getElementById('forgotAlert')?.classList.add('show');
      }
    } catch (err) {
      document.getElementById('forgotAlert')?.classList.add('show');
    }
  });
}

function setupOtpForm() {
  var form = document.getElementById('resetOtpForm');
  if (!form) return;
  
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    var boxes = document.querySelectorAll('.otp-box');
    var otp = Array.from(boxes).map(function(b) { return b.value; }).join('');
    var errEl = document.getElementById('resetOtpError');
    if (errEl) errEl.style.display = 'none';
    
    if (otp.length !== 6) {
      if (errEl) errEl.style.display = 'flex';
      return;
    }
    
    try {
      var res = await fetch(API + '/auth/verify-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, otp })
      });
      
      if (res.ok) {
        sessionStorage.setItem('nagarikAawazResetOtp', otp);
        goToStep('stepForgot3');
      } else {
        if (errEl) errEl.style.display = 'flex';
      }
    } catch (err) {
      if (errEl) errEl.style.display = 'flex';
    }
  });
}

function setupNewPasswordForm() {
  var form = document.getElementById('newPasswordForm');
  if (!form) return;
  
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    clearErrors();
    
    var newPassword = document.getElementById('newPassword')?.value;
    var confirmNewPassword = document.getElementById('confirmNewPassword')?.value;
    var valid = true;
    
    if (!newPassword || newPassword.length < 8) {
      document.getElementById('newPassword')?.classList.add('error');
      document.getElementById('newPassword')?.closest('.form-group')?.classList.add('has-error');
      valid = false;
    }
    if (newPassword !== confirmNewPassword) {
      document.getElementById('confirmNewPassword')?.classList.add('error');
      document.getElementById('confirmNewPassword')?.closest('.form-group')?.classList.add('has-error');
      valid = false;
    }
    if (!valid) return;
    
    var otp = sessionStorage.getItem('nagarikAawazResetOtp') || '';
    
    try {
      var res = await fetch(API + '/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, otp, newPassword, confirmNewPassword })
      });
      var data = await res.json();
      
      if (res.ok) {
        sessionStorage.removeItem('nagarikAawazResetOtp');
        goToStep('stepForgotSuccess');
      } else {
        alert(data.message || 'Password reset failed.');
      }
    } catch (err) {
      alert('Network error. Please try again.');
    }
  });
}

/* ── 9. Init ── */
document.addEventListener('DOMContentLoaded', function() {
  // Language
  var savedLang = localStorage.getItem('nagarikAawazLang');
  if (savedLang === 'en') setLang('en');
  
  // Restore remembered email
  var remembered = localStorage.getItem('nagarikAawazRememberedEmail');
  if (remembered) {
    var emailEl = document.getElementById('email');
    var rememberEl = document.getElementById('rememberMe');
    if (emailEl) emailEl.value = remembered;
    if (rememberEl) rememberEl.checked = true;
  }
  
  // Initialize OTP boxes
  initOtpBoxes();
  
  // Setup forms
  setupLoginForm();
  setupForgotEmailForm();
  setupOtpForm();
  setupNewPasswordForm();
});