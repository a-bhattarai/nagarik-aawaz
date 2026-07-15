/* ================================================================
   NAGARIK AAWAZ — dashboard-ward.js
   Ward Dashboard — dynamically scoped to logged-in official's ward
================================================================ */

const API = 'http://localhost:5000/api';
var WARD_NUMBER = null;

function getToken() { return localStorage.getItem('nagarikAawazToken'); }
function authHdr() { return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() }; }
function redirectToLogin() { window.location.href = 'login.html'; }

/* ── Language ── */
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

function toNe(n) {
  var map = {'0':'०','1':'१','2':'२','3':'३','4':'४','5':'५','6':'६','7':'७','8':'८','9':'९'};
  return String(n).split('').map(function(d) { return map[d] || d; }).join('');
}

/* ── Mobile sidebar ── */
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

/* ── Notifications ── */
var notifOpen = false;
function toggleNotifPanel() {
  var panel = document.getElementById('notifPanel');
  if (!panel) return;
  notifOpen = !notifOpen;
  panel.style.display = notifOpen ? 'block' : 'none';
  var btn = document.getElementById('notifBtn');
  if (btn) btn.setAttribute('aria-expanded', String(notifOpen));
}
function markAllRead() {
  document.querySelectorAll('.notif-item.unread').forEach(function(el) { el.classList.remove('unread'); });
  var dot = document.getElementById('notifDot');
  if (dot) dot.style.display = 'none';
}

/* ── Load current user ── */
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
    loadComplaints();
  } catch (err) { console.error('loadCurrentUser failed:', err); }
}

/* ── Modal ── */
var MODAL_CONTENT = {
  escalated: { title_ne: 'महानगरमा पठाइएका गुनासोहरू', title_en: 'Complaints Escalated to Metro' },
  budget:    { title_ne: 'वडा बजेट', title_en: 'Ward Budget' },
  reports:   { title_ne: 'प्रतिवेदनहरू', title_en: 'Reports' },
  settings:  { title_ne: 'सेटिङ', title_en: 'Settings' }
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
      var escalated = complaints.filter(function(c) { return c.location && c.location.ward === WARD_NUMBER && c.status === 'escalated'; });
      if (escalated.length) {
        bodyEl.innerHTML = escalated.map(function(c) {
          return '<div style="padding:12px;border:1px solid var(--border);border-radius:8px;margin-bottom:10px;"><div style="font-weight:700;font-size:0.85rem;color:var(--green-deep);">' + c._id.slice(-5).toUpperCase() + '</div><div style="font-weight:600;margin:4px 0;">' + escapeHtml(c.title) + '</div><div style="font-size:0.82rem;color:var(--gray);">' + escapeHtml(c.location ? c.location.landmark || '—' : '—') + '</div></div>';
        }).join('');
      } else {
        bodyEl.innerHTML = '<p style="color:var(--gray);">' + (en ? 'No complaints escalated yet.' : 'हालसम्म कुनै एस्कलेट भएको छैन।') + '</p>';
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
          '<div style="font-weight:700;font-size:1.1rem;color:var(--green-deep);">' + (en ? 'Ward ' + WARD_NUMBER + ' Budget' : 'वडा ' + toNe(WARD_NUMBER) + ' बजेट') + '</div>' +
          '<div style="font-size:0.8rem;color:var(--gray);">' + (en ? 'Fiscal Year: ' + budget.fiscalYear : 'आ.व. ' + budget.fiscalYear) + '</div></div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
          '<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;"><div style="font-size:0.7rem;color:var(--gray);text-transform:uppercase;font-weight:600;">' + (en ? 'Allocated' : 'विनियोजित') + '</div><div style="font-weight:800;font-size:1.1rem;color:var(--ink);">रु. ' + (budget.allocatedAmount / 100000).toFixed(1) + ' लाख</div></div>' +
          '<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;"><div style="font-size:0.7rem;color:var(--gray);text-transform:uppercase;font-weight:600;">' + (en ? 'Spent' : 'खर्च') + '</div><div style="font-weight:800;font-size:1.1rem;color:var(--warning);">रु. ' + (budget.spentAmount / 100000).toFixed(1) + ' लाख</div></div></div>' +
          '<div><div style="font-size:0.75rem;font-weight:600;color:var(--gray);margin-bottom:4px;">' + (en ? 'Utilization' : 'उपयोग') + '</div>' +
          '<div style="height:8px;background:var(--border);border-radius:999px;overflow:hidden;"><div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,var(--green-deep),var(--green-accent));border-radius:999px;"></div></div>' +
          '<div style="text-align:right;font-size:0.8rem;font-weight:700;color:var(--green-deep);margin-top:3px;">' + pct + '%</div></div>' +
          '<p style="font-size:0.78rem;color:var(--gray);">' + (en ? 'Remaining: रु. ' + (remaining / 100000).toFixed(1) + ' lakh' : 'बाँकी: रु. ' + (remaining / 100000).toFixed(1) + ' लाख') + '</p></div>';
      } else {
        bodyEl.innerHTML = '<p style="color:var(--gray);text-align:center;padding:20px;">' + (en ? 'No budget allocated for Ward ' + WARD_NUMBER + ' yet.' : 'वडा ' + toNe(WARD_NUMBER) + ' को लागि हालसम्म बजेट विनियोजन भएको छैन।') + '</p>';
      }
    } catch (e) { bodyEl.innerHTML = '<p style="color:var(--error);">' + (en ? 'Failed to load budget.' : 'बजेट लोड गर्न असफल।') + '</p>'; }

  } else if (key === 'reports') {
    try {
      var res2 = await fetch(API + '/complaints', { headers: authHdr() });
      var data2 = await res2.json();
      var complaints2 = data2.complaints || [];
      var wardComp = complaints2.filter(function(c) { return c.location && c.location.ward === WARD_NUMBER; });
      var resolved = wardComp.filter(function(c) { return c.status === 'resolved'; }).length;
      bodyEl.innerHTML = '<p style="margin-bottom:10px;">' + (en ? 'Quick summary for Ward ' + WARD_NUMBER + ':' : 'वडा ' + toNe(WARD_NUMBER) + ' को छोटो सारांश:') + '</p><div>' + (en ? 'Total complaints' : 'कुल गुनासो') + ': <strong>' + wardComp.length + '</strong></div><div>' + (en ? 'Resolved' : 'समाधान भएका') + ': <strong>' + resolved + '</strong></div><p style="margin-top:14px;color:var(--gray);font-size:0.82rem;">' + (en ? 'Downloadable PDF reports coming soon.' : 'डाउनलोड योग्य PDF प्रतिवेदन चाँडै आउनेछ।') + '</p>';
    } catch (e) { bodyEl.innerHTML = '<p style="color:var(--error);">' + (en ? 'Failed to load.' : 'लोड गर्न असफल।') + '</p>'; }

  } else {
    bodyEl.innerHTML = '<p style="color:var(--gray);">' + (en ? 'Settings coming soon.' : 'सेटिङ चाँडै आउनेछ।') + '</p>';
  }
}

function closeModal() {
  var overlay = document.getElementById('modalOverlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}

/* ── Filter ── */
function applyFilters() {
  var search = (document.getElementById('searchInput') ? document.getElementById('searchInput').value : '').toLowerCase();
  var statusVal = document.getElementById('statusFilter') ? document.getElementById('statusFilter').value : '';
  var visible = 0;
  document.querySelectorAll('#tableBody tr').forEach(function(row) {
    var text = row.textContent.toLowerCase();
    var status = row.dataset.status || '';
    var show = (!search || text.indexOf(search) !== -1) && (!statusVal || status === statusVal);
    row.style.display = show ? '' : 'none';
    if (show) visible++;
  });
  var countEl = document.getElementById('complaintCount');
  if (countEl) {
    var en = document.body.classList.contains('lang-mode-en');
    countEl.textContent = en ? visible + ' complaints' : toNe(visible) + ' गुनासोहरू';
  }
}

function clearFilters() {
  var s = document.getElementById('searchInput');
  var f = document.getElementById('statusFilter');
  if (s) s.value = '';
  if (f) f.value = '';
  applyFilters();
}

/* ── Status change ── */
async function handleStatusChange(selectEl, complaintId) {
  var newStatus = selectEl.value;
  var row = selectEl.closest('tr');
  var origValue = selectEl.dataset.origValue || '';
  try {
    var res = await fetch(API + '/complaints/' + complaintId + '/status', { method: 'PUT', headers: authHdr(), body: JSON.stringify({ status: newStatus }) });
    if (res.status === 401) { redirectToLogin(); return; }
    if (res.ok) { row.dataset.status = newStatus; selectEl.dataset.origValue = newStatus; }
    else { selectEl.value = origValue; }
  } catch (err) { console.error('Status update failed:', err); selectEl.value = origValue; }
}

/* ── Escalate ── */
async function escalateComplaint(complaintId) {
  var en = document.body.classList.contains('lang-mode-en');
  var msg = en ? 'Escalate ' + complaintId + ' to Metro City? This cannot be undone.' : complaintId + ' — यो गुनासो महानगरपालिकामा पठाउने हो? यो कार्य फिर्ता हुन सक्दैन।';
  if (!confirm(msg)) return;
  try {
    var res = await fetch(API + '/complaints/' + complaintId + '/status', { method: 'PUT', headers: authHdr(), body: JSON.stringify({ status: 'escalated' }) });
    if (res.status === 401) { redirectToLogin(); return; }
    if (res.ok) { location.reload(); }
    else { var d = await res.json(); alert(d.message || 'Escalation failed.'); }
  } catch (err) { console.error('Escalation failed:', err); }
}

/* ── View complaint ── */
async function viewComplaint(complaintId) {
  try {
    var res = await fetch(API + '/complaints/' + complaintId, { headers: { 'Authorization': 'Bearer ' + getToken() } });
    if (res.status === 401) { redirectToLogin(); return; }
    var data = await res.json();
    var c = data.complaint;
    var en = document.body.classList.contains('lang-mode-en');
    var LABELS = { 'pending': { ne: 'समीक्षामा', en: 'Pending Review' }, 'in-progress': { ne: 'प्रक्रियामा', en: 'In Progress' }, 'resolved': { ne: 'समाधान भएको', en: 'Resolved' }, 'escalated': { ne: 'महानगरमा पठाइयो', en: 'Escalated' } };
    var sl = LABELS[c.status] ? LABELS[c.status][en ? 'en' : 'ne'] : c.status;
    document.getElementById('modalTitle').textContent = c._id.slice(-5).toUpperCase() + ' — ' + escapeHtml(c.title);
    document.getElementById('modalBody').innerHTML = '<div style="display:flex;flex-direction:column;gap:16px;">' +
      (c.photo ? '<img src="' + c.photo + '" style="width:100%;max-height:220px;object-fit:cover;border-radius:10px;border:1px solid var(--border);" alt="Photo">' : '<div style="width:100%;height:70px;background:var(--bg);border:1.5px dashed var(--border);border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--gray);font-size:0.82rem;">' + (en ? 'No photo submitted' : 'फोटो छैन') + '</div>') +
      '<div><div style="font-size:0.66rem;font-weight:700;color:var(--gray);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">' + (en ? 'DESCRIPTION' : 'विवरण') + '</div><p style="font-size:0.87rem;color:var(--gray);line-height:1.7;">' + escapeHtml(c.description) + '</p></div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;"><div style="flex:1;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;"><div style="font-size:0.66rem;font-weight:700;color:var(--gray);text-transform:uppercase;margin-bottom:4px;">' + (en ? 'WARD' : 'वडा') + '</div><div style="font-weight:700;">' + (en ? 'Ward ' : 'वडा नं. ') + (c.location ? c.location.ward || '—' : '—') + '</div></div><div style="flex:1;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;"><div style="font-size:0.66rem;font-weight:700;color:var(--gray);text-transform:uppercase;margin-bottom:4px;">' + (en ? 'STATUS' : 'स्थिती') + '</div><div style="font-weight:700;">' + sl + '</div></div></div>' +
      (c.location && c.location.landmark ? '<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;"><div style="font-size:0.66rem;font-weight:700;color:var(--gray);text-transform:uppercase;margin-bottom:4px;">' + (en ? 'LANDMARK' : 'चिनारी स्थान') + '</div><div style="font-weight:600;">' + escapeHtml(c.location.landmark) + '</div></div>' : '') +
      (c.location && c.location.lat ? '<a href="https://www.openstreetmap.org/?mlat=' + c.location.lat + '&mlon=' + c.location.lng + '&zoom=17" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;font-size:0.8rem;font-weight:600;color:var(--info);text-decoration:none;">' + (en ? 'Open on map' : 'नक्सामा हेर्नुहोस्') + ' (' + c.location.lat.toFixed(4) + ', ' + c.location.lng.toFixed(4) + ')</a>' : '') + '</div>';
    document.getElementById('modalOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
  } catch (err) { console.error('Failed to fetch complaint detail:', err); }
}

/* ── Load complaints ── */
async function loadComplaints() {
  try {
    var res = await fetch(API + '/complaints', { headers: { 'Authorization': 'Bearer ' + getToken() } });
    if (res.status === 401) { redirectToLogin(); return; }
    var data = await res.json();
    var complaints = data.complaints || [];
    var wardComplaints = complaints.filter(function(c) { return c.location && c.location.ward === WARD_NUMBER; });
    renderComplaints(wardComplaints);
    renderEscalatedSection(wardComplaints);
    updateStats(wardComplaints);
  } catch (err) { console.error('Failed to load complaints:', err); }
}

function renderEscalatedSection(complaints) {
  var tbody = document.getElementById('escalatedSectionBody');
  var countEl = document.getElementById('escalatedCount');
  if (!tbody) return;
  var en = document.body.classList.contains('lang-mode-en');
  var escalated = complaints.filter(function(c) { return c.status === 'escalated'; });
  if (countEl) countEl.textContent = en ? escalated.length + ' escalated' : toNe(escalated.length) + ' एस्कलेट भएका';
  if (!escalated.length) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--gray);">' + (en ? 'No complaints escalated yet.' : 'हालसम्म कुनै गुनासो एस्कलेट भएको छैन।') + '</td></tr>'; return; }
  tbody.innerHTML = escalated.map(function(c) { return '<tr><td class="cell-id">' + c._id.slice(-5).toUpperCase() + '</td><td class="cell-title-col"><div class="cell-title">' + escapeHtml(c.title) + '</div><div class="cell-landmark">' + escapeHtml(c.location ? c.location.landmark || '—' : '—') + '</div></td><td class="cell-desc"><span class="desc-text">' + escapeHtml(c.description) + '</span></td><td><button class="action-btn btn-view" onclick="viewComplaint(\'' + c._id + '\')" title="View"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button></td></tr>'; }).join('');
}

function updateStats(complaints) {
  var pending = complaints.filter(function(c) { return c.status === 'pending'; }).length;
  var progress = complaints.filter(function(c) { return c.status === 'in-progress'; }).length;
  var escalated = complaints.filter(function(c) { return c.status === 'escalated'; }).length;
  var resolved = complaints.filter(function(c) { return c.status === 'resolved'; }).length;
  function setNum(el, val) { if (!el) return; el.dataset.ne = toNe(val); el.dataset.en = String(val); el.textContent = document.body.classList.contains('lang-mode-en') ? val : toNe(val); }
  setNum(document.querySelector('.s-pending .stat-num'), pending);
  setNum(document.querySelector('.s-field .stat-num'), progress);
  setNum(document.querySelector('.s-escalated .stat-num'), escalated);
  setNum(document.querySelector('.s-resolved .stat-num'), resolved);
}

function renderComplaints(complaints) {
  var tbody = document.getElementById('tableBody');
  if (!tbody) return;
  var count = document.getElementById('complaintCount');
  if (count) { var en = document.body.classList.contains('lang-mode-en'); count.textContent = en ? complaints.length + ' complaints' : toNe(complaints.length) + ' गुनासोहरू'; }
  if (complaints.length === 0) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--gray);"><span data-lang="ne">यस वडामा कुनै गुनासो छैन।</span><span data-lang="en">No complaints in this ward yet.</span></td></tr>'; return; }
  tbody.innerHTML = complaints.map(function(c) {
    var isEsc = c.status === 'escalated';
    var photo = c.photo ? '<img src="' + c.photo + '" class="photo-thumb-img" alt="Photo">' : '<div class="photo-placeholder"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></div>';
    var statusC = isEsc ? '<span class="badge b-escalated"><span class="badge-dot"></span><span data-lang="ne">महानगरमा पठाइयो</span><span data-lang="en">Escalated</span></span>' : '<select class="status-select" onchange="handleStatusChange(this,\'' + c._id + '\')" data-orig-value="' + c.status + '"><option value="pending"' + (c.status==='pending'?' selected':'') + '>समीक्षामा / Pending</option><option value="in-progress"' + (c.status==='in-progress'?' selected':'') + '>प्रक्रियामा / In Progress</option><option value="resolved"' + (c.status==='resolved'?' selected':'') + '>समाधान / Resolved</option></select>';
    var actions = isEsc ? '<button class="action-btn btn-view" onclick="viewComplaint(\'' + c._id + '\')" title="View"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>' : '<button class="action-btn btn-escalate" onclick="escalateComplaint(\'' + c._id + '\')" title="Escalate"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg></button><button class="action-btn btn-view" onclick="viewComplaint(\'' + c._id + '\')" title="View"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>';
    var lm = c.location && c.location.landmark ? escapeHtml(c.location.landmark) : '—';
    var wn = c.location ? c.location.ward || '—' : '—';
    var coords = c.location && c.location.lat ? '<div class="cell-coords">' + c.location.lat.toFixed(4) + ', ' + c.location.lng.toFixed(4) + '</div>' : '';
    return '<tr data-status="' + c.status + '"><td class="cell-id">' + c._id.slice(-5).toUpperCase() + '</td><td class="cell-title-col"><div class="cell-title"><span data-lang="ne">' + escapeHtml(c.title) + '</span><span data-lang="en">' + escapeHtml(c.title) + '</span></div><div class="cell-landmark"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span data-lang="ne">' + lm + ', वडा ' + wn + '</span><span data-lang="en">' + lm + ', Ward ' + wn + '</span></div>' + coords + '</td><td class="cell-desc"><span class="desc-text">' + escapeHtml(c.description) + '</span></td><td class="cell-photo"><div class="photo-thumb-wrap">' + photo + '</div></td><td>' + statusC + '</td><td><div class="row-actions">' + actions + '</div></td></tr>';
  }).join('');
}

function exportReport() { alert(document.body.classList.contains('lang-mode-en') ? 'Export will be available soon.' : 'निर्यात सुविधा चाँडै उपलब्ध हुनेछ।'); }

function logoutWard() {
  localStorage.removeItem('nagarikAawazToken');
  localStorage.removeItem('nagarikAawazName');
  localStorage.removeItem('nagarikAawazWard');
  window.location.href = 'login.html';
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', function() {
  if (!getToken()) { redirectToLogin(); return; }
  var savedLang = localStorage.getItem('nagarikAawazLang') || 'ne';
  if (savedLang === 'en') setLang('en'); else updateStatNumbers('ne');
  loadCurrentUser();
  window.addEventListener('resize', function() { if (window.innerWidth > 900) { var sb = document.getElementById('sidebar'); var bd = document.getElementById('sbBackdrop'); if (sb) sb.classList.remove('open'); if (bd) bd.classList.remove('show'); } });
  document.addEventListener('click', function(e) { var wrapper = document.querySelector('.notif-wrapper'); if (notifOpen && wrapper && !wrapper.contains(e.target)) { document.getElementById('notifPanel').style.display = 'none'; notifOpen = false; } });
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeModal(); });
});