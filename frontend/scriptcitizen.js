/* ================================================================
   NAGARIK AAWAZ — scriptcitizen.js
   Sections:
     1.  Config & Helpers
     2.  Language toggle
     3.  Load current user
     4.  Mobile sidebar
     5.  Notifications (dynamic)
     6.  Modals
     7.  Profile picture
     8.  Logout
     9.  Auth guard
     10. Status badges
     11. Complaint detail view
     12. Delete complaint (30-min window)
     13. Load / render complaints table
     14. Init
================================================================ */

/* ── 1. Config & Helpers ── */
const API = 'http://localhost:5000/api';
const DELETE_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

function getToken() { return localStorage.getItem('nagarikAawazToken'); }
function authHdr()  { return { 'Authorization': 'Bearer ' + getToken() }; }
function isEn()     { return document.body.classList.contains('lang-mode-en'); }
function redirectToLogin() { window.location.href = 'login.html'; }

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toNepaliDigits(n) {
  var map = {'0':'०','1':'१','2':'२','3':'३','4':'४','5':'५','6':'६','7':'७','8':'८','9':'९'};
  return String(n).split('').map(function(d) { return map[d] || d; }).join('');
}

function formatDate(dateStr) {
  var d = new Date(dateStr);
  return d.toLocaleDateString(isEn() ? 'en-US' : 'ne-NP', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

function timeAgo(dateStr) {
  var now = Date.now();
  var diff = now - new Date(dateStr).getTime();
  var minutes = Math.floor(diff / 60000);
  var hours = Math.floor(diff / 3600000);
  var days = Math.floor(diff / 86400000);

  if (minutes < 1) return isEn() ? 'Just now' : 'अहिले';
  if (minutes < 60) return minutes + (isEn() ? 'm ago' : ' मिनेट अघि');
  if (hours < 24) return hours + (isEn() ? 'h ago' : ' घण्टा अघि');
  if (days < 7) return days + (isEn() ? 'd ago' : ' दिन अघि');
  return formatDate(dateStr);
}

/* ── 2. Language toggle ── */
function setLang(lang) {
  document.body.classList.toggle('lang-mode-en', lang === 'en');
  document.getElementById('btn-ne').classList.toggle('active', lang === 'ne');
  document.getElementById('btn-en').classList.toggle('active', lang === 'en');
  localStorage.setItem('nagarikAawazLang', lang);
  updateStatNumbers(lang);
}

function updateStatNumbers(lang) {
  document.querySelectorAll('.stat-num').forEach(function(el) {
    el.textContent = lang === 'en' ? el.dataset.en : el.dataset.ne;
  });
}

/* ── 3. Load current user ── */
async function loadCurrentUser() {
  var token = getToken();
  if (!token) return;

  var storedName = localStorage.getItem('nagarikAawazName');
  var storedWard = localStorage.getItem('nagarikAawazWard');
  if (storedName) updateUIWithUser({ name: storedName, ward: storedWard || '?' });

  try {
    var res = await fetch(API + '/auth/me', { headers: authHdr() });
    if (res.ok) {
      var user = await res.json();
      updateUIWithUser(user);
      localStorage.setItem('nagarikAawazName', user.name);
      localStorage.setItem('nagarikAawazWard', String(user.ward));
    }
  } catch (err) {
    console.log('API fetch failed, using localStorage fallback:', err.message);
  }
}

function updateUIWithUser(user) {
  var initials = user.name.split(' ').map(function(w) { return w[0]; }).join('').slice(0, 2);
  var el;

  el = document.getElementById('userAvatar');       if (el) el.textContent = initials;
  el = document.getElementById('userName');         if (el) el.textContent = user.name;
  el = document.getElementById('userNameEn');       if (el) el.textContent = user.name;
  el = document.getElementById('userWardNe');       if (el) el.textContent = 'वडा नं. ' + toNepaliDigits(user.ward);
  el = document.getElementById('userWardEn');       if (el) el.textContent = 'Ward No. ' + user.ward;
  el = document.getElementById('welcomeHeadingNe'); if (el) el.textContent = 'नमस्ते, ' + user.name + ' जी';
  el = document.getElementById('welcomeHeadingEn'); if (el) el.textContent = 'Welcome back, ' + user.name.split(' ')[0];
  el = document.getElementById('welcomeSubNe');     if (el) el.textContent = 'वडा नं. ' + toNepaliDigits(user.ward) + ' — तपाईंका गुनासोको हालको अवस्था यहाँ हेर्नुहोस्।';
  el = document.getElementById('welcomeSubEn');     if (el) el.textContent = 'Ward ' + user.ward + ' — Here\'s a quick look at the status of your complaints.';
  el = document.getElementById('profileNameInput'); if (el) el.value = user.name;
  el = document.getElementById('profileEmailInput'); if (el && user.email) el.value = user.email;
  el = document.getElementById('profilePhoneInput'); if (el && user.phone) el.value = user.phone;
  el = document.getElementById('profileWardInput'); if (el) el.value = 'वडा नं. ' + toNepaliDigits(user.ward);
  el = document.getElementById('profilePicPreview'); if (el && !el.querySelector('img')) el.textContent = initials;
}

/* ── 4. Mobile sidebar ── */
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

/* ── 5. Notifications (dynamic) ── */
var notifications = [];

function addNotification(message, type) {
  var icons = {
    'submitted': 'notif-submitted',
    'in-progress': 'notif-progress',
    'resolved': 'notif-resolved',
    'escalated': 'notif-escalated',
    'deleted': 'notif-deleted'
  };
  
  var iconPaths = {
    'submitted': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    'in-progress': '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    'resolved': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    'escalated': '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
    'deleted': '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>'
  };

  notifications.unshift({
    message: message,
    type: type,
    time: new Date().toISOString()
  });

  // Keep only last 20 notifications
  if (notifications.length > 20) notifications.pop();
  
  renderNotifications();
  showNotifDot();
}

function renderNotifications() {
  var list = document.getElementById('notifList');
  var iconClass = {
    'submitted': 'notif-submitted',
    'in-progress': 'notif-progress',
    'resolved': 'notif-resolved',
    'escalated': 'notif-escalated',
    'deleted': 'notif-deleted'
  };
  
  var iconPaths = {
    'submitted': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    'in-progress': '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    'resolved': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    'escalated': '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
    'deleted': '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>'
  };

  if (!notifications.length) {
    list.innerHTML = '<div class="notif-empty"><span data-lang="ne">कुनै सूचना छैन</span><span data-lang="en">No notifications</span></div>';
    return;
  }

  list.innerHTML = notifications.map(function(n) {
    return '<div class="notif-item">' +
      '<div class="notif-icon ' + (iconClass[n.type] || 'notif-info') + '">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          (iconPaths[n.type] || iconPaths.submitted) +
        '</svg>' +
      '</div>' +
      '<div class="notif-content">' +
        '<p>' + escapeHtml(n.message) + '</p>' +
        '<span class="notif-time">' + timeAgo(n.time) + '</span>' +
      '</div>' +
    '</div>';
  }).join('');
}

function showNotifDot() {
  var dot = document.getElementById('notifDot');
  if (notifications.length > 0) {
    dot.style.display = 'block';
  } else {
    dot.style.display = 'none';
  }
}

function toggleNotifications(e) {
  if (e) e.stopPropagation();
  var dropdown = document.getElementById('notifDropdown');
  dropdown.classList.toggle('open');
  // Mark as read when opened
  if (dropdown.classList.contains('open')) {
    document.getElementById('notifDot').style.display = 'none';
  }
}

function closeNotifications() {
  document.getElementById('notifDropdown').classList.remove('open');
}

document.addEventListener('click', function(e) {
  var wrap = document.getElementById('notifWrap');
  if (wrap && !wrap.contains(e.target)) closeNotifications();
});

// Listen for complaint status changes
function onComplaintStatusChange(complaintId, newStatus, title) {
  var statusMessages = {
    'pending': isEn() ? 'Your complaint "' + title + '" is under review' : 'तपाईंको गुनासो "' + title + '" समीक्षामा छ',
    'in-progress': isEn() ? 'Your complaint "' + title + '" is now in progress' : 'तपाईंको गुनासो "' + title + '" प्रक्रियामा छ',
    'resolved': isEn() ? 'Your complaint "' + title + '" has been resolved' : 'तपाईंको गुनासो "' + title + '" समाधान भयो',
    'escalated': isEn() ? 'Your complaint "' + title + '" has been escalated' : 'तपाईंको गुनासो "' + title + '" बढाइयो'
  };
  
  var msg = statusMessages[newStatus] || (isEn() ? 'Complaint "' + title + '" status updated to ' + newStatus : 'गुनासो "' + title + '" को स्थिती ' + newStatus + ' मा परिवर्तन भयो');
  addNotification(msg, newStatus);
}

/* ── 6. Modals ── */
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(function(m) { m.classList.remove('open'); });
    closeNotifications();
  }
});

/* ── 7. Profile picture ── */
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

/* ── 8. Logout ── */
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

/* ── 9. Auth guard ── */
function checkAuth() {
  if (!getToken()) redirectToLogin();
}

/* ── 10. Status badges ── */
var STATUS_BADGE = {
  'pending':     { cls: 'b-review',   ne: 'समीक्षामा',    en: 'Under Review' },
  'in-progress': { cls: 'b-progress', ne: 'प्रक्रियामा',  en: 'In Progress' },
  'resolved':    { cls: 'b-resolved', ne: 'समाधान भयो',  en: 'Resolved' },
  'escalated':   { cls: 'b-rejected', ne: 'एस्कलेट भयो', en: 'Escalated' }
};

function badgeHTML(status) {
  var s = STATUS_BADGE[status] || STATUS_BADGE.pending;
  return '<span class="badge ' + s.cls + '"><span class="badge-dot"></span><span data-lang="ne">' + s.ne + '</span><span data-lang="en">' + s.en + '</span></span>';
}

/* ── 11. Complaint detail view ── */
async function viewComplaintDetail(id) {
  var en = isEn();
  var body = document.getElementById('complaintViewBody');
  var title = document.getElementById('complaintViewTitle');
  title.textContent = en ? 'Loading...' : 'लोड हुँदैछ...';
  body.innerHTML = '';
  openModal('complaintViewOverlay');

  try {
    var res = await fetch(API + '/complaints/' + id, { headers: authHdr() });
    var data = await res.json();
    var c = data.complaint;
    var s = STATUS_BADGE[c.status] || STATUS_BADGE.pending;

    title.textContent = 'NA-' + c._id.slice(-5).toUpperCase() + ' — ' + escapeHtml(c.title);
    body.innerHTML =
      (c.photo
        ? '<img src="' + c.photo + '" style="width:100%;max-height:220px;object-fit:cover;border-radius:10px;border:1px solid var(--border);" alt="Photo">'
        : '<div style="width:100%;height:80px;background:var(--bg);border:1.5px dashed var(--border);border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--gray);font-size:0.82rem;">' + (en ? 'No photo submitted' : 'फोटो छैन') + '</div>') +
      '<div style="margin-top:14px;"><div style="font-size:0.68rem;font-weight:700;color:var(--gray);text-transform:uppercase;margin-bottom:4px;">' + (en ? 'DESCRIPTION' : 'विवरण') + '</div><p style="font-size:0.88rem;color:var(--ink);line-height:1.6;">' + escapeHtml(c.description) + '</p></div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;"><div style="flex:1;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px;"><div style="font-size:0.66rem;font-weight:700;color:var(--gray);text-transform:uppercase;">' + (en ? 'WARD' : 'वडा') + '</div><div style="font-weight:700;">' + (c.location ? c.location.ward : '—') + '</div></div><div style="flex:1;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px;"><div style="font-size:0.66rem;font-weight:700;color:var(--gray);text-transform:uppercase;">' + (en ? 'STATUS' : 'स्थिती') + '</div><div style="font-weight:700;">' + (en ? s.en : s.ne) + '</div></div></div>' +
      (c.location && c.location.landmark ? '<div style="margin-top:10px;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px;"><div style="font-size:0.66rem;font-weight:700;color:var(--gray);text-transform:uppercase;">' + (en ? 'LANDMARK' : 'चिनारी स्थान') + '</div><div style="font-weight:600;">' + escapeHtml(c.location.landmark) + '</div></div>' : '') +
      (c.location && c.location.lat ? '<a href="https://www.openstreetmap.org/?mlat=' + c.location.lat + '&mlon=' + c.location.lng + '&zoom=17" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;margin-top:12px;font-size:0.82rem;font-weight:600;color:var(--info);">' + (en ? 'Open on map' : 'नक्सामा हेर्नुहोस्') + ' (' + c.location.lat.toFixed(4) + ', ' + c.location.lng.toFixed(4) + ')</a>' : '');
  } catch (err) {
    body.innerHTML = '<p style="color:var(--error);">' + (en ? 'Failed to load complaint.' : 'गुनासो लोड गर्न असफल।') + '</p>';
  }
}

/* ── 12. Delete complaint (30-min window) ── */
function isWithinDeleteWindow(createdAt) {
  return (Date.now() - new Date(createdAt).getTime()) <= DELETE_WINDOW_MS;
}

async function deleteComplaint(id) {
  var en = isEn();
  var msg = en
    ? 'Delete this complaint? This cannot be undone.'
    : 'यो गुनासो मेटाउने हो? यो कार्य फिर्ता हुन सक्दैन।';
  if (!confirm(msg)) return;

  try {
    var res = await fetch(API + '/complaints/' + id, {
      method: 'DELETE',
      headers: authHdr()
    });

    if (res.status === 401) { redirectToLogin(); return; }

    if (res.status === 403) {
      alert(en
        ? 'This complaint can no longer be deleted (30-minute window has passed).'
        : '३० मिनेटको समय सकिएकोले यो गुनासो अब मेटाउन सकिँदैन।');
      loadMyComplaints();
      return;
    }

    if (res.ok) {
      // Get complaint title for notification
      var title = localStorage.getItem('deletedComplaintTitle_' + id) || 'Complaint';
      addNotification(isEn() ? 'Complaint "' + title + '" has been deleted' : 'गुनासो "' + title + '" मेटाइयो', 'deleted');
      loadMyComplaints();
    } else {
      alert(en ? 'Failed to delete complaint.' : 'गुनासो मेटाउन असफल भयो।');
    }
  } catch (err) {
    console.error('Delete failed:', err);
    alert(en ? 'Something went wrong. Please try again.' : 'समस्या भयो। फेरि प्रयास गर्नुहोस्।');
  }
}

/* ── 13. Load / render complaints table ── */
function loadMyComplaints() {
  fetch(API + '/complaints', { headers: authHdr() })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      var complaints = data.complaints || [];
      renderComplaintsTable(complaints);
      updateStatCards(complaints);
      // Check for status changes
      checkStatusChanges(complaints);
    })
    .catch(function(err) { console.error('Failed to load complaints:', err); });
}

// Track previous statuses to detect changes
var previousStatuses = {};

function checkStatusChanges(complaints) {
  complaints.forEach(function(c) {
    var key = c._id;
    var prev = previousStatuses[key];
    if (prev && prev !== c.status) {
      // Status changed!
      onComplaintStatusChange(c._id, c.status, c.title);
    }
    previousStatuses[key] = c.status;
  });
}

function renderComplaintsTable(complaints) {
  var tbody = document.getElementById('complaintsBody');
  var en = isEn();

  if (!complaints.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--gray);"><span data-lang="ne">तपाईंले हालसम्म कुनै गुनासो पेश गर्नुभएको छैन।</span><span data-lang="en">You haven\'t filed any complaints yet.</span></td></tr>';
    return;
  }

  tbody.innerHTML = complaints.map(function(c) {
    var deleteBtn = isWithinDeleteWindow(c.createdAt)
      ? '<button class="action-btn btn-delete" aria-label="Delete complaint" title="' + (en ? 'Delete (available for 30 min after filing)' : 'मेटाउनुहोस् (दर्ता गरेको ३० मिनेटसम्म मात्र)') + '" onclick="deleteComplaint(\'' + c._id + '\')">' +
          '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>' +
          '</svg>' +
        '</button>'
      : '';

    // Store title for delete notification
    localStorage.setItem('deletedComplaintTitle_' + c._id, c.title);

    return '<tr>' +
      '<td class="cell-id">NA-' + c._id.slice(-8).toUpperCase() + '</td>' +
      '<td class="cell-title-col"><div class="cell-title">' + escapeHtml(c.title) + '</div><div class="cell-sub">' + (en ? 'Ward ' : 'वडा ') + c.location.ward + (c.location.landmark ? ', ' + escapeHtml(c.location.landmark) : '') + '</div></td>' +
      '<td class="cell-date">' + formatDate(c.createdAt) + '</td>' +
      '<td>' + badgeHTML(c.status) + '</td>' +
      '<td class="cell-action"><div class="row-actions">' +
        '<button class="action-btn" aria-label="View complaint" onclick="viewComplaintDetail(\'' + c._id + '\')">' +
          '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' +
        '</button>' +
        deleteBtn +
      '</div></td>' +
    '</tr>';
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
  updateStatNumbers(isEn() ? 'en' : 'ne');
}

/* ── 14. Init ── */
document.addEventListener('DOMContentLoaded', function() {
  checkAuth();
  loadCurrentUser();
  var savedLang = localStorage.getItem('nagarikAawazLang') || 'ne';
  if (savedLang === 'en') setLang('en');
  else updateStatNumbers('ne');
  window.addEventListener('resize', handleResize);
  setupLogout();
  loadMyComplaints();
  
  // Simulate a notification on load (remove this in production)
  setTimeout(function() {
    addNotification(isEn() ? 'Welcome to Nagarik Aawaz Citizen Portal' : 'नागरिक आवाज नागरिक पोर्टलमा स्वागत छ', 'submitted');
  }, 1000);
});