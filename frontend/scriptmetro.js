/* ================================================================
   NAGARIK AAWAZ — scriptmetro.js
   Metro Dashboard
================================================================ */

const API  = 'http://localhost:5000/api';
const getToken = () => localStorage.getItem('nagarikAawazToken');
const authHdr  = () => ({ 'Authorization': 'Bearer ' + getToken(), 'Content-Type': 'application/json' });
function redirectToLogin() { window.location.href = 'login.html'; }

/* ── Language ── */
function setLang(lang) {
  document.body.classList.toggle('lang-mode-en', lang === 'en');
  document.getElementById('btn-ne').classList.toggle('active', lang === 'ne');
  document.getElementById('btn-en').classList.toggle('active', lang === 'en');
  localStorage.setItem('nagarikAawazLang', lang);
}
function isEn() { return document.body.classList.contains('lang-mode-en'); }

/* ── Mobile sidebar ── */
function toggleSidebar() {
  var sb = document.getElementById('sidebar');
  var bd = document.getElementById('sbBackdrop');
  var bt = document.getElementById('menuToggleSb');
  var io = document.getElementById('sbIconOpen');
  var ic = document.getElementById('sbIconClose');
  var op = sb.classList.toggle('open');
  bd.classList.toggle('show', op);
  bt.setAttribute('aria-expanded', String(op));
  io.style.display = op ? 'none' : 'block';
  ic.style.display = op ? 'block' : 'none';
}
window.addEventListener('resize', function() {
  if (window.innerWidth > 900) {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sbBackdrop').classList.remove('show');
    document.getElementById('sbIconOpen').style.display = 'block';
    document.getElementById('sbIconClose').style.display = 'none';
  }
});

/* ── Notifications ── */
function toggleNotifications(e) {
  if (e) e.stopPropagation();
  document.getElementById('notifDropdown').classList.toggle('open');
}
document.addEventListener('click', function(e) {
  var w = document.getElementById('notifWrap');
  if (w && !w.contains(e.target)) document.getElementById('notifDropdown').classList.remove('open');
});

/* ── Budget bar animation ── */
function animateBars() {
  document.querySelectorAll('.util-fill, .resolution-fill').forEach(function(bar) {
    var t = bar.style.width || '0%';
    bar.dataset.target = t;
    bar.style.width = '0%';
    bar.style.transition = 'width 0.9s cubic-bezier(0.22,1,0.36,1)';
  });
  var obs = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.style.width = entry.target.dataset.target;
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });
  document.querySelectorAll('.util-fill, .resolution-fill').forEach(function(bar) { obs.observe(bar); });
}

/* ── Data ── */
var STATIC_ESCALATIONS = [];
var ALL_WARDS_DATA = [];
var ALL_COMPLAINTS = [];

function fmtNPR(n) {
  if (!n || n === 0) return 'रु. ०';
  if (n >= 10000000) return 'रु. ' + (n/10000000).toFixed(1) + ' क.';
  if (n >= 100000)   return 'रु. ' + (n/100000).toFixed(0) + ' लाख';
  return 'रु. ' + n.toLocaleString();
}

/* ── Load escalations ── */
async function loadEscalations() {
  try {
    var res = await fetch(API + '/complaints?_t=' + Date.now(), { headers: authHdr() });
    if (res.status === 401) { redirectToLogin(); return []; }
    var data = await res.json();
    var complaints = data.complaints || [];
    return complaints.filter(function(c) { return c.status === 'escalated'; }).map(function(c) {
      return {
        id: c._id,
        title_ne: escapeHtml(c.title),
        title_en: escapeHtml(c.title),
        desc_ne: escapeHtml(c.description),
        desc_en: escapeHtml(c.description),
        photo: c.photo || null,
        lat: c.location ? c.location.lat : null,
        lng: c.location ? c.location.lng : null,
        landmark_ne: escapeHtml((c.location && c.location.landmark) || '—'),
        landmark_en: escapeHtml((c.location && c.location.landmark) || '—'),
        ward: c.location ? c.location.ward : '—',
        daysAgo: Math.floor((Date.now() - new Date(c.updatedAt)) / 86400000),
        _mongoId: c._id
      };
    });
  } catch (err) { console.error('loadEscalations:', err); return []; }
}

/* ── Load ward stats ── */
async function loadWardStats() {
  try {
    var results = await Promise.all([
      fetch(API + '/complaints?_t=' + Date.now(), { headers: authHdr() }),
      fetch(API + '/budgets')
    ]);
    if (results[0].status === 401) { redirectToLogin(); return []; }
    var complaints = (await results[0].json()).complaints || [];
    var budgets = results[1].ok ? (await results[1].json()).budgets || [] : [];
    var byWard = {};
    complaints.forEach(function(c) {
      var w = c.location ? c.location.ward : null;
      if (!w) return;
      if (!byWard[w]) byWard[w] = { total: 0, resolved: 0, escalated: 0, msSum: 0, resolvedCount: 0 };
      byWard[w].total++;
      if (c.status === 'resolved') {
        byWard[w].resolved++;
        byWard[w].msSum += new Date(c.updatedAt) - new Date(c.createdAt);
        byWard[w].resolvedCount++;
      }
      if (c.status === 'escalated') byWard[w].escalated++;
    });
    var budByWard = {};
    budgets.forEach(function(b) { budByWard[b.ward] = b; });
    var result = [];
    for (var i = 0; i < 33; i++) {
      var ward = i + 1;
      var s = byWard[ward] || { total: 0, resolved: 0, escalated: 0, msSum: 0, resolvedCount: 0 };
      var rate = s.total ? Math.round((s.resolved / s.total) * 100) : 0;
      var avgMs = s.resolvedCount ? s.msSum / s.resolvedCount : 0;
      result.push({
        ward: ward,
        total: s.total,
        resolved: s.resolved,
        escalated: s.escalated,
        rate: rate,
        allocated: (budByWard[ward] && budByWard[ward].allocatedAmount) || 0,
        used: (budByWard[ward] && budByWard[ward].spentAmount) || 0,
        avgDays: s.resolvedCount ? (avgMs / 86400000).toFixed(1) : '—'
      });
    }
    return result;
  } catch (err) { console.error('loadWardStats:', err); return []; }
}

/* ── Render all complaints table ── */
function renderAllComplaints(complaints) {
  var tbody = document.getElementById('allComplaintsBody');
  var countEl = document.getElementById('allComplaintCount');
  var en = isEn();
  if (!tbody) return;
  if (countEl) countEl.textContent = en ? complaints.length + ' complaints' : complaints.length + ' गुनासोहरू';
  var STATUS_LABELS = {
    'pending': { ne: 'समीक्षामा', en: 'Pending' },
    'in-progress': { ne: 'प्रक्रियामा', en: 'In Progress' },
    'resolved': { ne: 'समाधान भएको', en: 'Resolved' },
    'escalated': { ne: 'एस्कलेट', en: 'Escalated' }
  };
  if (!complaints.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--gray);">' + (en ? 'No complaints yet.' : 'हालसम्म कुनै गुनासो छैन।') + '</td></tr>';
    return;
  }
  tbody.innerHTML = complaints.map(function(c) {
    var label = STATUS_LABELS[c.status] || { ne: c.status, en: c.status };
    var badgeClass = c.status === 'escalated' ? 'b-escalated' : c.status === 'resolved' ? 'b-resolved' : c.status === 'in-progress' ? 'b-progress' : 'b-review';
    var photoCell = c.photo ? '<img src="' + c.photo + '" style="width:44px;height:44px;object-fit:cover;border-radius:8px;border:1px solid var(--border);" alt="Photo">' : '<div style="width:44px;height:44px;border-radius:8px;border:1.5px dashed var(--border);background:var(--bg);"></div>';
    return '<tr><td class="cell-id">' + c._id.slice(-5).toUpperCase() + '</td><td class="cell-title-col"><div class="cell-title">' + escapeHtml(c.title) + '</div><div class="cell-sub">' + escapeHtml((c.location && c.location.landmark) || '—') + '</div></td><td class="td-num">' + (c.location ? c.location.ward : '—') + '</td><td class="cell-desc" style="max-width:200px;"><span style="font-size:0.82rem;color:var(--gray);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">' + escapeHtml(c.description) + '</span></td><td>' + photoCell + '</td><td><span class="badge ' + badgeClass + '"><span class="badge-dot"></span>' + (en ? label.en : label.ne) + '</span></td><td><div style="display:flex;gap:6px;align-items:center;"><select class="status-select-mini" onchange="metroChangeStatus(this,\'' + c._id + '\')" style="border:1.5px solid var(--border);border-radius:6px;padding:4px 8px;font-size:0.72rem;font-family:inherit;"><option value="pending" ' + (c.status === 'pending' ? 'selected' : '') + '>' + (en ? 'Pending' : 'समीक्षामा') + '</option><option value="in-progress" ' + (c.status === 'in-progress' ? 'selected' : '') + '>' + (en ? 'In Progress' : 'प्रक्रियामा') + '</option><option value="resolved" ' + (c.status === 'resolved' ? 'selected' : '') + '>' + (en ? 'Resolved' : 'समाधान') + '</option></select><button class="action-btn" onclick="openComplaintDetailModal(\'' + c._id + '\')" title="View"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button></div></td></tr>';
  }).join('');
}

/* ── Status change ── */
async function metroChangeStatus(selectEl, complaintId) {
  try {
    var res = await fetch(API + '/complaints/' + complaintId + '/status', { method: 'PUT', headers: authHdr(), body: JSON.stringify({ status: selectEl.value }) });
    if (res.status === 401) { redirectToLogin(); return; }
    if (res.ok) location.reload();
  } catch (err) { console.error('Status change failed:', err); }
}

/* ── Load all complaints ── */
async function loadAllComplaints() {
  try {
    var res = await fetch(API + '/complaints?_t=' + Date.now(), { headers: authHdr() });
    if (res.status === 401) { redirectToLogin(); return; }
    var data = await res.json();
    ALL_COMPLAINTS = data.complaints || [];
    renderAllComplaints(ALL_COMPLAINTS);
  } catch (err) { console.error('loadAllComplaints:', err); }
}

/* ── Render queue ── */
function renderQueueList(escalations) {
  var list = document.getElementById('queueList');
  if (!list) return;
  var en = isEn();
  if (!escalations.length) {
    list.innerHTML = '<div style="padding:24px;text-align:center;color:var(--gray);">' + (en ? 'No active escalations right now.' : 'हाल कुनै सक्रिय एस्कलेसन छैन।') + '</div>';
    return;
  }
  list.innerHTML = escalations.slice(0, 5).map(function(c) {
    return '<div class="queue-item"><div class="queue-body"><div class="queue-top"><div><div class="queue-id">' + c.id + '</div><div class="queue-title">' + escapeHtml(en ? c.title_en : c.title_ne) + '</div></div></div><div class="queue-meta"><span class="meta-chip"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/></svg>' + (en ? 'Ward ' : 'वडा ') + c.ward + '</span><span class="meta-chip"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' + c.daysAgo + ' ' + (en ? 'days ago' : 'दिन पहिले') + '</span></div><div class="queue-actions"><button class="btn btn-outline btn-sm" onclick="openComplaintDetailModal(\'' + c.id + '\')">' + (en ? 'View Details' : 'विवरण हेर्नुहोस्') + '</button></div></div></div>';
  }).join('');
}

/* ── Render ward table ── */
function renderWardTable(wardStats) {
  var tbody = document.getElementById('wardTableBody');
  if (!tbody) return;
  var en = isEn();
  var sorted = wardStats.slice().sort(function(a, b) { return b.rate - a.rate; });
  var top5 = sorted.slice(0, 5);
  function fc(r) { return r >= 85 ? 'fill-green' : r >= 60 ? 'fill-gold' : 'fill-red'; }
  function pc(r) { return r >= 85 ? 'pct-green' : r >= 60 ? 'pct-gold' : 'pct-red'; }
  tbody.innerHTML = top5.map(function(w, i) {
    var rc = i < 2 ? '' : i < 4 ? 'rank-mid' : 'rank-low';
    return '<tr><td><span class="ward-rank ' + rc + '">' + (i + 1) + '</span></td><td class="ward-name-cell">' + (en ? 'Ward ' : 'वडा ') + w.ward + '</td><td class="td-num">' + w.total + '</td><td class="td-num ' + (w.escalated >= 4 ? 'escalation-high' : 'escalation-count') + '">' + w.escalated + '</td><td><div class="resolution-bar-wrap"><div class="resolution-track"><div class="resolution-fill ' + fc(w.rate) + '" style="width:' + w.rate + '%;"></div></div><span class="resolution-pct ' + pc(w.rate) + '">' + w.rate + '%</span></div></td><td class="td-budget">' + fmtNPR(w.allocated) + '</td><td class="td-budget-used">' + fmtNPR(w.used) + '</td><td class="td-time">' + w.avgDays + ' ' + (en ? 'd' : 'दिन') + '</td></tr>';
  }).join('');
}

/* ── Update stat cards ── */
function updateStatCards(escalations, wardStats) {
  var total = wardStats.reduce(function(s, w) { return s + w.total; }, 0);
  var tb = wardStats.reduce(function(s, w) { return s + w.allocated; }, 0);
  var ts = wardStats.reduce(function(s, w) { return s + w.used; }, 0);
  var up = tb > 0 ? Math.round((ts / tb) * 100) : 0;
  var aw = wardStats.filter(function(w) { return w.total > 0; }).length;
  function se(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
  se('statTotal', total);
  se('statEscalated', escalations.length);
  se('statWards', aw + '/33');
  var uf = document.querySelector('.stat-card.budget .util-fill');
  var upc = document.querySelector('.stat-card.budget .util-pct');
  var snb = document.querySelector('.stat-card.budget .stat-num');
  if (uf) uf.style.width = up + '%';
  if (upc) upc.textContent = up + '%';
  if (snb) snb.textContent = up + '%';
}

/* ── Modals ── */
function openEscalationsModal() {
  var body = document.getElementById('escalationsModalBody');
  var en = isEn();
  body.innerHTML = STATIC_ESCALATIONS.map(function(c) {
    var mapLink = '';
    if (c.lat && c.lng) {
      mapLink = '<a class="esc-map-link" href="https://www.openstreetmap.org/?mlat=' + c.lat + '&mlon=' + c.lng + '&zoom=17" target="_blank" rel="noopener"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>' + (en ? 'Open on map (' + c.lat.toFixed(4) + ', ' + c.lng.toFixed(4) + ')' : 'नक्सामा हेर्नुहोस् (' + c.lat.toFixed(4) + ', ' + c.lng.toFixed(4) + ')') + '</a>';
    }
    return '<div class="esc-modal-item"><div class="esc-modal-header"><div><div class="esc-modal-id">' + c.id + '</div><div class="esc-modal-title">' + escapeHtml(en ? c.title_en : c.title_ne) + '</div></div></div><div class="esc-modal-body">' + (c.photo ? '<img src="' + c.photo + '" class="esc-photo" alt="Photo">' : '<div class="esc-photo-placeholder"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>' + (en ? 'No photo uploaded' : 'फोटो उपलब्ध छैन') + '</div>') + '<p class="esc-desc">' + escapeHtml(en ? c.desc_en : c.desc_ne) + '</p><div class="esc-meta-row"><span class="esc-meta-chip"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/></svg>' + (en ? 'Ward ' : 'वडा ') + c.ward + '</span><span class="esc-meta-chip"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' + escapeHtml(en ? c.landmark_en : c.landmark_ne) + '</span><span class="esc-meta-chip"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' + c.daysAgo + ' ' + (en ? 'days ago' : 'दिन पहिले') + '</span></div>' + mapLink + '</div><div class="esc-modal-footer"><button class="btn btn-outline btn-sm" onclick="closeEscalationsModal();openComplaintDetailModal(\'' + c.id + '\')">' + (en ? 'Full Detail' : 'पूर्ण विवरण') + '</button></div></div>';
  }).join('');
  document.getElementById('escalationsOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeEscalationsModal() {
  document.getElementById('escalationsOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

async function openComplaintDetailModal(id) {
  var en = isEn();
  var body = document.getElementById('complaintDetailBody');
  var title = document.getElementById('complaintDetailTitle');
  title.innerHTML = en ? 'Loading...' : 'लोड हुँदैछ...';
  body.innerHTML = '';
  document.getElementById('complaintDetailOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  try {
    var res = await fetch(API + '/complaints/' + id, { headers: authHdr() });
    var c = (await res.json()).complaint;
    var LABELS = { 'pending': { ne: 'समीक्षामा', en: 'Pending' }, 'in-progress': { ne: 'प्रक्रियामा', en: 'In Progress' }, 'resolved': { ne: 'समाधान भएको', en: 'Resolved' }, 'escalated': { ne: 'एस्कलेट', en: 'Escalated' } };
    var s = LABELS[c.status] || { ne: c.status, en: c.status };
    body.innerHTML = '<div style="display:flex;flex-direction:column;gap:16px;">' + (c.photo ? '<img src="' + c.photo + '" style="width:100%;max-height:250px;object-fit:cover;border-radius:12px;border:1px solid var(--border);" alt="Photo">' : '') + '<div><h4 style="font-size:1.1rem;font-weight:700;color:var(--ink);margin-bottom:4px;">' + escapeHtml(c.title) + '</h4><p style="color:var(--gray);font-size:0.9rem;">' + escapeHtml(c.description) + '</p></div><div style="display:flex;flex-wrap:wrap;gap:10px;"><span style="background:var(--bg);border:1px solid var(--border);padding:4px 12px;border-radius:999px;font-size:0.82rem;">' + (en ? 'Ward ' : 'वडा ') + (c.location ? c.location.ward || '—' : '—') + '</span><span style="background:var(--bg);border:1px solid var(--border);padding:4px 12px;border-radius:999px;font-size:0.82rem;">' + escapeHtml((c.location && c.location.landmark) || '—') + '</span><span style="background:var(--bg);border:1px solid var(--border);padding:4px 12px;border-radius:999px;font-size:0.82rem;">' + (en ? s.en : s.ne) + '</span></div>' + (c.location && c.location.lat ? '<a href="https://www.openstreetmap.org/?mlat=' + c.location.lat + '&mlon=' + c.location.lng + '&zoom=17" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;font-size:0.82rem;font-weight:600;color:var(--info);text-decoration:none;padding:8px 14px;background:var(--info-bg);border-radius:8px;margin-top:8px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>' + (en ? 'View on Map' : 'नक्सामा हेर्नुहोस्') + ' (' + c.location.lat.toFixed(4) + ', ' + c.location.lng.toFixed(4) + ')</a>' : '') + '<div style="margin-top:8px;display:flex;gap:8px;"><select id="detailStatusSelect" style="border:1.5px solid var(--border);border-radius:6px;padding:6px 10px;font-size:0.82rem;font-family:inherit;"><option value="pending" ' + (c.status === 'pending' ? 'selected' : '') + '>' + (en ? 'Pending' : 'समीक्षामा') + '</option><option value="in-progress" ' + (c.status === 'in-progress' ? 'selected' : '') + '>' + (en ? 'In Progress' : 'प्रक्रियामा') + '</option><option value="resolved" ' + (c.status === 'resolved' ? 'selected' : '') + '>' + (en ? 'Resolved' : 'समाधान') + '</option></select><button class="btn btn-primary btn-sm" onclick="updateStatusFromDetail(\'' + c._id + '\')">' + (en ? 'Update Status' : 'स्थिती अपडेट गर्नुहोस्') + '</button></div></div>';
    title.innerHTML = '<span data-lang="ne">गुनासो विवरण</span><span data-lang="en">Complaint Detail</span>';
  } catch (err) { body.innerHTML = '<p style="color:var(--error);">' + (en ? 'Failed to load complaint.' : 'गुनासो लोड गर्न असफल।') + '</p>'; }
}
async function updateStatusFromDetail(id) {
  var select = document.getElementById('detailStatusSelect');
  if (!select) return;
  try {
    var res = await fetch(API + '/complaints/' + id + '/status', { method: 'PUT', headers: authHdr(), body: JSON.stringify({ status: select.value }) });
    if (res.ok) { closeComplaintDetailModal(); location.reload(); }
  } catch (err) { console.error('Update failed:', err); }
}
function closeComplaintDetailModal() {
  document.getElementById('complaintDetailOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function openWardPerformanceModal() {
  var en = isEn();
  var body = document.getElementById('wardPerfModalBody');
  var sorted = ALL_WARDS_DATA.slice().sort(function(a, b) { return b.rate - a.rate; });
  function fc(r) { return r >= 85 ? 'fill-green' : r >= 60 ? 'fill-gold' : 'fill-red'; }
  function pc(r) { return r >= 85 ? 'pct-green' : r >= 60 ? 'pct-gold' : 'pct-red'; }
  body.innerHTML = '<div class="table-scroll"><table class="ward-modal-table"><thead><tr><th>#</th><th>' + (en ? 'Ward' : 'वडा') + '</th><th>' + (en ? 'Total' : 'कुल') + '</th><th>' + (en ? 'Escalations' : 'एस्कलेसन') + '</th><th>' + (en ? 'Resolved' : 'समाधान') + '</th><th style="min-width:130px;">' + (en ? 'Resolution Rate' : 'समाधान दर') + '</th><th>' + (en ? 'Allocated' : 'विनियोजित') + '</th><th>' + (en ? 'Used' : 'खर्च') + '</th><th>' + (en ? 'Avg. Time' : 'औसत समय') + '</th></tr></thead><tbody>' + sorted.map(function(w, i) {
    var rc = w.rate >= 85 ? '' : w.rate >= 60 ? 'rank-mid' : 'rank-low';
    return '<tr><td><span class="ward-rank ' + rc + '">' + (i + 1) + '</span></td><td class="ward-name-cell">' + (en ? 'Ward ' : 'वडा ') + w.ward + '</td><td class="td-num">' + w.total + '</td><td class="td-num ' + (w.escalated >= 4 ? 'escalation-high' : 'escalation-count') + '">' + w.escalated + '</td><td class="td-num">' + w.resolved + '</td><td><div class="resolution-bar-wrap"><div class="resolution-track"><div class="resolution-fill ' + fc(w.rate) + '" style="width:' + w.rate + '%;transition:width 0.6s ease;"></div></div><span class="resolution-pct ' + pc(w.rate) + '">' + w.rate + '%</span></div></td><td class="td-budget">' + fmtNPR(w.allocated) + '</td><td class="td-budget-used">' + fmtNPR(w.used) + '</td><td class="td-time">' + w.avgDays + ' ' + (en ? 'd' : 'दिन') + '</td></tr>';
  }).join('') + '</tbody></table></div>';
  document.getElementById('wardPerfOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(function() {
    document.querySelectorAll('#wardPerfModalBody .resolution-fill').forEach(function(bar) {
      var w = bar.style.width;
      bar.style.width = '0%';
      requestAnimationFrame(function() { bar.style.width = w; });
    });
  }, 50);
}
function closeWardPerformanceModal() {
  document.getElementById('wardPerfOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function openSettingsModal() { document.getElementById('settingsOverlay').classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeSettingsModal() { document.getElementById('settingsOverlay').classList.remove('open'); document.body.style.overflow = ''; }

document.addEventListener('keydown', function(e) {
  if (e.key !== 'Escape') return;
  closeEscalationsModal();
  closeComplaintDetailModal();
  closeWardPerformanceModal();
  closeSettingsModal();
});

/* ── Load current user ── */
async function loadCurrentUser() {
  var token = getToken();
  if (!token) return;
  try {
    var res = await fetch(API + '/auth/me', { headers: { 'Authorization': 'Bearer ' + token } });
    if (res.status === 401) { redirectToLogin(); return; }
    var user = await res.json();
    var initials = user.name.split(' ').map(function(w) { return w[0]; }).join('').slice(0, 2);
    var av = document.getElementById('userAvatar');
    if (av) av.textContent = initials;
    document.querySelectorAll('.uname[data-lang="ne"]').forEach(function(el) { el.textContent = user.name; });
    document.querySelectorAll('.uname[data-lang="en"]').forEach(function(el) { el.textContent = user.name; });
    var MAP = { metro: { ne: 'प्रमुख प्रशासकीय अधिकृत', en: 'Chief Administrative Officer' } };
    var labels = MAP[user.role] || { ne: user.role, en: user.role };
    var rn = document.getElementById('userRoleNe');
    var re = document.getElementById('userRoleEn');
    if (rn) rn.textContent = labels.ne;
    if (re) re.textContent = labels.en;
  } catch (err) { console.error('loadCurrentUser:', err); }
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', async function() {
  if (!getToken()) { redirectToLogin(); return; }

  ALL_COMPLAINTS = [];
  STATIC_ESCALATIONS = [];
  ALL_WARDS_DATA = [];

  loadCurrentUser();

  var savedLang = localStorage.getItem('nagarikAawazLang') || 'ne';
  if (savedLang === 'en') setLang('en');

  // Fetch complaints ONCE and reuse
  var res = await fetch(API + '/complaints?_t=' + Date.now(), { headers: authHdr() });
  var data = await res.json();
  var allComplaints = data.complaints || [];

  // Build escalations from the same data
  STATIC_ESCALATIONS = allComplaints.filter(function(c) { return c.status === 'escalated'; }).map(function(c) {
    return {
      id: c._id,
      title_ne: escapeHtml(c.title),
      title_en: escapeHtml(c.title),
      desc_ne: escapeHtml(c.description),
      desc_en: escapeHtml(c.description),
      photo: c.photo || null,
      lat: c.location ? c.location.lat : null,
      lng: c.location ? c.location.lng : null,
      landmark_ne: escapeHtml((c.location && c.location.landmark) || '—'),
      landmark_en: escapeHtml((c.location && c.location.landmark) || '—'),
      ward: c.location ? c.location.ward : '—',
      daysAgo: Math.floor((Date.now() - new Date(c.updatedAt)) / 86400000),
      _mongoId: c._id
    };
  });

  // Build ward stats from the same data
  var byWard = {};
  allComplaints.forEach(function(c) {
    var w = c.location ? c.location.ward : null;
    if (!w) return;
    if (!byWard[w]) byWard[w] = { total: 0, resolved: 0, escalated: 0, msSum: 0, resolvedCount: 0 };
    byWard[w].total++;
    if (c.status === 'resolved') { byWard[w].resolved++; byWard[w].msSum += new Date(c.updatedAt) - new Date(c.createdAt); byWard[w].resolvedCount++; }
    if (c.status === 'escalated') byWard[w].escalated++;
  });

  // Fetch budgets separately (small data)
  var budRes = await fetch(API + '/budgets?fiscalYear=2082/83');
  var budData = budRes.ok ? await budRes.json() : { budgets: [] };
  var budByWard = {};
  (budData.budgets || []).forEach(function(b) { budByWard[b.ward] = b; });

  ALL_WARDS_DATA = [];
  for (var i = 0; i < 33; i++) {
    var ward = i + 1;
    var s = byWard[ward] || { total: 0, resolved: 0, escalated: 0, msSum: 0, resolvedCount: 0 };
    var rate = s.total ? Math.round((s.resolved / s.total) * 100) : 0;
    var avgMs = s.resolvedCount ? s.msSum / s.resolvedCount : 0;
    ALL_WARDS_DATA.push({
      ward: ward, total: s.total, resolved: s.resolved, escalated: s.escalated, rate: rate,
      allocated: (budByWard[ward] && budByWard[ward].allocatedAmount) || 0,
      used: (budByWard[ward] && budByWard[ward].spentAmount) || 0,
      avgDays: s.resolvedCount ? (avgMs / 86400000).toFixed(1) : '—'
    });
  }

  renderQueueList(STATIC_ESCALATIONS);
  renderWardTable(ALL_WARDS_DATA);
  renderAllComplaints(allComplaints);
  updateStatCards(STATIC_ESCALATIONS, ALL_WARDS_DATA);
  animateBars();
});