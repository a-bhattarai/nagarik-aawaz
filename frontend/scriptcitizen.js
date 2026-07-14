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

async function viewComplaintDetail(id) {
  const token = localStorage.getItem('nagarikAawazToken');
  const en = document.body.classList.contains('lang-mode-en');
  const body  = document.getElementById('complaintViewBody');
  const title = document.getElementById('complaintViewTitle');

  title.textContent = en ? 'Loading…' : 'लोड हुँदैछ...';
  body.innerHTML = '';
  openModal('complaintViewOverlay');

  try {
    const res = await fetch(`${API}/complaints/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
    const { complaint: c } = await res.json();
    const s = STATUS_BADGE[c.status] || STATUS_BADGE.pending;

    title.textContent = `NA-${c._id.slice(-5).toUpperCase()} — ${escapeHtml(c.title)}`;
    body.innerHTML = `
      ${c.photo
        ? `<img src="${c.photo}" style="width:100%;max-height:220px;object-fit:cover;border-radius:10px;border:1px solid var(--border);" alt="Photo">`
        : `<div style="width:100%;height:80px;background:var(--bg);border:1.5px dashed var(--border);border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--gray);font-size:0.82rem;">${en ? 'No photo submitted' : 'फोटो छैन'}</div>`}
      <div style="margin-top:14px;">
        <div style="font-size:0.68rem;font-weight:700;color:var(--gray);text-transform:uppercase;margin-bottom:4px;">${en ? 'DESCRIPTION' : 'विवरण'}</div>
        <p style="font-size:0.88rem;color:var(--ink);line-height:1.6;">${escapeHtml(c.description)}</p>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;">
        <div style="flex:1;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px;">
          <div style="font-size:0.66rem;font-weight:700;color:var(--gray);text-transform:uppercase;">${en ? 'WARD' : 'वडा'}</div>
          <div style="font-weight:700;">${c.location?.ward ?? '—'}</div>
        </div>
        <div style="flex:1;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px;">
          <div style="font-size:0.66rem;font-weight:700;color:var(--gray);text-transform:uppercase;">${en ? 'STATUS' : 'स्थिती'}</div>
          <div style="font-weight:700;">${en ? s.en : s.ne}</div>
        </div>
      </div>
      ${c.location?.landmark ? `
        <div style="margin-top:10px;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px;">
          <div style="font-size:0.66rem;font-weight:700;color:var(--gray);text-transform:uppercase;">${en ? 'LANDMARK' : 'चिनारी स्थान'}</div>
          <div style="font-weight:600;">${escapeHtml(c.location.landmark)}</div>
        </div>` : ''}
      ${c.location?.lat ? `
        <a href="https://www.openstreetmap.org/?mlat=${c.location.lat}&mlon=${c.location.lng}&zoom=17" target="_blank" rel="noopener"
           style="display:inline-flex;align-items:center;gap:6px;margin-top:12px;font-size:0.82rem;font-weight:600;color:var(--info);">
           ${en ? 'Open on map' : 'नक्सामा हेर्नुहोस्'} (${c.location.lat.toFixed(4)}, ${c.location.lng.toFixed(4)})
        </a>` : ''}
    `;
  } catch (err) {
    body.innerHTML = `<p style="color:var(--error);">${en ? 'Failed to load complaint.' : 'गुनासो लोड गर्न असफल।'}</p>`;
  }
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

  loadMyComplaints();
});

const API = 'http://localhost:5001/api';

const STATUS_BADGE = {
  'pending':     { cls: 'b-review',   ne: 'समीक्षामा',      en: 'Under Review' },
  'in-progress': { cls: 'b-progress', ne: 'प्रक्रियामा',    en: 'In Progress' },
  'resolved':    { cls: 'b-resolved', ne: 'समाधान भयो',    en: 'Resolved' },
  'escalated':   { cls: 'b-rejected', ne: 'एस्कलेट भयो',   en: 'Escalated' }
};

function badgeHTML(status) {
  const s = STATUS_BADGE[status] || STATUS_BADGE.pending;
  return `<span class="badge ${s.cls}"><span class="badge-dot"></span>
    <span data-lang="ne">${s.ne}</span><span data-lang="en">${s.en}</span></span>`;
}

function loadMyComplaints() {
  const token = localStorage.getItem('nagarikAawazToken');

  fetch(`${API}/complaints`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(data => {
      const complaints = data.complaints || [];
      renderComplaintsTable(complaints);
      updateStatCards(complaints);
    })
    .catch(err => console.error('Failed to load complaints:', err));
}

function renderComplaintsTable(complaints) {
  const tbody = document.querySelector('.complaints-table tbody');
  if (!complaints.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:24px; color:var(--gray);">
      <span data-lang="ne">तपाईंले हालसम्म कुनै गुनासो पेश गर्नुभएको छैन।</span>
      <span data-lang="en">You haven't filed any complaints yet.</span>
    </td></tr>`;
    return;
  }
  tbody.innerHTML = complaints.map(c => `
    <tr>
      <td class="cell-id">NA-${c._id.slice(-8).toUpperCase()}</td>
      <td class="cell-title-col">
        <div class="cell-title">${escapeHtml(c.title)}</div>
        <div class="cell-sub">Ward ${c.location.ward}${c.location.landmark ? ', ' + escapeHtml(c.location.landmark) : ''}</div>
      </td>
      <td class="cell-date">${new Date(c.createdAt).toLocaleDateString()}</td>
      <td>${badgeHTML(c.status)}</td>
      <td class="cell-action">
        <button class="action-btn" aria-label="View complaint" onclick="viewComplaintDetail('${c._id}')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
      </td>
    </tr>
  `).join('');
}

function updateStatCards(complaints) {
  const counts = { total: complaints.length, progress: 0, resolved: 0, escalated: 0 };
  complaints.forEach(c => {
    if (c.status === 'in-progress') counts.progress++;
    if (c.status === 'resolved') counts.resolved++;
    if (c.status === 'escalated') counts.escalated++;
  });

  const setNum = (selector, val) => {
    const el = document.querySelector(selector);
    if (el) { el.dataset.ne = toNepaliDigits(val); el.dataset.en = val; }
  };
  setNum('.stat-card.total .stat-num', counts.total);
  setNum('.stat-card.progress .stat-num', counts.progress);
  setNum('.stat-card.resolved .stat-num', counts.resolved);
  setNum('.stat-card.rejected .stat-num', counts.escalated);

  updateStatNumbers(document.body.classList.contains('lang-mode-en') ? 'en' : 'ne');
}

function toNepaliDigits(n) {
  const map = {'0':'०','1':'१','2':'२','3':'३','4':'४','5':'५','6':'६','7':'७','8':'८','9':'९'};
  return String(n).split('').map(d => map[d] ?? d).join('');
}