/* ================================================================
   NAGARIK AAWAZ — dashboard-citizen.js
================================================================ */

const API = 'http://localhost:5001/api';

/* ── 1. Language toggle ── */
function setLang(lang) {
  document.body.classList.toggle('lang-mode-en', lang === 'en');
  document.getElementById('btn-ne').classList.toggle('active', lang === 'ne');
  document.getElementById('btn-en').classList.toggle('active', lang === 'en');
  localStorage.setItem('nagarikAawazLang', lang);
  updateStatNumbers(lang);
}

function updateStatNumbers(lang) {
  document.querySelectorAll('.stat-num').forEach(el => {
    el.textContent = lang === 'en' ? el.dataset.en : el.dataset.ne;
  });
}

function toNepaliDigits(n) {
  const map = {'0':'०','1':'१','2':'२','3':'३','4':'४','5':'५','6':'६','7':'७','8':'८','9':'९'};
  return String(n).split('').map(d => map[d] || d).join('');
}

/* ── 2. Load current user ── */
async function loadCurrentUser() {
  const token = localStorage.getItem('nagarikAawazToken');
  console.log('loadCurrentUser: token exists =', !!token);
  if (!token) return;

  // First try localStorage (set during login)
  const storedName = localStorage.getItem('nagarikAawazName');
  const storedWard = localStorage.getItem('nagarikAawazWard');
  console.log('localStorage name:', storedName, 'ward:', storedWard);

  if (storedName) {
    updateUIWithUser({ name: storedName, ward: storedWard || '?' });
  }

  // Then try the API for fresh data
  try {
    console.log('Fetching /api/auth/me...');
    const res = await fetch(API + '/auth/me', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    console.log('Response status:', res.status);
    if (res.ok) {
      const user = await res.json();
      console.log('API user data:', user);
      updateUIWithUser(user);
      // Update localStorage with fresh data
      localStorage.setItem('nagarikAawazName', user.name);
      localStorage.setItem('nagarikAawazWard', String(user.ward));
    } else {
      console.log('API returned status', res.status, '- using localStorage fallback');
    }
  } catch (err) {
    console.log('API fetch failed, using localStorage fallback:', err.message);
  }
}

function updateUIWithUser(user) {
  const initials = user.name.split(' ').map(function(w) { return w[0]; }).join('').slice(0, 2);

  var el;

  el = document.getElementById('userAvatar');
  if (el) el.textContent = initials;

  el = document.getElementById('userName');
  if (el) el.textContent = user.name;

  el = document.getElementById('userNameEn');
  if (el) el.textContent = user.name;

  el = document.getElementById('userWardNe');
  if (el) el.textContent = 'वडा नं. ' + toNepaliDigits(user.ward);

  el = document.getElementById('userWardEn');
  if (el) el.textContent = 'Ward No. ' + user.ward;

  el = document.getElementById('welcomeHeadingNe');
  if (el) el.textContent = 'नमस्ते, ' + user.name + ' जी';

  el = document.getElementById('welcomeHeadingEn');
  if (el) el.textContent = 'Welcome back, ' + user.name.split(' ')[0];

  el = document.getElementById('welcomeSubNe');
  if (el) el.textContent = 'वडा नं. ' + toNepaliDigits(user.ward) + ' — तपाईंका गुनासोको हालको अवस्था यहाँ हेर्नुहोस्।';

  el = document.getElementById('welcomeSubEn');
  if (el) el.textContent = 'Ward ' + user.ward + ' — Here\'s a quick look at the status of your complaints.';

  el = document.getElementById('profileNameInput');
  if (el) el.value = user.name;

  el = document.getElementById('profileEmailInput');
  if (el && user.email) el.value = user.email;

  el = document.getElementById('profilePhoneInput');
  if (el && user.phone) el.value = user.phone;

  el = document.getElementById('profileWardInput');
  if (el) el.value = 'वडा नं. ' + toNepaliDigits(user.ward);

  el = document.getElementById('profilePicPreview');
  if (el && !el.querySelector('img')) el.textContent = initials;
}

/* ── 3. Mobile sidebar ── */
function toggleSidebar() {
  var sidebar = document.getElementById('sidebar');
  var backdrop = document.getElementById('sbBackdrop');
  var btnToggle = document.getElementById('menuToggleSb');
  var iconOpen = document.getElementById('sbIconOpen');
  var iconClose = document.getElementById('sbIconClose');
  var isOpen = sidebar.classList.toggle('open');
  backdrop.classList.toggle('show', isOpen);
  btnToggle.setAttribute('aria-expanded', String(isOpen));
  iconOpen.style.display = isOpen ? 'none' : 'block';
  iconClose.style.display = isOpen ? 'block' : 'none';
}

function handleResize() {
  if (window.innerWidth > 900) {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sbBackdrop').classList.remove('show');
    document.getElementById('sbIconOpen').style.display = 'block';
    document.getElementById('sbIconClose').style.display = 'none';
    document.getElementById('menuToggleSb').setAttribute('aria-expanded', 'false');
  }
}

/* ── 4. Notifications ── */
function toggleNotifications(e) {
  if (e) e.stopPropagation();
  document.getElementById('notifDropdown').classList.toggle('open');
}
function closeNotifications() {
  document.getElementById('notifDropdown').classList.remove('open');
}
document.addEventListener('click', function(e) {
  var wrap = document.getElementById('notifWrap');
  if (wrap && !wrap.contains(e.target)) closeNotifications();
});

/* ── 5. Modals ── */
function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(function(m) { m.classList.remove('open'); });
    closeNotifications();
  }
});

/* ── 6. Profile picture ── */
function handleProfilePicChange(input) {
  var file = input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var dataUrl = e.target.result;
    document.getElementById('profilePicPreview').innerHTML = '<img src="' + dataUrl + '" alt="Profile photo">';
    document.getElementById('userAvatar').innerHTML = '<img src="' + dataUrl + '" alt="Profile photo">';
  };
  reader.readAsDataURL(file);
}

/* ── 7. Logout ── */
function logoutUser(e) {
  if (e) e.preventDefault();
  localStorage.removeItem('nagarikAawazToken');
  localStorage.removeItem('nagarikAawazRememberedEmail');
  window.location.href = 'login.html';
}

function setupLogout() {
  var btn = document.getElementById('logoutBtn');
  if (btn) btn.addEventListener('click', logoutUser);
}

/* ── 8. Auth guard ── */
function checkAuth() {
  if (!localStorage.getItem('nagarikAawazToken')) {
    window.location.href = 'login.html';
  }
}

/* ── 9. Complaint viewing ── */
var STATUS_BADGE = {
  'pending':     { cls: 'b-review',   ne: 'समीक्षामा',      en: 'Under Review' },
  'in-progress': { cls: 'b-progress', ne: 'प्रक्रियामा',    en: 'In Progress' },
  'resolved':    { cls: 'b-resolved', ne: 'समाधान भयो',    en: 'Resolved' },
  'escalated':   { cls: 'b-rejected', ne: 'एस्कलेट भयो',   en: 'Escalated' }
};

function badgeHTML(status) {
  var s = STATUS_BADGE[status] || STATUS_BADGE.pending;
  return '<span class="badge ' + s.cls + '"><span class="badge-dot"></span><span data-lang="ne">' + s.ne + '</span><span data-lang="en">' + s.en + '</span></span>';
}

async function viewComplaintDetail(id) {
  var token = localStorage.getItem('nagarikAawazToken');
  var en = document.body.classList.contains('lang-mode-en');
  var body = document.getElementById('complaintViewBody');
  var title = document.getElementById('complaintViewTitle');
  title.textContent = en ? 'Loading...' : 'लोड हुँदैछ...';
  body.innerHTML = '';
  openModal('complaintViewOverlay');
  try {
    var res = await fetch(API + '/complaints/' + id, { headers: { 'Authorization': 'Bearer ' + token } });
    var data = await res.json();
    var c = data.complaint;
    var s = STATUS_BADGE[c.status] || STATUS_BADGE.pending;
    title.textContent = 'NA-' + c._id.slice(-5).toUpperCase() + ' — ' + escapeHtml(c.title);
    body.innerHTML = (c.photo ? '<img src="' + c.photo + '" style="width:100%;max-height:220px;object-fit:cover;border-radius:10px;border:1px solid var(--border);" alt="Photo">' : '<div style="width:100%;height:80px;background:var(--bg);border:1.5px dashed var(--border);border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--gray);font-size:0.82rem;">' + (en ? 'No photo submitted' : 'फोटो छैन') + '</div>') +
      '<div style="margin-top:14px;"><div style="font-size:0.68rem;font-weight:700;color:var(--gray);text-transform:uppercase;margin-bottom:4px;">' + (en ? 'DESCRIPTION' : 'विवरण') + '</div><p style="font-size:0.88rem;color:var(--ink);line-height:1.6;">' + escapeHtml(c.description) + '</p></div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;"><div style="flex:1;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px;"><div style="font-size:0.66rem;font-weight:700;color:var(--gray);text-transform:uppercase;">' + (en ? 'WARD' : 'वडा') + '</div><div style="font-weight:700;">' + (c.location ? c.location.ward : '—') + '</div></div><div style="flex:1;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px;"><div style="font-size:0.66rem;font-weight:700;color:var(--gray);text-transform:uppercase;">' + (en ? 'STATUS' : 'स्थिती') + '</div><div style="font-weight:700;">' + (en ? s.en : s.ne) + '</div></div></div>' +
      (c.location && c.location.landmark ? '<div style="margin-top:10px;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px;"><div style="font-size:0.66rem;font-weight:700;color:var(--gray);text-transform:uppercase;">' + (en ? 'LANDMARK' : 'चिनारी स्थान') + '</div><div style="font-weight:600;">' + escapeHtml(c.location.landmark) + '</div></div>' : '') +
      (c.location && c.location.lat ? '<a href="https://www.openstreetmap.org/?mlat=' + c.location.lat + '&mlon=' + c.location.lng + '&zoom=17" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;margin-top:12px;font-size:0.82rem;font-weight:600;color:var(--info);">' + (en ? 'Open on map' : 'नक्सामा हेर्नुहोस्') + ' (' + c.location.lat.toFixed(4) + ', ' + c.location.lng.toFixed(4) + ')</a>' : '');
  } catch (err) {
    body.innerHTML = '<p style="color:var(--error);">' + (en ? 'Failed to load complaint.' : 'गुनासो लोड गर्न असफल।') + '</p>';
  }
}

/* ── 10. Load complaints ── */
function loadMyComplaints() {
  var token = localStorage.getItem('nagarikAawazToken');
  fetch(API + '/complaints', { headers: { 'Authorization': 'Bearer ' + token } })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      var complaints = data.complaints || [];
      renderComplaintsTable(complaints);
      updateStatCards(complaints);
    })
    .catch(function(err) { console.error('Failed to load complaints:', err); });
}

function renderComplaintsTable(complaints) {
  var tbody = document.querySelector('.complaints-table tbody');
  if (!complaints.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--gray);"><span data-lang="ne">तपाईंले हालसम्म कुनै गुनासो पेश गर्नुभएको छैन।</span><span data-lang="en">You haven\'t filed any complaints yet.</span></td></tr>';
    return;
  }
  tbody.innerHTML = complaints.map(function(c) {
    return '<tr><td class="cell-id">NA-' + c._id.slice(-8).toUpperCase() + '</td><td class="cell-title-col"><div class="cell-title">' + escapeHtml(c.title) + '</div><div class="cell-sub">Ward ' + c.location.ward + (c.location.landmark ? ', ' + escapeHtml(c.location.landmark) : '') + '</div></td><td class="cell-date">' + new Date(c.createdAt).toLocaleDateString() + '</td><td>' + badgeHTML(c.status) + '</td><td class="cell-action"><button class="action-btn" aria-label="View complaint" onclick="viewComplaintDetail(\'' + c._id + '\')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button></td></tr>';
  }).join('');
}

function updateStatCards(complaints) {
  var counts = { total: complaints.length, progress: 0, resolved: 0, escalated: 0 };
  complaints.forEach(function(c) {
    if (c.status === 'in-progress') counts.progress++;
    if (c.status === 'resolved') counts.resolved++;
    if (c.status === 'escalated') counts.escalated++;
  });
  var setNum = function(selector, val) {
    var el = document.querySelector(selector);
    if (el) { el.dataset.ne = toNepaliDigits(val); el.dataset.en = val; }
  };
  setNum('.stat-card.total .stat-num', counts.total);
  setNum('.stat-card.progress .stat-num', counts.progress);
  setNum('.stat-card.resolved .stat-num', counts.resolved);
  setNum('.stat-card.rejected .stat-num', counts.escalated);
  updateStatNumbers(document.body.classList.contains('lang-mode-en') ? 'en' : 'ne');
}

/* ── 11. Init ── */
document.addEventListener('DOMContentLoaded', function() {
  checkAuth();
  loadCurrentUser();
  var savedLang = localStorage.getItem('nagarikAawazLang') || 'ne';
  if (savedLang === 'en') setLang('en');
  else updateStatNumbers('ne');
  window.addEventListener('resize', handleResize);
  setupLogout();
  loadMyComplaints();
});