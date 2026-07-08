/* =====================================================
   NAGARIK AAWAZ — REGISTER PAGE SCRIPT
===================================================== */

/* ---------------- LANGUAGE ---------------- */

function setLang(lang) {
  document.body.classList.toggle("lang-mode-en", lang === "en");
  document.getElementById("btn-ne").classList.toggle("active", lang === "ne");
  document.getElementById("btn-en").classList.toggle("active", lang === "en");
  localStorage.setItem("nagarikAawazLang", lang);
}

/* ---------------- STEP NAVIGATION ---------------- */

function goToStep(stepId) {
  document.querySelectorAll(".form-step").forEach(step => {
    step.classList.remove("active");
  });
  document.getElementById(stepId).classList.add("active");

  if (stepId === "registerStep2") {
    startOtpTimer();
  }

  document.querySelector(".auth-card").scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });
}

/* ---------------- PASSWORD TOGGLE ---------------- */

const eyeOpen = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const eyeClose = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

function togglePassword(id, btn) {
  const input = document.getElementById(id);
  if (input.type === "password") {
    input.type = "text";
    btn.innerHTML = eyeClose;
  } else {
    input.type = "password";
    btn.innerHTML = eyeOpen;
  }
}

/* ---------------- OTP BOXES ---------------- */

function initOtpBoxes() {
  const boxes = document.querySelectorAll(".otp-box");

  boxes.forEach((box, index) => {
    box.addEventListener("input", () => {
      box.value = box.value.replace(/\D/g, '');
      if (box.value && index < boxes.length - 1) {
        boxes[index + 1].focus();
      }
    });

    box.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !box.value && index > 0) {
        boxes[index - 1].focus();
      }
    });

    box.addEventListener("paste", (e) => {
      e.preventDefault();
      const data = e.clipboardData.getData("text").replace(/\D/g, '');
      data.split('').forEach((num, i) => {
        if (boxes[i]) boxes[i].value = num;
      });
    });
  });
}

/* ---------------- REGISTER FORM ---------------- */

document.getElementById("registerForm")?.addEventListener("submit", function (e) {
  e.preventDefault();
  goToStep("registerStep2");
});

/* ---------------- OTP VERIFY ---------------- */

document.getElementById("otpForm")?.addEventListener("submit", function (e) {
  e.preventDefault();

  const otp = [...document.querySelectorAll(".otp-box")]
    .map(box => box.value)
    .join('');

  const otpError = document.getElementById("otpError");

  if (otp.length !== 6) {
    if (otpError) otpError.classList.add("show");
    return;
  }

  if (otpError) otpError.classList.remove("show");
  goToStep("registerSuccess");
});

/* ---------------- OTP TIMER ---------------- */

let timer;

function startOtpTimer() {
  clearInterval(timer);
  let seconds = 30;
  const btn = document.getElementById("resendBtn");
  btn.classList.add("disabled");
  updateTimer(seconds);

  timer = setInterval(() => {
    seconds--;
    updateTimer(seconds);
    if (seconds <= 0) {
      clearInterval(timer);
      btn.classList.remove("disabled");
      document.getElementById("timerNe").textContent = "";
      document.getElementById("timerEn").textContent = "";
    }
  }, 1000);
}

function updateTimer(sec) {
  document.getElementById("timerNe").textContent = "(" + toNepali(sec) + ")";
  document.getElementById("timerEn").textContent = "(" + sec + ")";
}

function resendOtp() {
  if (document.getElementById("resendBtn").classList.contains("disabled")) return;
  startOtpTimer();
}

function toNepali(num) {
  const digits = { 0: "०", 1: "१", 2: "२", 3: "३", 4: "४", 5: "५", 6: "६", 7: "७", 8: "८", 9: "९" };
  return String(num).split("").map(n => digits[n]).join("");
}

/* ---------------- INIT ---------------- */

document.addEventListener("DOMContentLoaded", () => {
  const lang = localStorage.getItem("nagarikAawazLang");
  if (lang === "en") setLang("en");

  initOtpBoxes();
});