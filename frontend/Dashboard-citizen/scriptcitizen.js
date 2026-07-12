/* ================================================================
   NAGARIK AAWAZ — dashboard-citizen.js
   Sections:
     1.  Language toggle
     2.  Stat card number switching
     3.  Mobile sidebar
     4.  Notification dropdown (bell icon)
     5.  Generic popup modal open/close
     6.  Profile picture preview
     7.  Logout
     8.  Auth guard
     9.  Init
================================================================ */

/* ── 1. Language toggle ── */
function setLang(lang) {
  document.body.classList.toggle('lang-mode-en', lang === 'en');
  document.getElementById('btn-ne').classList.toggle('active', lang === 'ne');
  document.getElementById('btn-en').classList.toggle('active', lang === 'en');
  localStorage.setItem('nagarikAawazLang', lang);

  // Update stat numbers to match language
  updateStatNumbers(lang);
}

/* ── 2. Stat card number switching ──
   Each .stat-num has data-ne (Nepali digits) and data-en (Arabic digits).
   Swap based on current language so numbers look native.
*/
function updateStatNumbers(lang) {
  document.querySelectorAll('.stat-num').forEach(el => {
    el.textContent = lang === 'en' ? el.dataset.en : el.dataset.ne;
  });
}

/* ── 3. Mobile sidebar ── */
function toggleSidebar() {
  const sidebar   = document.getElementById('sidebar');
  const backdrop  = document.getElementById('sbBackdrop');
  const btnToggle = document.getElementById('menuToggleSb');
  const iconOpen  = document.getElementById('sbIconOpen');
  const iconClose = document.getElementById('sbIconClose');

  const isOpen = sidebar.classList.toggle('open');
  backdrop.classList.toggle('show', isOpen);
  btnToggle.setAttribute('aria-expanded', String(isOpen));

  iconOpen.style.display  = isOpen ? 'none'  : 'block';
  iconClose.style.display = isOpen ? 'block' : 'none';
}

/* Close sidebar if window resizes past mobile breakpoint */
function handleResize() {
  if (window.innerWidth > 900) {
    const sidebar  = document.getElementById('sidebar');
    const backdrop = document.getElementById('sbBackdrop');
    const iconOpen  = document.getElementById('sbIconOpen');
    const iconClose = document.getElementById('sbIconClose');

    sidebar.classList.remove('open');
    backdrop.classList.remove('show');
    iconOpen.style.display  = 'block';
    iconClose.style.display = 'none';
    document.getElementById('menuToggleSb').setAttribute('aria-expanded', 'false');
  }
}

/* ── 4. Notification dropdown (bell icon) ── */
function toggleNotifications(e) {
  if (e) e.stopPropagation();
  document.getElementById('notifDropdown').classList.toggle('open');
}
function closeNotifications() {
  document.getElementById('notifDropdown').classList.remove('open');
}
document.addEventListener('click', (e) => {
  const wrap = document.getElementById('notifWrap');
  if (wrap && !wrap.contains(e.target)) closeNotifications();
});

/* ── 5. Generic popup modal open/close ──
   Used by: Announcements, My Profile, and Settings sidebar buttons.
*/
function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    closeNotifications();
  }
});

/* ── 6. Profile picture preview ──
   Reads the chosen file locally and previews it immediately in both the
   profile modal and the app-bar avatar. No upload happens yet — once the
   backend has an image endpoint, send `file` there on Save instead.
*/
function handleProfilePicChange(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;

    const preview = document.getElementById('profilePicPreview');
    preview.innerHTML = `<img src="${dataUrl}" alt="Profile photo">`;

    const avatar = document.getElementById('userAvatar');
    avatar.innerHTML = `<img src="${dataUrl}" alt="Profile photo">`;
  };
  reader.readAsDataURL(file);
}

/* ── 7. Logout ──
   Shared by the sidebar Logout link and the Logout button inside the
   Profile popup.
*/
function logoutUser(e) {
  if (e) e.preventDefault();
  localStorage.removeItem('nagarikAawazToken');
  localStorage.removeItem('nagarikAawazRememberedEmail');
  window.location.href = 'login.html';
}

function setupLogout() {
  const btn = document.getElementById('logoutBtn');
  if (btn) btn.addEventListener('click', logoutUser);
}

/* ── 8. Auth guard ──
   If no token in localStorage, redirect to login.
*/
function checkAuth() {
  const token = localStorage.getItem('nagarikAawazToken');
  if (!token) {
    window.location.href = 'login.html';
  }
}

/* ── 9. Init ── */
document.addEventListener('DOMContentLoaded', () => {
  // Auth check first — redirect if not logged in
  checkAuth();

  // Restore saved language
  const savedLang = localStorage.getItem('nagarikAawazLang') || 'ne';
  if (savedLang === 'en') setLang('en');
  else updateStatNumbers('ne');

  // Mobile sidebar resize handler
  window.addEventListener('resize', handleResize);

  // Logout (sidebar link)
  setupLogout();

  /* ── Backend hook ─────────────────────────────────────────────────
     When your backend is ready, replace the static HTML table rows
     with a real fetch call. Example:

     const token = localStorage.getItem('nagarikAawazToken');

     fetch('/api/complaints/mine', {
       headers: { 'Authorization': `Bearer ${token}` }
     })
     .then(res => res.json())
     .then(data => renderComplaintsTable(data.complaints))
     .catch(err => console.error('Failed to load complaints:', err));

     function renderComplaintsTable(complaints) {
       const tbody = document.querySelector('.complaints-table tbody');
       tbody.innerHTML = complaints.map(c => `
         <tr>
           <td class="cell-id">NA-${c._id.slice(-8).toUpperCase()}</td>
           <td class="cell-title-col">
             <div class="cell-title">${c.title}</div>
             <div class="cell-sub">Ward ${c.location.ward}</div>
           </td>
           <td class="cell-date">${new Date(c.createdAt).toLocaleDateString()}</td>
           <td>${badgeHTML(c.status)}</td>
           <td class="cell-action">
             <button class="action-btn" onclick="viewComplaint('${c._id}')">...</button>
           </td>
         </tr>
       `).join('');
     }
  ─────────────────────────────────────────────────────────────────── */
});