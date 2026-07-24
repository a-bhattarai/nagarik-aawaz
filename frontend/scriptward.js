/* ================================================================
   NAGARIK AAWAZ — scriptward.js
   Ward Dashboard — dynamically scoped to logged-in official's ward
   Sections:
     1.  Config & Helpers
     2.  Language toggle
     3.  Mobile sidebar
     4.  Notifications (dynamic)
     5.  Load current user
     6.  Modal system
     7.  Load complaints
     8.  Render complaints table (with pagination)
     9.  Render escalated section
     10. Update stats
     11. Status change
     12. Escalate complaint
     13. View complaint
     14. Logout
     15. Init
================================================================ */

/* ── 1. Config & Helpers ── */
const API = 'http://localhost:5000/api';
var WARD_NUMBER = null;
var allComplaints = [];
var currentPage = 1;
var pageSize = 5;

function getToken() { return localStorage.getItem('nagarikAawazToken'); }
function authHdr() { return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() }; }
function redirectToLogin() { window.location.href = 'login.html'; }
function isEn() { return document.body.classList.contains('lang-mode-en'); }
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toNe(n) {
  var map = { '0': '०', '1': '१', '2': '२', '3': '३', '4': '४', '5': '५', '6': '६', '7': '७', '8': '८', '9': '९' };
  return String(n).split('').map(function(d) { return map[d] || d; }).join('');
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

function formatDate(dateStr) {
  var d = new Date(dateStr);
  return d.toLocaleDateString(isEn() ? 'en-US' : 'ne-NP', { year: 'numeric', month: 'short', day: 'numeric' });
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
  document.querySelectorAll('.stat-num[data-ne]').forEach(function(el) {
    el.textContent = lang === 'en' ? el.dataset.en : el.dataset.ne;
  });
}

/* ── 3. Mobile sidebar ── */
function toggleSidebar() {
  var sidebar = document.getElementById('sidebar');
  var backdrop = document.getElementById('sbBackdrop');
  var iconOpen = document.getElementById('sbIconOpen');
  var iconClose = document.getElementById('sbIconClose');
  var btn = document.getElementById('menuToggleSb');
  var isOpen = sidebar.classList.toggle('open');
  backdrop.classList.toggle('show', isOpen);
  if (btn) btn.setAttribute('aria-expanded', String(isOpen));
  if (iconOpen) iconOpen.style.display = isOpen ? 'none' : 'block';
  if (iconClose) iconClose.style.display = isOpen ? 'block' : 'none';
}

window.addEventListener('resize', function() {
  if (window.innerWidth > 900) {
    var sb = document.getElementById('sidebar');
    var bd = document.getElementById('sbBackdrop');
    if (sb) sb.classList.remove('open');
    if (bd) bd.classList.remove('show');
  }
});

/* ── 4. Notifications (dynamic) ── */
var notifications = [];
var notifOpen = false;

function addNotification(message, type) {
  var iconClass = {
    'new': 'notif-icon-new',
    'progress': 'notif-icon-progress',
    'resolved': 'notif-icon-resolve',
    'escalated': 'notif-icon-escalate',
    'greeting': 'notif-icon-greeting'
  };
  var iconPaths = {
    'new': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    'progress': '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    'resolved': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    'escalated': '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>',
    'greeting': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'
  };

  notifications.unshift({ message: message, type: type, time: new Date().toISOString(), read: false });
  if (notifications.length > 20) notifications.pop();
  renderNotifications();
  showNotifDot();
}

function renderNotifications() {
  var list = document.getElementById('notifList');
  if (!list) return;

  var iconClass = {
    'new': 'notif-icon-new',
    'progress': 'notif-icon-progress',
    'resolved': 'notif-icon-resolve',
    'escalated': 'notif-icon-escalate',
    'greeting': 'notif-icon-greeting'
  };
  var iconPaths = {
    'new': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    'progress': '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    'resolved': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    'escalated': '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>',
    'greeting': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'
  };

  if (!notifications.length) {
    list.innerHTML = '<div class="notif-empty"><span data-lang="ne">कुनै सूचना छैन</span><span data-lang="en">No notifications</span></div>';
    return;
  }

  list.innerHTML = notifications.map(function(n) {
    var unreadClass = n.read ? '' : 'unread';
    return '<div class="notif-item ' + unreadClass + '">' +
      '<div class="notif-icon ' + (iconClass[n.type] || 'notif-icon-new') + '">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      (iconPaths[n.type] || iconPaths.new) +
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
  var unread = notifications.filter(function(n) { return !n.read; });
  if (dot) dot.style.display = unread.length > 0 ? 'block' : 'none';
}

function toggleNotifPanel() {
  var panel = document.getElementById('notifPanel');
  if (!panel) return;
  notifOpen = !notifOpen;
  panel.style.display = notifOpen ? 'block' : 'none';
  var btn = document.getElementById('notifBtn');
  if (btn) btn.setAttribute('aria-expanded', String(notifOpen));
}

function markAllRead() {
  notifications.forEach(function(n) { n.read = true; });
  renderNotifications();
  showNotifDot();
}

// Click outside to close
document.addEventListener('click', function(e) {
  var wrapper = document.querySelector('.notif-wrapper');
  if (notifOpen && wrapper && !wrapper.contains(e.target)) {
    document.getElementById('notifPanel').style.display = 'none';
    notifOpen = false;
  }
});

/* ── 5. Load current user ── */
async function loadCurrentUser() {
  var token = getToken();
  if (!token) { redirectToLogin(); return; }
  try {
    var res = await fetch(API + '/auth/me', { headers: { 'Authorization': 'Bearer ' + token } });
    if (res.status === 401) { redirectToLogin(); return; }
    var data = await res.json();
    var user = data.user || data;
    WARD_NUMBER = Number(user.ward);
    
    var initials = user.fullName.split(' ').map(function(w) { return w[0]; }).join('').slice(0, 2);
    
    var el;
    el = document.getElementById('userAvatarWard');
    if (el) el.textContent = initials;
    
    document.querySelectorAll('.uname[data-lang="ne"]').forEach(function(e) { e.textContent = user.fullName; });
    document.querySelectorAll('.uname[data-lang="en"]').forEach(function(e) { e.textContent = user.fullName; });
    
    el = document.getElementById('userWardTitleNe');
    if (el) el.textContent = 'वडा अध्यक्ष, वडा नं. ' + toNe(user.ward);
    
    el = document.getElementById('userWardTitleEn');
    if (el) el.textContent = 'Ward Chair, Ward ' + user.ward;
    
    var h2Ne = document.querySelector('.page-title h2[data-lang="ne"]');
    var h2En = document.querySelector('.page-title h2[data-lang="en"]');
    if (h2Ne) h2Ne.textContent = 'वडा नं. ' + toNe(user.ward) + ' — गुनासो व्यवस्थापन';
    if (h2En) h2En.textContent = 'Ward ' + user.ward + ' — Complaint Management';
    
    // Add greeting notification
    addNotification(isEn() ? 'Welcome back, ' + user.fullName : user.fullName + ', स्वागत छ', 'greeting');
    
    loadComplaints();
  } catch (err) { console.error('loadCurrentUser failed:', err); }
}

/* ── 6. Modal system ── */
var MODAL_CONTENT = {
  escalated: { title_ne: 'महानगरमा पठाइएका गुनासोहरू', title_en: 'Complaints Escalated to Metro' },
  budget: { title_ne: 'वडा बजेट', title_en: 'Ward Budget' },
  reports: { title_ne: 'प्रतिवेदनहरू', title_en: 'Reports' },
  settings: { title_ne: 'सेटिङ', title_en: 'Settings' }
};

async function openModal(key) {
  var overlay = document.getElementById('modalOverlay');
  var en = document.body.classList.contains('lang-mode-en');
  if (!overlay) return;
  
  document.getElementById('modalTitle').textContent = en ? MODAL_CONTENT[key].title_en : MODAL_CONTENT[key].title_ne;
  var bodyEl = document.getElementById('modalBody');
  bodyEl.innerHTML = '<p style="color:var(--gray);">' + (en ? 'Loading...' : 'लोड हुँदैछ...') + '</p>';
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  if (key === 'escalated') {
    try {
      var res = await fetch(API + '/complaints', { headers: authHdr() });
      var data = await res.json();
      var complaints = data.complaints || [];
      var escalated = complaints.filter(function(c) { 
        return c.location && c.location.ward === WARD_NUMBER && c.status === 'escalated'; 
      });
      
      if (escalated.length) {
        bodyEl.innerHTML = escalated.map(function(c) {
          return '<div class="modal-item">' +
            '<div class="modal-item-icon" style="background:var(--purple-bg);color:var(--purple);">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>' +
              '</svg>' +
            '</div>' +
            '<div class="modal-item-body">' +
              '<h4>' + escapeHtml(c.title) + '</h4>' +
              '<p>' + escapeHtml(c.location ? c.location.landmark || '—' : '—') + '</p>' +
              '<div style="font-size:0.72rem;color:var(--gray);margin-top:4px;">' + (en ? 'Escalated to Metro' : 'महानगरमा पठाइयो') + '</div>' +
            '</div>' +
          '</div>';
        }).join('');
      } else {
        bodyEl.innerHTML = '<p style="color:var(--gray);text-align:center;padding:20px;">' + 
          (en ? 'No complaints escalated yet.' : 'हालसम्म कुनै गुनासो एस्कलेट भएको छैन।') + '</p>';
      }
    } catch (e) { bodyEl.innerHTML = '<p style="color:var(--error);">' + (en ? 'Failed to load.' : 'लोड गर्न असफल।') + '</p>'; }

  } else if (key === 'budget') {
    try {
      var bRes = await fetch(API + '/budgets?ward=' + WARD_NUMBER);
      var bData = await bRes.json();
      var budget = (bData.budgets && bData.budgets.length > 0) ? bData.budgets[0] : null;
      
      if (budget) {
        var pct = budget.allocatedAmount > 0 ? Math.round((budget.spentAmount / budget.allocatedAmount) * 100) : 0;
        var remaining = budget.allocatedAmount - budget.spentAmount;
        bodyEl.innerHTML = '<div style="display:flex;flex-direction:column;gap:14px;">' +
          '<div style="background:var(--green-light);border:1px solid var(--green-accent);border-radius:8px;padding:14px;">' +
            '<div style="font-weight:700;font-size:1.1rem;color:var(--green-deep);">' + 
              (en ? 'Ward ' + WARD_NUMBER + ' Budget' : 'वडा ' + toNe(WARD_NUMBER) + ' बजेट') + 
            '</div>' +
            '<div style="font-size:0.8rem;color:var(--gray);">' + 
              (en ? 'Fiscal Year: ' + budget.fiscalYear : 'आ.व. ' + budget.fiscalYear) + 
            '</div>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
            '<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;">' +
              '<div style="font-size:0.7rem;color:var(--gray);text-transform:uppercase;font-weight:600;">' + 
                (en ? 'Allocated' : 'विनियोजित') + 
              '</div>' +
              '<div style="font-weight:800;font-size:1.1rem;color:var(--ink);">रु. ' + 
                (budget.allocatedAmount / 100000).toFixed(1) + ' लाख' + 
              '</div>' +
            '</div>' +
            '<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;">' +
              '<div style="font-size:0.7rem;color:var(--gray);text-transform:uppercase;font-weight:600;">' + 
                (en ? 'Spent' : 'खर्च') + 
              '</div>' +
              '<div style="font-weight:800;font-size:1.1rem;color:var(--warning);">रु. ' + 
                (budget.spentAmount / 100000).toFixed(1) + ' लाख' + 
              '</div>' +
            '</div>' +
          '</div>' +
          '<div>' +
            '<div style="font-size:0.75rem;font-weight:600;color:var(--gray);margin-bottom:4px;">' + 
              (en ? 'Utilization' : 'उपयोग') + 
            '</div>' +
            '<div style="height:8px;background:var(--border);border-radius:999px;overflow:hidden;">' +
              '<div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,var(--green-deep),var(--green-accent));border-radius:999px;"></div>' +
            '</div>' +
            '<div style="text-align:right;font-size:0.8rem;font-weight:700;color:var(--green-deep);margin-top:3px;">' + pct + '%</div>' +
          '</div>' +
          '<p style="font-size:0.78rem;color:var(--gray);">' + 
            (en ? 'Remaining: रु. ' + (remaining / 100000).toFixed(1) + ' lakh' : 
            'बाँकी: रु. ' + (remaining / 100000).toFixed(1) + ' लाख') + 
          '</p>' +
        '</div>';
      } else {
        bodyEl.innerHTML = '<p style="color:var(--gray);text-align:center;padding:20px;">' + 
          (en ? 'No budget allocated for Ward ' + WARD_NUMBER + ' yet.' : 
          'वडा ' + toNe(WARD_NUMBER) + ' को लागि हालसम्म बजेट विनियोजन भएको छैन।') + '</p>';
      }
    } catch (e) { bodyEl.innerHTML = '<p style="color:var(--error);">' + (en ? 'Failed to load budget.' : 'बजेट लोड गर्न असफल।') + '</p>'; }

  } else if (key === 'reports') {
    try {
      var rRes = await fetch(API + '/complaints', { headers: authHdr() });
      var rData = await rRes.json();
      var rComplaints = rData.complaints || [];
      var wardComp = rComplaints.filter(function(c) { return c.location && c.location.ward === WARD_NUMBER; });
      var resolved = wardComp.filter(function(c) { return c.status === 'resolved'; }).length;
      var pending = wardComp.filter(function(c) { return c.status === 'pending'; }).length;
      var progress = wardComp.filter(function(c) { return c.status === 'in-progress'; }).length;
      var escalated = wardComp.filter(function(c) { return c.status === 'escalated'; }).length;
      
      bodyEl.innerHTML = 
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">' +
          '<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;text-align:center;">' +
            '<div style="font-size:1.2rem;font-weight:800;color:var(--ink);">' + wardComp.length + '</div>' +
            '<div style="font-size:0.72rem;color:var(--gray);">' + (en ? 'Total Complaints' : 'कुल गुनासो') + '</div>' +
          '</div>' +
          '<div style="background:var(--green-light);border:1px solid var(--green-accent);border-radius:8px;padding:12px;text-align:center;">' +
            '<div style="font-size:1.2rem;font-weight:800;color:var(--green-deep);">' + resolved + '</div>' +
            '<div style="font-size:0.72rem;color:var(--gray);">' + (en ? 'Resolved' : 'समाधान') + '</div>' +
          '</div>' +
          '<div style="background:var(--warning-bg);border:1px solid var(--warning);border-radius:8px;padding:12px;text-align:center;">' +
            '<div style="font-size:1.2rem;font-weight:800;color:var(--warning);">' + pending + '</div>' +
            '<div style="font-size:0.72rem;color:var(--gray);">' + (en ? 'Pending Review' : 'समीक्षा बाँकी') + '</div>' +
          '</div>' +
          '<div style="background:var(--info-bg);border:1px solid var(--info);border-radius:8px;padding:12px;text-align:center;">' +
            '<div style="font-size:1.2rem;font-weight:800;color:var(--info);">' + progress + '</div>' +
            '<div style="font-size:0.72rem;color:var(--gray);">' + (en ? 'In Progress' : 'प्रक्रियामा') + '</div>' +
          '</div>' +
        '</div>' +
        '<div style="text-align:center;margin-top:8px;">' +
          '<span style="background:var(--purple-bg);color:var(--purple);padding:6px 14px;border-radius:999px;font-size:0.78rem;font-weight:600;display:inline-block;">' +
            (en ? 'Escalated to Metro: ' + escalated : 'महानगरमा पठाइएका: ' + toNe(escalated)) +
          '</span>' +
        '</div>';
    } catch (e) { bodyEl.innerHTML = '<p style="color:var(--error);">' + (en ? 'Failed to load.' : 'लोड गर्न असफल।') + '</p>'; }

  } else if (key === 'settings') {
    bodyEl.innerHTML = 
      '<div class="settings-row">' +
        '<div><div class="settings-label">' + (en ? 'Email Notifications' : 'इमेल सूचना') + '</div>' +
        '<div class="settings-sub">' + (en ? 'Get emails for new complaints' : 'नयाँ गुनासोको लागि इमेल') + '</div></div>' +
        '<label class="switch"><input type="checkbox" checked><span class="switch-slider"></span></label>' +
      '</div>' +
      '<div class="settings-row">' +
        '<div><div class="settings-label">' + (en ? 'SMS Alerts' : 'SMS सूचना') + '</div>' +
        '<div class="settings-sub">' + (en ? 'Receive SMS for critical escalations' : 'गम्भीर एस्कलेसनको लागि SMS') + '</div></div>' +
        '<label class="switch"><input type="checkbox"><span class="switch-slider"></span></label>' +
      '</div>';
  }
}

function closeModal() {
  var overlay = document.getElementById('modalOverlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeModal();
});

/* ── 7. Load complaints ── */
async function loadComplaints() {
  try {
    var res = await fetch(API + '/complaints', { headers: { 'Authorization': 'Bearer ' + getToken() } });
    if (res.status === 401) { redirectToLogin(); return; }
    var data = await res.json();
    allComplaints = data.complaints || [];
    var wardComplaints = allComplaints.filter(function(c) { 
      return c.location && c.location.ward === WARD_NUMBER; 
    });
    renderComplaints(wardComplaints);
    renderEscalatedSection(wardComplaints);
    updateStats(wardComplaints);
  } catch (err) { console.error('Failed to load complaints:', err); }
}

/* ── 8. Render complaints table (with pagination) ── */
function renderComplaints(complaints) {
  var tbody = document.getElementById('tableBody');
  var countEl = document.getElementById('complaintCount');
  var paginationInfo = document.getElementById('paginationInfo');
  var pageBtns = document.getElementById('pageBtns');
  
  if (!tbody) return;
  
  var total = complaints.length;
  var totalPages = Math.ceil(total / pageSize) || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  
  var start = (currentPage - 1) * pageSize;
  var end = Math.min(start + pageSize, total);
  var pageItems = complaints.slice(start, end);
  
  // Update count
  var en = isEn();
  if (countEl) {
    countEl.textContent = en ? total + ' complaints' : toNe(total) + ' गुनासोहरू';
  }
  
  // Update pagination info
  if (paginationInfo) {
    var startNum = total > 0 ? start + 1 : 0;
    paginationInfo.innerHTML = 
      '<span data-lang="ne">' + toNe(total) + ' मध्ये ' + toNe(startNum) + '–' + toNe(end) + ' देखाइँदै</span>' +
      '<span data-lang="en">Showing ' + startNum + '–' + end + ' of ' + total + '</span>';
  }
  
  // Update page buttons
  if (pageBtns) {
    var btns = '';
    for (var i = 1; i <= totalPages; i++) {
      btns += '<button class="page-btn' + (i === currentPage ? ' active' : '') + '" onclick="goToPage(' + i + ')">' + i + '</button>';
    }
    if (totalPages > 1) {
      btns += '<button class="page-btn page-next" onclick="goToPage(' + (currentPage < totalPages ? currentPage + 1 : currentPage) + ')">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
          '<polyline points="9 18 15 12 9 6"/>' +
        '</svg>' +
      '</button>';
    }
    pageBtns.innerHTML = btns;
  }
  
  if (!pageItems.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--gray);">' +
      (en ? 'No complaints in this ward yet.' : 'यस वडामा कुनै गुनासो छैन।') + '</td></tr>';
    return;
  }
  
  tbody.innerHTML = pageItems.map(function(c) {
    var isEsc = c.status === 'escalated';
    var photo = c.photo ? 
      '<img src="' + c.photo + '" class="photo-thumb-img" alt="Photo">' : 
      '<div class="photo-placeholder"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></div>';
    
    var statusControl = isEsc ? 
      '<span class="badge b-escalated"><span class="badge-dot"></span><span data-lang="ne">महानगरमा पठाइयो</span><span data-lang="en">Escalated</span></span>' : 
      '<select class="status-select" onchange="handleStatusChange(this,\'' + c._id + '\')" data-orig-value="' + c.status + '">' +
        '<option value="pending"' + (c.status === 'pending' ? ' selected' : '') + '>समीक्षामा / Pending</option>' +
        '<option value="in-progress"' + (c.status === 'in-progress' ? ' selected' : '') + '>प्रक्रियामा / In Progress</option>' +
        '<option value="resolved"' + (c.status === 'resolved' ? ' selected' : '') + '>समाधान / Resolved</option>' +
      '</select>';
    
    var actions = isEsc ? 
      '<button class="action-btn btn-view" onclick="viewComplaint(\'' + c._id + '\')" title="View"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>' :
      '<button class="action-btn btn-escalate" onclick="escalateComplaint(\'' + c._id + '\')" title="Escalate"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg></button>' +
      '<button class="action-btn btn-view" onclick="viewComplaint(\'' + c._id + '\')" title="View"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>';
    
    var lm = c.location && c.location.landmark ? escapeHtml(c.location.landmark) : '—';
    var wn = c.location ? c.location.ward || '—' : '—';
    var coords = c.location && c.location.lat ? 
      '<div class="cell-coords">' + c.location.lat.toFixed(4) + ', ' + c.location.lng.toFixed(4) + '</div>' : '';
    
    return '<tr data-status="' + c.status + '">' +
      '<td class="cell-id">' + c._id.slice(-5).toUpperCase() + '</td>' +
      '<td class="cell-title-col">' +
        '<div class="cell-title">' + escapeHtml(c.title) + '</div>' +
        '<div class="cell-landmark">' +
          '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' +
          '<span data-lang="ne">' + lm + ', वडा ' + wn + '</span>' +
          '<span data-lang="en">' + lm + ', Ward ' + wn + '</span>' +
        '</div>' +
        coords +
      '</td>' +
      '<td class="cell-desc"><span class="desc-text">' + escapeHtml(c.description) + '</span></td>' +
      '<td class="cell-photo"><div class="photo-thumb-wrap">' + photo + '</div></td>' +
      '<td>' + statusControl + '</td>' +
      '<td><div class="row-actions">' + actions + '</div></td>' +
    '</tr>';
  }).join('');
}

function goToPage(page) {
  currentPage = page;
  var wardComplaints = allComplaints.filter(function(c) { 
    return c.location && c.location.ward === WARD_NUMBER; 
  });
  renderComplaints(wardComplaints);
}

/* ── 9. Render escalated section ── */
function renderEscalatedSection(complaints) {
  var tbody = document.getElementById('escalatedSectionBody');
  var countEl = document.getElementById('escalatedCount');
  if (!tbody) return;
  var en = isEn();
  var escalated = complaints.filter(function(c) { return c.status === 'escalated'; });
  
  if (countEl) {
    countEl.textContent = en ? toNe(escalated.length) + ' escalated' : toNe(escalated.length) + ' एस्कलेट भएका';
  }
  
  if (!escalated.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--gray);">' + 
      (en ? 'No complaints escalated yet.' : 'हालसम्म कुनै गुनासो एस्कलेट भएको छैन।') + '</td></tr>';
    return;
  }
  
  tbody.innerHTML = escalated.map(function(c) {
    return '<tr>' +
      '<td class="cell-id">' + c._id.slice(-5).toUpperCase() + '</td>' +
      '<td class="cell-title-col">' +
        '<div class="cell-title">' + escapeHtml(c.title) + '</div>' +
        '<div class="cell-landmark">' + escapeHtml(c.location ? c.location.landmark || '—' : '—') + '</div>' +
      '</td>' +
      '<td class="cell-desc"><span class="desc-text">' + escapeHtml(c.description) + '</span></td>' +
      '<td><button class="action-btn btn-view" onclick="viewComplaint(\'' + c._id + '\')" title="View">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>' +
          '<circle cx="12" cy="12" r="3"/>' +
        '</svg>' +
      '</button></td>' +
    '</tr>';
  }).join('');
}

/* ── 10. Update stats ── */
function updateStats(complaints) {
  var pending = complaints.filter(function(c) { return c.status === 'pending'; }).length;
  var progress = complaints.filter(function(c) { return c.status === 'in-progress'; }).length;
  var escalated = complaints.filter(function(c) { return c.status === 'escalated'; }).length;
  var resolved = complaints.filter(function(c) { return c.status === 'resolved'; }).length;
  
  function setNum(el, val) { 
    if (!el) return; 
    el.dataset.ne = toNe(val); 
    el.dataset.en = String(val); 
    el.textContent = isEn() ? val : toNe(val); 
  }
  
  setNum(document.querySelector('.s-pending .stat-num'), pending);
  setNum(document.querySelector('.s-field .stat-num'), progress);
  setNum(document.querySelector('.s-escalated .stat-num'), escalated);
  setNum(document.querySelector('.s-resolved .stat-num'), resolved);
}

/* ── 11. Status change ── */
async function handleStatusChange(selectEl, complaintId) {
  var newStatus = selectEl.value;
  var row = selectEl.closest('tr');
  var origValue = selectEl.dataset.origValue || '';
  
  try {
    var res = await fetch(API + '/complaints/' + complaintId + '/status', { 
      method: 'PUT', 
      headers: authHdr(), 
      body: JSON.stringify({ status: newStatus }) 
    });
    
    if (res.status === 401) { redirectToLogin(); return; }
    
    if (res.ok) {
      row.dataset.status = newStatus;
      selectEl.dataset.origValue = newStatus;
      
      // Add notification
      var statusMessages = {
        'pending': isEn() ? 'Complaint is under review' : 'गुनासो समीक्षामा छ',
        'in-progress': isEn() ? 'Complaint is now in progress' : 'गुनासो प्रक्रियामा छ',
        'resolved': isEn() ? 'Complaint has been resolved' : 'गुनासो समाधान भयो'
      };
      addNotification(statusMessages[newStatus] || 'Status updated', newStatus === 'resolved' ? 'resolved' : 'progress');
      
      // Reload to update stats and escalated section
      loadComplaints();
    } else {
      selectEl.value = origValue;
    }
  } catch (err) { 
    console.error('Status update failed:', err); 
    selectEl.value = origValue; 
  }
}

/* ── 12. Escalate complaint ── */
async function escalateComplaint(complaintId) {
  var en = isEn();
  var msg = en ? 
    'Escalate ' + complaintId + ' to Metro City? This cannot be undone.' : 
    complaintId + ' — यो गुनासो महानगरपालिकामा पठाउने हो? यो कार्य फिर्ता हुन सक्दैन।';
  
  if (!confirm(msg)) return;
  
  try {
    var res = await fetch(API + '/complaints/' + complaintId + '/status', { 
      method: 'PUT', 
      headers: authHdr(), 
      body: JSON.stringify({ status: 'escalated' }) 
    });
    
    if (res.status === 401) { redirectToLogin(); return; }
    
    if (res.ok) {
      addNotification(isEn() ? 'Complaint escalated to Metro' : 'गुनासो महानगरमा पठाइयो', 'escalated');
      loadComplaints();
    } else {
      var d = await res.json();
      alert(d.message || (en ? 'Escalation failed.' : 'पठाउन असफल।'));
    }
  } catch (err) { console.error('Escalation failed:', err); }
}

/* ── 13. View complaint ── */
async function viewComplaint(complaintId) {
  try {
    var res = await fetch(API + '/complaints/' + complaintId, { 
      headers: { 'Authorization': 'Bearer ' + getToken() } 
    });
    
    if (res.status === 401) { redirectToLogin(); return; }
    
    var data = await res.json();
    var c = data.complaint;
    var en = isEn();
    
    var LABELS = { 
      'pending': { ne: 'समीक्षामा', en: 'Pending Review' }, 
      'in-progress': { ne: 'प्रक्रियामा', en: 'In Progress' }, 
      'resolved': { ne: 'समाधान भएको', en: 'Resolved' }, 
      'escalated': { ne: 'महानगरमा पठाइयो', en: 'Escalated' } 
    };
    var sl = LABELS[c.status] ? LABELS[c.status][en ? 'en' : 'ne'] : c.status;
    
    document.getElementById('modalTitle').textContent = c._id.slice(-5).toUpperCase() + ' — ' + escapeHtml(c.title);
    document.getElementById('modalBody').innerHTML = 
      '<div style="display:flex;flex-direction:column;gap:16px;">' +
        (c.photo ? 
          '<img src="' + c.photo + '" style="width:100%;max-height:220px;object-fit:cover;border-radius:10px;border:1px solid var(--border);" alt="Photo">' : 
          '<div style="width:100%;height:70px;background:var(--bg);border:1.5px dashed var(--border);border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--gray);font-size:0.82rem;">' + 
            (en ? 'No photo submitted' : 'फोटो छैन') + 
          '</div>'
        ) +
        '<div>' +
          '<div style="font-size:0.66rem;font-weight:700;color:var(--gray);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">' + 
            (en ? 'DESCRIPTION' : 'विवरण') + 
          '</div>' +
          '<p style="font-size:0.87rem;color:var(--gray);line-height:1.7;">' + escapeHtml(c.description) + '</p>' +
        '</div>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
          '<div style="flex:1;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;">' +
            '<div style="font-size:0.66rem;font-weight:700;color:var(--gray);text-transform:uppercase;margin-bottom:4px;">' + (en ? 'WARD' : 'वडा') + '</div>' +
            '<div style="font-weight:700;">' + (en ? 'Ward ' : 'वडा नं. ') + (c.location ? c.location.ward || '—' : '—') + '</div>' +
          '</div>' +
          '<div style="flex:1;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;">' +
            '<div style="font-size:0.66rem;font-weight:700;color:var(--gray);text-transform:uppercase;margin-bottom:4px;">' + (en ? 'STATUS' : 'स्थिती') + '</div>' +
            '<div style="font-weight:700;">' + sl + '</div>' +
          '</div>' +
        '</div>' +
        (c.location && c.location.landmark ? 
          '<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;">' +
            '<div style="font-size:0.66rem;font-weight:700;color:var(--gray);text-transform:uppercase;margin-bottom:4px;">' + (en ? 'LANDMARK' : 'चिनारी स्थान') + '</div>' +
            '<div style="font-weight:600;">' + escapeHtml(c.location.landmark) + '</div>' +
          '</div>' : 
          ''
        ) +
        (c.location && c.location.lat ? 
          '<a href="https://www.openstreetmap.org/?mlat=' + c.location.lat + '&mlon=' + c.location.lng + '&zoom=17" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;font-size:0.8rem;font-weight:600;color:var(--info);text-decoration:none;">' + 
            (en ? 'Open on map' : 'नक्सामा हेर्नुहोस्') + ' (' + c.location.lat.toFixed(4) + ', ' + c.location.lng.toFixed(4) + ')' + 
          '</a>' : 
          ''
        ) +
      '</div>';
    
    document.getElementById('modalOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
  } catch (err) { 
    console.error('Failed to fetch complaint detail:', err); 
  }
}

/* ── 14. Logout ── */
function logoutWard() {
  localStorage.removeItem('nagarikAawazToken');
  localStorage.removeItem('nagarikAawazName');
  localStorage.removeItem('nagarikAawazWard');
  window.location.href = 'login.html';
}

/* ── 15. Init ── */
document.addEventListener('DOMContentLoaded', function() {
  if (!getToken()) { redirectToLogin(); return; }
  
  var savedLang = localStorage.getItem('nagarikAawazLang') || 'ne';
  if (savedLang === 'en') setLang('en'); 
  else updateStatNumbers('ne');
  
  loadCurrentUser();
});