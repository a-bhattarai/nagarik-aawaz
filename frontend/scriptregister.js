/* ================================================================
   NAGARIK AAWAZ — scriptregister.js
   Sections:
     1.  Config & Helpers
     2.  Language toggle
     3.  Step navigation
     4.  Password toggle
     5.  OTP box auto-advance
     6.  OTP timer
     7.  Register form handler
     8.  OTP form handler
     9.  Resend OTP
     10. Init
================================================================ */

/* ── 1. Config & Helpers ── */
const API = 'http://localhost:5000/api';
let registrationEmail = '';
let otpTimerInterval;

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
  document.querySelectorAll('.form-step').forEach(function(s) {
    s.classList.remove('active');
  });
  var target = document.getElementById(stepId);
  if (target) target.classList.add('active');
  
  // Scroll to top of card
  var card = document.querySelector('.auth-card');
  if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── 4. Password toggle ── */
function togglePassword(inputId, btn) {
  var input = document.getElementById(inputId);
  if (!input) return;
  var show = input.type === 'text';
  input.type = show ? 'password' : 'text';
  var icon = btn.querySelector('i');
  if (icon) {
    icon.className = show ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
  }
}

/* ── 5. OTP box auto-advance ── */
function initOtpBoxes() {
  var boxes = document.querySelectorAll('.otp-box');
  boxes.forEach(function(box, i) {
    var group = boxes;
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

/* ── 6. OTP timer ── */
function startOtpTimer() {
  var secs = 30;
  var resendBtn = document.getElementById('resendOtpBtn');
  var timerNe = document.getElementById('timerNe');
  var timerEn = document.getElementById('timerEn');
  
  if (resendBtn) resendBtn.classList.add('disabled');
  clearInterval(otpTimerInterval);
  
  otpTimerInterval = setInterval(function() {
    secs--;
    if (timerNe) timerNe.textContent = '(' + toNepaliDigits(secs) + ')';
    if (timerEn) timerEn.textContent = '(' + secs + ')';
    
    if (secs <= 0) {
      clearInterval(otpTimerInterval);
      if (resendBtn) resendBtn.classList.remove('disabled');
      if (timerNe) timerNe.textContent = '';
      if (timerEn) timerEn.textContent = '';
    }
  }, 1000);
}

/* ── 7. Register form handler ── */
function setupRegisterForm() {
  var form = document.getElementById('registerForm');
  if (!form) return;
  
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    clearErrors();
    hideAlert('registerAlert');
    
    var fullName = document.getElementById('fullName')?.value.trim();
    var email = document.getElementById('regEmail')?.value.trim();
    var phone = document.getElementById('phone')?.value.trim();
    var ward = document.getElementById('wardSelect')?.value;
    var password = document.getElementById('password')?.value;
    var confirmPassword = document.getElementById('confirmPassword')?.value;
    
    var valid = true;
    
    if (!fullName) {
      document.getElementById('fullName')?.classList.add('error');
      document.getElementById('fullName')?.closest('.form-group')?.classList.add('has-error');
      valid = false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      document.getElementById('regEmail')?.classList.add('error');
      document.getElementById('regEmail')?.closest('.form-group')?.classList.add('has-error');
      valid = false;
    }
    if (!phone) {
      document.getElementById('phone')?.classList.add('error');
      document.getElementById('phone')?.closest('.form-group')?.classList.add('has-error');
      valid = false;
    }
    if (!ward) {
      document.getElementById('wardSelect')?.classList.add('error');
      document.getElementById('wardSelect')?.closest('.form-group')?.classList.add('has-error');
      valid = false;
    }
    if (!password || password.length < 8) {
      document.getElementById('password')?.classList.add('error');
      document.getElementById('password')?.closest('.form-group')?.classList.add('has-error');
      valid = false;
    }
    if (password !== confirmPassword) {
      document.getElementById('confirmPassword')?.classList.add('error');
      document.getElementById('confirmPassword')?.closest('.form-group')?.classList.add('has-error');
      valid = false;
    }
    if (!valid) return;
    
    setBtnLoading('registerBtn', true);
    
    try {
      var res = await fetch(API + '/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName,
          email: email,
          phone: phone,
          ward: Number(ward),
          password: password,
          confirmPassword: confirmPassword
        })
      });
      var data = await res.json();
      
      if (res.ok) {
        registrationEmail = email;
        document.querySelectorAll('.otp-email-target').forEach(function(el) {
          el.textContent = email;
        });
        goToStep('stepOtp');
        startOtpTimer();
      } else {
        showAlert('registerAlert', data.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      showAlert('registerAlert', 'Network error. Please check your connection.');
    } finally {
      setBtnLoading('registerBtn', false);
    }
  });
}

/* ── 8. OTP form handler ── */
function setupOtpForm() {
  var form = document.getElementById('otpForm');
  if (!form) return;
  
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    hideAlert('otpAlert');
    
    var boxes = document.querySelectorAll('.otp-box');
    var otp = Array.from(boxes).map(function(b) { return b.value; }).join('');
    
    if (otp.length !== 6) {
      showAlert('otpAlert', document.body.classList.contains('lang-mode-en')
        ? 'Please enter all 6 digits.'
        : 'कृपया ६ अंकको OTP लेख्नुहोस्。');
      return;
    }
    
    setBtnLoading('verifyOtpBtn', true);
    
    try {
      var res = await fetch(API + '/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registrationEmail, otp: otp })
      });
      var data = await res.json();
      
      if (res.ok) {
        clearInterval(otpTimerInterval);
        goToStep('stepSuccess');
      } else {
        showAlert('otpAlert', data.message || 'Incorrect OTP. Please try again.');
      }
    } catch (err) {
      showAlert('otpAlert', 'Network error. Please check your connection.');
    } finally {
      setBtnLoading('verifyOtpBtn', false);
    }
  });
}

/* ── 9. Resend OTP ── */
async function resendOtp() {
  var btn = document.getElementById('resendOtpBtn');
  if (btn && btn.classList.contains('disabled')) return;
  
  hideAlert('otpAlert');
  
  try {
    var res = await fetch(API + '/auth/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: registrationEmail })
    });
    var data = await res.json();
    
    if (res.ok) {
      startOtpTimer();
    } else {
      showAlert('otpAlert', data.message || 'Failed to resend OTP.');
    }
  } catch (err) {
    showAlert('otpAlert', 'Network error.');
  }
}

/* ── Utility functions ── */
function clearErrors() {
  document.querySelectorAll('.form-group.has-error').forEach(function(g) {
    g.classList.remove('has-error');
  });
  document.querySelectorAll('input.error, select.error').forEach(function(el) {
    el.classList.remove('error');
  });
}

function showAlert(id, msg) {
  var el = document.getElementById(id);
  if (!el) return;
  var textEl = el.querySelector('span[data-lang="ne"], div span:first-child');
  if (textEl) textEl.textContent = msg;
  el.classList.add('show');
}

function hideAlert(id) {
  var el = document.getElementById(id);
  if (el) el.classList.remove('show');
}

function setBtnLoading(id, loading) {
  var btn = document.getElementById(id);
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    btn.dataset.orig = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span>';
  } else {
    btn.innerHTML = btn.dataset.orig || '';
  }
}

/* ── 10. Init ── */
document.addEventListener('DOMContentLoaded', function() {
  // Language
  var savedLang = localStorage.getItem('nagarikAawazLang');
  if (savedLang === 'en') setLang('en');
  
  // Ward dropdown 1–33
  var wardSelect = document.getElementById('wardSelect');
  if (wardSelect) {
    for (var i = 1; i <= 33; i++) {
      var opt = document.createElement('option');
      opt.value = i;
      opt.textContent = 'वडा ' + toNepaliDigits(i) + ' / Ward ' + i;
      wardSelect.appendChild(opt);
    }
  }
  
  // Initialize OTP boxes
  initOtpBoxes();
  
  // Setup forms
  setupRegisterForm();
  setupOtpForm();
});