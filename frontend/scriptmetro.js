/* ================================================================
   NAGARIK AAWAZ — scriptmetro.js
   Sections:
     1.  Config & Helpers
     2.  Language toggle
     3.  Mobile sidebar
     4.  Notifications (dynamic)
     5.  Budget calculations (dynamic categories from DB)
     6.  Load escalations
     7.  Load ward stats
     8.  Render all complaints (10 most recent)
     9.  Render queue (5 most recent)
     10. Render ward table (top 5)
     11. Update stat cards
     12. Modals
     13. Status change
     14. Load current user
     15. Init
================================================================ */

/* ── 1. Config & Helpers ── */
const API = 'http://localhost:5000/api';
const getToken = () => localStorage.getItem('nagarikAawazToken');
const authHdr = () => ({ 'Authorization': 'Bearer ' + getToken(), 'Content-Type': 'application/json' });
function redirectToLogin() { window.location.href = 'login.html'; }
function isEn() { return document.body.classList.contains('lang-mode-en'); }
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtNPR(n) {
  if (!n || n === 0) return 'रु. ०';
  if (n >= 10000000) return 'रु. ' + (n / 10000000).toFixed(1) + ' क.';
  if (n >= 100000) return 'रु. ' + (n / 100000).toFixed(0) + ' लाख';
  return 'रु. ' + n.toLocaleString();
}

function toNepaliDigits(n) {
  var map = { '0': '०', '1': '१', '2': '२', '3': '३', '4': '४', '5': '५', '6': '६', '7': '७', '8': '८', '9': '९' };
  return String(n).split('').map(function(d) { return map[d] || d; }).join('');
}

function formatDate(dateStr) {
  var d = new Date(dateStr);
  return d.toLocaleDateString(isEn() ? 'en-US' : 'ne-NP', { year: 'numeric', month: 'short', day: 'numeric' });
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
}

/* ── 3. Mobile sidebar ── */
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

/* ── 4. Notifications (dynamic) ── */
var notifications = [];

function addNotification(message, type) {
  var iconPaths = {
    'escalated': '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    'resolved': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'
  };
  notifications.unshift({ message: message, type: type, time: new Date().toISOString() });
  if (notifications.length > 20) notifications.pop();
  renderNotifications();
  showNotifDot();
}

function renderNotifications() {
  var list = document.getElementById('notifList');
  if (!list) return;
  var iconClass = { 'escalated': 'notif-critical', 'resolved': 'notif-resolved' };
  var iconPaths = {
    'escalated': '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    'resolved': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'
  };

  if (!notifications.length) {
    list.innerHTML = '<div class="notif-empty"><span data-lang="ne">कुनै सूचना छैन</span><span data-lang="en">No notifications</span></div>';
    return;
  }

  list.innerHTML = notifications.map(function(n) {
    return '<div class="notif-item">' +
      '<div class="notif-icon ' + (iconClass[n.type] || 'notif-resolved') + '">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      (iconPaths[n.type] || iconPaths.resolved) +
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
  if (dot) dot.style.display = notifications.length > 0 ? 'block' : 'none';
}

function toggleNotifications(e) {
  if (e) e.stopPropagation();
  var dropdown = document.getElementById('notifDropdown');
  dropdown.classList.toggle('open');
  if (dropdown.classList.contains('open')) {
    document.getElementById('notifDot').style.display = 'none';
  }
}

document.addEventListener('click', function(e) {
  var w = document.getElementById('notifWrap');
  if (w && !w.contains(e.target)) document.getElementById('notifDropdown').classList.remove('open');
});

/* ── 5. Budget calculations (dynamic categories from DB) ── */
function calculateBudgetUtilization(budgets) {
  var categories = {};
  
  budgets.forEach(function(b) {
    var cat = b.category || 'Public Services';
    if (!categories[cat]) {
      categories[cat] = { allocated: 0, spent: 0 };
    }
    categories[cat].allocated += b.allocatedAmount || 0;
    categories[cat].spent += b.spentAmount || 0;
  });

  var totalAllocated = 0;
  var totalSpent = 0;
  var result = [];

  // Nepali translations for common categories
  var translations = {
    'Escalations': 'एस्कलेसन',
    'Infrastructure': 'पूर्वाधार',
    'Roads & Infrastructure': 'सडक तथा पूर्वाधार',
    'Roads and Infrastructure': 'सडक तथा पूर्वाधार',
    'Water & Drainage': 'खानेपानी तथा ढल निकास',
    'Water and Drainage': 'खानेपानी तथा ढल निकास',
    'Waste Management': 'फोहोरमैला व्यवस्थापन',
    'Lighting & Sanitation': 'सडक बत्ती तथा सरसफाई',
    'Lighting and Sanitation': 'सडक बत्ती तथा सरसफाई',
    'Education': 'शिक्षा',
    'Health': 'स्वास्थ्य',
    'Agriculture': 'कृषि',
    'Development': 'विकास',
    'Maintenance': 'मर्मत',
    'Emergency': 'आपतकालीन',
    'Public Services': 'सार्वजनिक सेवा',
    'General': 'सामान्य',
    'Miscellaneous': 'विविध',
    'Uncategorized': 'सार्वजनिक सेवा'
  };

  for (var key in categories) {
    var c = categories[key];
    totalAllocated += c.allocated;
    totalSpent += c.spent;
    var pct = c.allocated > 0 ? Math.round((c.spent / c.allocated) * 100) : 0;
    var labelNe = translations[key] || key;
    result.push({
      key: key,
      label_ne: labelNe,
      label_en: key,
      allocated: c.allocated,
      spent: c.spent,
      pct: pct
    });
  }

  // Sort by allocated amount (highest first)
  result.sort(function(a, b) { return b.allocated - a.allocated; });

  var overallPct = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0;
  return { categories: result, totalAllocated: totalAllocated, totalSpent: totalSpent, overallPct: overallPct };
}

/* ── 6. Load escalations ── */
function loadEscalations(complaints) {
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
}

/* ── 7. Load ward stats ── */
function loadWardStats(complaints) {
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
      avgDays: s.resolvedCount ? (avgMs / 86400000).toFixed(1) : '—'
    });
  }
  return result;
}

/* ── 8. Render all complaints (10 most recent) ── */
function renderAllComplaints(complaints) {
  var tbody = document.getElementById('allComplaintsBody');
  var countEl = document.getElementById('allComplaintCount');
  var en = isEn();
  if (!tbody) return;
  
  // Sort by createdAt descending (most recent first)
  var sorted = complaints.slice().sort(function(a, b) {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  
  // Show only 10 most recent
  var display = sorted.slice(0, 10);
  
  if (countEl) countEl.textContent = en ? complaints.length + ' complaints' : complaints.length + ' गुनासोहरू';

  var STATUS_LABELS = {
    'pending': { ne: 'समीक्षामा', en: 'Pending' },
    'in-progress': { ne: 'प्रक्रियामा', en: 'In Progress' },
    'resolved': { ne: 'समाधान भएको', en: 'Resolved' },
    'escalated': { ne: 'एस्कलेट', en: 'Escalated' }
  };

  if (!display.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--gray);">' + (en ? 'No complaints yet.' : 'हालसम्म कुनै गुनासो छैन।') + '</td></tr>';
    return;
  }

  tbody.innerHTML = display.map(function(c) {
    var label = STATUS_LABELS[c.status] || { ne: c.status, en: c.status };
    var badgeClass = c.status === 'escalated' ? 'b-escalated' : c.status === 'resolved' ? 'b-resolved' : c.status === 'in-progress' ? 'b-progress' : 'b-review';
    var photoCell = c.photo ? '<img src="' + c.photo + '" style="width:44px;height:44px;object-fit:cover;border-radius:8px;border:1px solid var(--border);" alt="Photo">' : '<div style="width:44px;height:44px;border-radius:8px;border:1.5px dashed var(--border);background:var(--bg);"></div>';
    return '<tr><td class="cell-id">' + c._id.slice(-5).toUpperCase() + '</td><td class="cell-title-col"><div class="cell-title">' + escapeHtml(c.title) + '</div><div class="cell-sub">' + escapeHtml((c.location && c.location.landmark) || '—') + '</div></td><td class="td-num">' + (c.location ? c.location.ward : '—') + '</td><td class="cell-desc" style="max-width:200px;"><span style="font-size:0.82rem;color:var(--gray);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">' + escapeHtml(c.description) + '</span></td><td>' + photoCell + '</td><td><span class="badge ' + badgeClass + '"><span class="badge-dot"></span>' + (en ? label.en : label.ne) + '</span></td><td><div style="display:flex;gap:6px;align-items:center;"><select class="status-select-mini" onchange="metroChangeStatus(this,\'' + c._id + '\')"><option value="pending" ' + (c.status === 'pending' ? 'selected' : '') + '>' + (en ? 'Pending' : 'समीक्षामा') + '</option><option value="in-progress" ' + (c.status === 'in-progress' ? 'selected' : '') + '>' + (en ? 'In Progress' : 'प्रक्रियामा') + '</option><option value="resolved" ' + (c.status === 'resolved' ? 'selected' : '') + '>' + (en ? 'Resolved' : 'समाधान') + '</option></select><button class="action-btn" onclick="openComplaintDetailModal(\'' + c._id + '\')" title="View"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button></div></td></tr>';
  }).join('');
}

/* ── 9. Render queue (5 most recent escalations) ── */
function renderQueueList(escalations) {
  var list = document.getElementById('queueList');
  if (!list) return;
  var en = isEn();
  
  // Sort by daysAgo (most recent first)
  var sorted = escalations.slice().sort(function(a, b) { return a.daysAgo - b.daysAgo; });
  var display = sorted.slice(0, 5);
  
  if (!display.length) {
    list.innerHTML = '<div style="padding:24px;text-align:center;color:var(--gray);">' + (en ? 'No active escalations right now.' : 'हाल कुनै सक्रिय एस्कलेसन छैन।') + '</div>';
    return;
  }
  list.innerHTML = display.map(function(c) {
    return '<div class="queue-item"><div class="queue-body"><div class="queue-top"><div><div class="queue-id">' + c.id + '</div><div class="queue-title">' + escapeHtml(en ? c.title_en : c.title_ne) + '</div></div></div><div class="queue-meta"><span class="meta-chip"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/></svg>' + (en ? 'Ward ' : 'वडा ') + c.ward + '</span><span class="meta-chip"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' + c.daysAgo + ' ' + (en ? 'days ago' : 'दिन पहिले') + '</span></div><div class="queue-actions"><button class="btn btn-outline btn-sm" onclick="openComplaintDetailModal(\'' + c.id + '\')">' + (en ? 'View Details' : 'विवरण हेर्नुहोस्') + '</button></div></div></div>';
  }).join('');
}

/* ── 10. Render ward table (top 5) ── */
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
    return '<tr><td><span class="ward-rank ' + rc + '">' + (i + 1) + '</span></td><td class="ward-name-cell">' + (en ? 'Ward ' : 'वडा ') + w.ward + '</td><td class="td-num">' + w.total + '</td><td class="td-num ' + (w.escalated >= 4 ? 'escalation-high' : 'escalation-count') + '">' + w.escalated + '</td><td><div class="resolution-bar-wrap"><div class="resolution-track"><div class="resolution-fill ' + fc(w.rate) + '" style="width:' + w.rate + '%;"></div></div><span class="resolution-pct ' + pc(w.rate) + '">' + w.rate + '%</span></div></td><td class="td-time">' + w.avgDays + ' ' + (en ? 'd' : 'दिन') + '</td></tr>';
  }).join('');
}

/* ── 11. Update stat cards ── */
function updateStatCards(escalations, wardStats, budgets) {
  var total = wardStats.reduce(function(s, w) { return s + w.total; }, 0);
  var aw = wardStats.filter(function(w) { return w.total > 0; }).length;

  var budgetData = calculateBudgetUtilization(budgets);
  var overallPct = budgetData.overallPct;

  function se(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
  se('statTotal', total);
  se('statEscalated', escalations.length);
  se('statWards', aw + '/३३');

  var uf = document.getElementById('budgetFill');
  var upc = document.getElementById('budgetPct');
  var snb = document.getElementById('statBudget');
  if (uf) uf.style.width = overallPct + '%';
  if (upc) upc.textContent = overallPct + '%';
  if (snb) snb.textContent = overallPct + '%';

  renderBudgetCategories(budgetData);
}

function renderBudgetCategories(budgetData) {
  var body = document.getElementById('budgetBody');
  if (!body) return;
  var en = isEn();

  if (!budgetData.categories.length) {
    body.innerHTML = '<div style="padding:20px;text-align:center;color:var(--gray);">' + (en ? 'No budget data available.' : 'बजेट डाटा उपलब्ध छैन।') + '</div>';
    return;
  }

  body.innerHTML = budgetData.categories.map(function(c, idx) {
    var colors = ['', 'util-gold', 'util-blue', ''];
    var pctColors = ['', 'util-pct-gold', 'util-pct-blue', ''];
    var colorClass = colors[idx % colors.length] || '';
    var pctColor = pctColors[idx % pctColors.length] || '';
    return '<div class="budget-row">' +
      '<div class="budget-row-labels">' +
      '<span class="budget-cat">' + (en ? c.label_en : c.label_ne) + '</span>' +
      '<span class="budget-amount">' + fmtNPR(c.spent) + ' / ' + fmtNPR(c.allocated) + '</span>' +
      '</div>' +
      '<div class="util-bar-wrap">' +
      '<div class="util-track"><div class="util-fill ' + colorClass + '" style="width:' + c.pct + '%;"></div></div>' +
      '<span class="util-pct ' + pctColor + '">' + c.pct + '%</span>' +
      '</div>' +
      '</div>';
  }).join('') +
    '<div class="budget-total-row">' +
    '<span>' + (en ? 'Total Quarterly Budget' : 'कुल त्रैमासिक बजेट') + '</span>' +
    '<span class="budget-total-value">' + fmtNPR(budgetData.totalAllocated) + '</span>' +
    '</div>';
}

/* ── 12. Modals ── */
function openEscalationsModal() {
  var body = document.getElementById('escalationsModalBody');
  var en = isEn();
  var escs = window._escalationsData || [];
  
  // Sort by daysAgo (most recent first)
  var sorted = escs.slice().sort(function(a, b) { return a.daysAgo - b.daysAgo; });
  
  body.innerHTML = sorted.map(function(c) {
    var mapLink = '';
    if (c.lat && c.lng) {
      mapLink = '<a class="esc-map-link" href="https://www.openstreetmap.org/?mlat=' + c.lat + '&mlon=' + c.lng + '&zoom=17" target="_blank" rel="noopener"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>' + (en ? 'Open on map (' + c.lat.toFixed(4) + ', ' + c.lng.toFixed(4) + ')' : 'नक्सामा हेर्नुहोस् (' + c.lat.toFixed(4) + ', ' + c.lng.toFixed(4) + ')') + '</a>';
    }
    return '<div class="esc-modal-item"><div class="esc-modal-header"><div><div class="esc-modal-id">' + c.id + '</div><div class="esc-modal-title">' + escapeHtml(en ? c.title_en : c.title_ne) + '</div></div></div><div class="esc-modal-body">' + (c.photo ? '<img src="' + c.photo + '" class="esc-photo" alt="Photo">' : '<div class="esc-photo-placeholder"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>' + (en ? 'No photo uploaded' : 'फोटो उपलब्ध छैन') + '</div>') + '<p class="esc-desc">' + escapeHtml(en ? c.desc_en : c.desc_ne) + '</p><div class="esc-meta-row"><span class="esc-meta-chip"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/></svg>' + (en ? 'Ward ' : 'वडा ') + c.ward + '</span><span class="esc-meta-chip"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' + escapeHtml(en ? c.landmark_en : c.landmark_ne) + '</span><span class="esc-meta-chip"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' + c.daysAgo + ' ' + (en ? 'days ago' : 'दिन पहिले') + '</span></div>' + mapLink + '</div><div class="esc-modal-footer"><button class="btn btn-outline btn-sm" onclick="closeEscalationsModal();openComplaintDetailModal(\'' + c.id + '\')">' + (en ? 'Full Detail' : 'पूर्ण विवरण') + '</button></div></div>';
  }).join('') || '<div style="padding:24px;text-align:center;color:var(--gray);">' + (en ? 'No escalations found.' : 'कुनै एस्कलेसन छैन।') + '</div>';
  
  document.getElementById('escalationsOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeEscalationsModal() {
  document.getElementById('escalationsOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* ── Complaint Detail Modal ── */
async function openComplaintDetailModal(id) {
  var en = isEn();
  var body = document.getElementById('complaintDetailBody');
  var title = document.getElementById('complaintDetailTitle');
  title.innerHTML = en ? 'Loading...' : 'लोड हुँदैछ...';
  body.innerHTML = '';
  document.getElementById('complaintDetailOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  try {
    var res = await fetch(API + '/complaints/' + id, { headers: { 'Authorization': 'Bearer ' + getToken() } });
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

/* ── Ward Performance Modal ── */
function openWardPerformanceModal() {
  var en = isEn();
  var body = document.getElementById('wardPerfModalBody');
  var wardData = window._wardData || [];
  var sorted = wardData.slice().sort(function(a, b) { return b.rate - a.rate; });

  function fc(r) { return r >= 85 ? 'fill-green' : r >= 60 ? 'fill-gold' : 'fill-red'; }
  function pc(r) { return r >= 85 ? 'pct-green' : r >= 60 ? 'pct-gold' : 'pct-red'; }

  body.innerHTML = '<div class="table-scroll"><table class="ward-modal-table"><thead><tr><th>#</th><th>' + (en ? 'Ward' : 'वडा') + '</th><th>' + (en ? 'Total' : 'कुल') + '</th><th>' + (en ? 'Escalations' : 'एस्कलेसन') + '</th><th>' + (en ? 'Resolved' : 'समाधान') + '</th><th style="min-width:130px;">' + (en ? 'Resolution Rate' : 'समाधान दर') + '</th><th>' + (en ? 'Avg. Time' : 'औसत समय') + '</th></tr></thead><tbody>' + sorted.map(function(w, i) {
    var rc = w.rate >= 85 ? '' : w.rate >= 60 ? 'rank-mid' : 'rank-low';
    return '<tr><td><span class="ward-rank ' + rc + '">' + (i + 1) + '</span></td><td class="ward-name-cell">' + (en ? 'Ward ' : 'वडा ') + w.ward + '</td><td class="td-num">' + w.total + '</td><td class="td-num ' + (w.escalated >= 4 ? 'escalation-high' : 'escalation-count') + '">' + w.escalated + '</td><td class="td-num">' + w.resolved + '</td><td><div class="resolution-bar-wrap"><div class="resolution-track"><div class="resolution-fill ' + fc(w.rate) + '" style="width:' + w.rate + '%;transition:width 0.6s ease;"></div></div><span class="resolution-pct ' + pc(w.rate) + '">' + w.rate + '%</span></div></td><td class="td-time">' + w.avgDays + ' ' + (en ? 'd' : 'दिन') + '</td></tr>';
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

/* ── Resolved Complaints Modal ── */
function openResolvedModal() {
  var en = isEn();
  var body = document.getElementById('resolvedModalBody');
  var allComplaints = window._allComplaintsData || [];
  var resolved = allComplaints.filter(function(c) { return c.status === 'resolved'; });
  
  // Sort by updatedAt descending (most recent first)
  var sorted = resolved.slice().sort(function(a, b) {
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });
  
  if (!sorted.length) {
    body.innerHTML = '<div style="padding:24px;text-align:center;color:var(--gray);">' + (en ? 'No resolved complaints yet.' : 'हालसम्म कुनै समाधान भएको गुनासो छैन।') + '</div>';
  } else {
    body.innerHTML = '<div class="table-scroll"><table class="ward-modal-table"><thead><tr><th>' + (en ? 'ID' : 'आईडी') + '</th><th>' + (en ? 'Title' : 'शीर्षक') + '</th><th>' + (en ? 'Ward' : 'वडा') + '</th><th>' + (en ? 'Escalated On' : 'एस्कलेसन मिति') + '</th><th>' + (en ? 'Resolved On' : 'समाधान मिति') + '</th><th>' + (en ? 'Details' : 'विवरण') + '</th></tr></thead><tbody>' + 
      sorted.map(function(c) {
        // Estimate escalation date (3 days before resolved date)
        var escalatedDate = new Date(new Date(c.updatedAt).getTime() - 86400000 * 3);
        return '<tr><td class="cell-id-sm">NA-' + c._id.slice(-5).toUpperCase() + '</td><td>' + escapeHtml(c.title) + '</td><td class="td-num">' + (c.location ? c.location.ward : '—') + '</td><td class="td-time">' + formatDate(escalatedDate) + '</td><td class="td-time">' + formatDate(c.updatedAt) + '</td><td><button class="btn-detail" onclick="closeResolvedModal();openComplaintDetailModal(\'' + c._id + '\')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button></td></tr>';
      }).join('') + 
    '</tbody></table></div>';
  }
  document.getElementById('resolvedModalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeResolvedModal() {
  document.getElementById('resolvedModalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* ── All Complaints Modal ── */
function openAllComplaintsModal() {
  var en = isEn();
  var body = document.getElementById('allComplaintsModalBody');
  var allComplaints = window._allComplaintsData || [];
  
  // Sort by createdAt descending (most recent first)
  var sorted = allComplaints.slice().sort(function(a, b) {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  
  var STATUS_LABELS = {
    'pending': { ne: 'समीक्षामा', en: 'Pending' },
    'in-progress': { ne: 'प्रक्रियामा', en: 'In Progress' },
    'resolved': { ne: 'समाधान भएको', en: 'Resolved' },
    'escalated': { ne: 'एस्कलेट', en: 'Escalated' }
  };
  
  if (!sorted.length) {
    body.innerHTML = '<div style="padding:24px;text-align:center;color:var(--gray);">' + (en ? 'No complaints yet.' : 'हालसम्म कुनै गुनासो छैन।') + '</div>';
  } else {
    body.innerHTML = '<div class="table-scroll"><table class="ward-modal-table"><thead><tr><th>' + (en ? 'ID' : 'आईडी') + '</th><th>' + (en ? 'Title & Location' : 'शीर्षक र स्थान') + '</th><th>' + (en ? 'Ward' : 'वडा') + '</th><th>' + (en ? 'Description' : 'विवरण') + '</th><th>' + (en ? 'Photo' : 'फोटो') + '</th><th>' + (en ? 'Status' : 'स्थिती') + '</th><th>' + (en ? 'Actions' : 'कार्य') + '</th></tr></thead><tbody>' + 
      sorted.map(function(c) {
        var label = STATUS_LABELS[c.status] || { ne: c.status, en: c.status };
        var badgeClass = c.status === 'escalated' ? 'b-escalated' : c.status === 'resolved' ? 'b-resolved' : c.status === 'in-progress' ? 'b-progress' : 'b-review';
        var photoCell = c.photo ? '<img src="' + c.photo + '" style="width:44px;height:44px;object-fit:cover;border-radius:8px;border:1px solid var(--border);" alt="Photo">' : '<div style="width:44px;height:44px;border-radius:8px;border:1.5px dashed var(--border);background:var(--bg);"></div>';
        return '<tr><td class="cell-id-sm">' + c._id.slice(-5).toUpperCase() + '</td><td><div style="font-weight:600;">' + escapeHtml(c.title) + '</div><div style="font-size:0.72rem;color:var(--gray);">' + escapeHtml((c.location && c.location.landmark) || '—') + '</div></td><td class="td-num">' + (c.location ? c.location.ward : '—') + '</td><td style="font-size:0.8rem;color:var(--gray);max-width:200px;"><span style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">' + escapeHtml(c.description) + '</span></td><td>' + photoCell + '</td><td><span class="badge ' + badgeClass + '"><span class="badge-dot"></span>' + (en ? label.en : label.ne) + '</span></td><td><button class="action-btn" onclick="closeAllComplaintsModal();openComplaintDetailModal(\'' + c._id + '\')" title="View"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button></td></tr>';
      }).join('') + 
    '</tbody></table></div>';
  }
  document.getElementById('allComplaintsModalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeAllComplaintsModal() {
  document.getElementById('allComplaintsModalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* ── Settings Modal ── */
function openSettingsModal() { document.getElementById('settingsOverlay').classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeSettingsModal() { document.getElementById('settingsOverlay').classList.remove('open'); document.body.style.overflow = ''; }

/* ── Keyboard shortcuts ── */
document.addEventListener('keydown', function(e) {
  if (e.key !== 'Escape') return;
  closeEscalationsModal();
  closeComplaintDetailModal();
  closeWardPerformanceModal();
  closeSettingsModal();
  closeResolvedModal();
  closeAllComplaintsModal();
});

/* ── 13. Status change ── */
async function metroChangeStatus(selectEl, complaintId) {
  var en = isEn();
  try {
    var res = await fetch(API + '/complaints/' + complaintId + '/status', { method: 'PUT', headers: authHdr(), body: JSON.stringify({ status: selectEl.value }) });
    if (res.status === 401) { redirectToLogin(); return; }
    if (res.ok) {
      var statusMsg = selectEl.value === 'escalated' ?
        (en ? 'Complaint escalated to metro' : 'गुनासो महानगरमा एस्कलेट भयो') :
        selectEl.value === 'resolved' ?
        (en ? 'Complaint resolved by metro' : 'गुनासो महानगरबाट समाधान भयो') :
        (en ? 'Complaint status updated' : 'गुनासोको स्थिती अपडेट भयो');
      addNotification(statusMsg, selectEl.value === 'escalated' ? 'escalated' : 'resolved');
      location.reload();
    }
  } catch (err) { console.error('Status change failed:', err); }
}

/* ── 14. Load current user ── */
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

/* ── 15. Init ── */
document.addEventListener('DOMContentLoaded', async function() {
  if (!getToken()) { redirectToLogin(); return; }

  loadCurrentUser();

  var savedLang = localStorage.getItem('nagarikAawazLang') || 'ne';
  if (savedLang === 'en') setLang('en');

  // Fetch complaints
  var res = await fetch(API + '/complaints?_t=' + Date.now(), { headers: { 'Authorization': 'Bearer ' + getToken() } });
  var data = await res.json();
  var allComplaints = data.complaints || [];

  // Store all complaints for modals
  window._allComplaintsData = allComplaints;

  // Fetch budgets
  var budRes = await fetch(API + '/budgets?fiscalYear=2082/83');
  var budData = budRes.ok ? await budRes.json() : { budgets: [] };
  var budgets = budData.budgets || [];

  // Build data
  var escalations = loadEscalations(allComplaints);
  var wardStats = loadWardStats(allComplaints);

  // Store for modals
  window._escalationsData = escalations;
  window._wardData = wardStats;

  // Render everything
  renderQueueList(escalations);
  renderWardTable(wardStats);
  renderAllComplaints(allComplaints);
  updateStatCards(escalations, wardStats, budgets);

  // Render resolved escalations (5 most recent)
  var resolvedEl = document.getElementById('resolvedTableBody');
  var resolvedCount = document.getElementById('resolvedCount');
  var resolvedList = allComplaints.filter(function(c) { return c.status === 'resolved'; });
  
  // Sort by updatedAt descending (most recent first)
  var sortedResolved = resolvedList.slice().sort(function(a, b) {
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });
  var displayResolved = sortedResolved.slice(0, 5);
  
  var en = isEn();
  if (resolvedEl) {
    if (!displayResolved.length) {
      resolvedEl.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--gray);">' + (en ? 'No resolved complaints yet.' : 'हालसम्म कुनै समाधान भएको गुनासो छैन।') + '</td></tr>';
    } else {
      resolvedEl.innerHTML = displayResolved.map(function(c) {
        // Estimate escalation date (3 days before resolved date)
        var escalatedDate = new Date(new Date(c.updatedAt).getTime() - 86400000 * 3);
        return '<tr><td class="cell-id-sm">NA-' + c._id.slice(-5).toUpperCase() + '</td><td>' + escapeHtml(c.title) + '</td><td class="td-num">' + (c.location ? c.location.ward : '—') + '</td><td class="td-time">' + formatDate(escalatedDate) + '</td><td class="td-time">' + formatDate(c.updatedAt) + '</td><td><button class="btn-detail" onclick="openComplaintDetailModal(\'' + c._id + '\')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button></td></tr>';
      }).join('');
    }
  }
  if (resolvedCount) {
    var monthResolved = allComplaints.filter(function(c) {
      return c.status === 'resolved' && new Date(c.updatedAt).getMonth() === new Date().getMonth();
    }).length;
    resolvedCount.innerHTML = '<span data-lang="ne">' + monthResolved + ' यो महिना</span><span data-lang="en">' + monthResolved + ' this month</span>';
  }
});