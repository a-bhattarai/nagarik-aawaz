/* ================================================================
   NAGARIK AAWAZ — scriptmetro.js
   Metro Dashboard with map links, status changes, and proper flow
================================================================ */

const API  = 'http://localhost:5000/api';
const getToken = () => localStorage.getItem('nagarikAawazToken');
const authHdr  = () => ({ 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' });
function redirectToLogin() { window.location.href = 'login.html'; }

/* ── 1. Language toggle ── */
function setLang(lang) {
  document.body.classList.toggle('lang-mode-en', lang === 'en');
  document.getElementById('btn-ne').classList.toggle('active', lang === 'ne');
  document.getElementById('btn-en').classList.toggle('active', lang === 'en');
  localStorage.setItem('nagarikAawazLang', lang);
}

function isEn() {
  return document.body.classList.contains('lang-mode-en');
}

/* ── 2. Mobile sidebar ── */
function toggleSidebar() {
  const sidebar   = document.getElementById('sidebar');
  const backdrop  = document.getElementById('sbBackdrop');
  const btnToggle = document.getElementById('menuToggleSb');
  const iconOpen  = document.getElementById('sbIconOpen');
  const iconClose = document.getElementById('sbIconClose');

  const open = sidebar.classList.toggle('open');
  backdrop.classList.toggle('show', open);
  btnToggle.setAttribute('aria-expanded', String(open));
  iconOpen.style.display  = open ? 'none'  : 'block';
  iconClose.style.display = open ? 'block' : 'none';
}

window.addEventListener('resize', () => {
  if (window.innerWidth > 900) {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sbBackdrop').classList.remove('show');
    document.getElementById('sbIconOpen').style.display  = 'block';
    document.getElementById('sbIconClose').style.display = 'none';
  }
});

/* ── 3. Notification dropdown ── */
function toggleNotifications(e) {
  if (e) e.stopPropagation();
  document.getElementById('notifDropdown').classList.toggle('open');
}

document.addEventListener('click', (e) => {
  const wrap = document.getElementById('notifWrap');
  if (wrap && !wrap.contains(e.target)) {
    document.getElementById('notifDropdown').classList.remove('open');
  }
});

/* ── 4. Budget bar animation ── */
function animateBars() {
  const bars = document.querySelectorAll('.util-fill, .resolution-fill');
  bars.forEach(bar => {
    const target = bar.style.width || '0%';
    bar.dataset.target = target;
    bar.style.width = '0%';
    bar.style.transition = 'width 0.9s cubic-bezier(0.22,1,0.36,1)';
  });
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.width = entry.target.dataset.target;
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });
  bars.forEach(bar => obs.observe(bar));
}

/* ── 5. Data loading & rendering ── */
let STATIC_ESCALATIONS = [];
let ALL_WARDS_DATA = [];
let ALL_COMPLAINTS = [];

function fmtNPR(n) {
  if (!n || n === 0) return 'रु. ०';
  if (n >= 10000000) return `रु. ${(n/10000000).toFixed(1)} क.`;
  if (n >= 100000)   return `रु. ${(n/100000).toFixed(0)} लाख`;
  return `रु. ${n.toLocaleString()}`;
}

async function loadEscalations() {
  try {
    const res = await fetch(`${API}/complaints`, { headers: authHdr() });
    if (res.status === 401) { redirectToLogin(); return []; }
    const { complaints } = await res.json();
    const escalated = complaints.filter(c => c.status === 'escalated');
    
    return escalated.map(c => ({
      id:          c._id,
      title_ne:    c.title,
      title_en:    c.title,
      desc_ne:     c.description,
      desc_en:     c.description,
      photo:       c.photo || null,
      lat:         c.location?.lat  || null,
      lng:         c.location?.lng  || null,
      landmark_ne: c.location?.landmark || '—',
      landmark_en: c.location?.landmark || '—',
      ward:        c.location?.ward  || '—',
      daysAgo:     Math.floor((Date.now() - new Date(c.updatedAt)) / 86400000),
      estCost:     '—',
      severity:    'high',
      _mongoId:    c._id,
    }));
  } catch (err) {
    console.error('Failed to load escalations:', err);
    return [];
  }
}

async function loadWardStats() {
  try {
    const [compRes, budRes] = await Promise.all([
      fetch(`${API}/complaints`, { headers: authHdr() }),
      fetch(`${API}/budgets`),
    ]);

    if (compRes.status === 401) { redirectToLogin(); return []; }

    const { complaints } = await compRes.json();
    const { budgets }    = budRes.ok ? await budRes.json() : { budgets: [] };

    const byWard = {};
    complaints.forEach(c => {
      const w = c.location?.ward;
      if (!w) return;
      byWard[w] = byWard[w] || { total: 0, resolved: 0, escalated: 0, msSum: 0, resolvedCount: 0 };
      byWard[w].total++;
      if (c.status === 'resolved') {
        byWard[w].resolved++;
        byWard[w].msSum += new Date(c.updatedAt) - new Date(c.createdAt);
        byWard[w].resolvedCount++;
      }
      if (c.status === 'escalated') byWard[w].escalated++;
    });

    const budByWard = {};
    budgets.forEach(b => { budByWard[b.ward] = b; });

    return Array.from({ length: 33 }, (_, i) => {
      const ward = i + 1;
      const s    = byWard[ward] || { total: 0, resolved: 0, escalated: 0, msSum: 0, resolvedCount: 0 };
      const rate = s.total ? Math.round((s.resolved / s.total) * 100) : 0;
      const avgMs = s.resolvedCount ? s.msSum / s.resolvedCount : 0;
      return {
        ward,
        total:     s.total,
        resolved:  s.resolved,
        escalated: s.escalated,
        rate,
        allocated: budByWard[ward]?.allocatedAmount || 0,
        used:      budByWard[ward]?.spentAmount     || 0,
        avgDays:   s.resolvedCount ? (avgMs / 86400000).toFixed(1) : '—',
      };
    });
  } catch (err) {
    console.error('Failed to load ward stats:', err);
    return [];
  }
}

function renderAllComplaints(complaints) {
  const tbody   = document.getElementById('allComplaintsBody');
  const countEl = document.getElementById('allComplaintCount');
  const en = isEn();
  if (!tbody) return;

  if (countEl) countEl.textContent = en ? `${complaints.length} complaints` : `${complaints.length} गुनासोहरू`;

  const STATUS_LABELS = {
    'pending':     { ne: 'समीक्षामा',    en: 'Pending' },
    'in-progress': { ne: 'प्रक्रियामा',  en: 'In Progress' },
    'resolved':    { ne: 'समाधान भएको', en: 'Resolved' },
    'escalated':   { ne: 'एस्कलेट',      en: 'Escalated' },
  };

  if (!complaints.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--gray);">
      ${en ? 'No complaints yet.' : 'हालसम्म कुनै गुनासो छैन।'}
    </td></tr>`;
    return;
  }

  tbody.innerHTML = complaints.map(c => {
    const label = STATUS_LABELS[c.status] || { ne: c.status, en: c.status };
    const badgeClass = c.status === 'escalated' ? 'b-escalated'
      : c.status === 'resolved' ? 'b-resolved'
      : c.status === 'in-progress' ? 'b-progress' : 'b-review';
    const photoCell = c.photo
      ? `<img src="${c.photo}" style="width:44px;height:44px;object-fit:cover;border-radius:8px;border:1px solid var(--border);" alt="Photo">`
      : `<div style="width:44px;height:44px;border-radius:8px;border:1.5px dashed var(--border);background:var(--bg);"></div>`;

    return `
      <tr>
        <td class="cell-id">${c._id.slice(-5).toUpperCase()}</td>
        <td class="cell-title-col">
          <div class="cell-title">${c.title}</div>
          <div class="cell-sub">${c.location?.landmark || '—'}</div>
        </td>
        <td class="td-num">${c.location?.ward ?? '—'}</td>
        <td class="cell-desc" style="max-width:200px;">
          <span style="font-size:0.82rem;color:var(--gray);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${c.description}</span>
        </td>
        <td>${photoCell}</td>
        <td>
          <span class="badge ${badgeClass}"><span class="badge-dot"></span>${en ? label.en : label.ne}</span>
        </td>
        <td>
          <div style="display:flex;gap:6px;align-items:center;">
            <select class="status-select-mini" onchange="metroChangeStatus(this, '${c._id}')" style="border:1.5px solid var(--border);border-radius:6px;padding:4px 8px;font-size:0.72rem;font-family:inherit;">
              <option value="pending" ${c.status === 'pending' ? 'selected' : ''}>${en ? 'Pending' : 'समीक्षामा'}</option>
              <option value="in-progress" ${c.status === 'in-progress' ? 'selected' : ''}>${en ? 'In Progress' : 'प्रक्रियामा'}</option>
              <option value="resolved" ${c.status === 'resolved' ? 'selected' : ''}>${en ? 'Resolved' : 'समाधान'}</option>
            </select>
            <button class="action-btn" onclick="openComplaintDetailModal('${c._id}')" title="View">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

async function metroChangeStatus(selectEl, complaintId) {
  const newStatus = selectEl.value;
  try {
    const res = await fetch(`${API}/complaints/${complaintId}/status`, {
      method: 'PUT',
      headers: authHdr(),
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.status === 401) { redirectToLogin(); return; }
    if (res.ok) {
      // Reload data to reflect changes
      location.reload();
    }
  } catch (err) {
    console.error('Status change failed:', err);
  }
}

async function loadAllComplaints() {
  try {
    const res = await fetch(`${API}/complaints`, { headers: authHdr() });
    if (res.status === 401) { redirectToLogin(); return; }
    const { complaints } = await res.json();
    ALL_COMPLAINTS = complaints;
    renderAllComplaints(complaints);
  } catch (err) {
    console.error('Failed to load all complaints:', err);
  }
}

function renderQueueList(escalations) {
  const list = document.getElementById('queueList');
  if (!list) return;
  const en = isEn();

  if (!escalations.length) {
    list.innerHTML = `<div style="padding:24px;text-align:center;color:var(--gray);">
      ${en ? 'No active escalations right now.' : 'हाल कुनै सक्रिय एस्कलेसन छैन।'}
    </div>`;
    return;
  }

  list.innerHTML = escalations.slice(0, 5).map(c => `
    <div class="queue-item">
      <div class="queue-body">
        <div class="queue-top">
          <div>
            <div class="queue-id">${c.id}</div>
            <div class="queue-title">${en ? c.title_en : c.title_ne}</div>
          </div>
        </div>
        <div class="queue-meta">
          <span class="meta-chip">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/></svg>
            ${en ? 'Ward' : 'वडा'} ${c.ward}
          </span>
          <span class="meta-chip">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${c.daysAgo} ${en ? 'days ago' : 'दिन पहिले'}
          </span>
        </div>
        <div class="queue-actions">
          <button class="btn btn-outline btn-sm" onclick="openComplaintDetailModal('${c.id}')">
            ${en ? 'View Details' : 'विवरण हेर्नुहोस्'}
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderWardTable(wardStats) {
  const tbody = document.getElementById('wardTableBody');
  if (!tbody) return;
  const en = isEn();

  const sorted = [...wardStats].sort((a, b) => b.rate - a.rate);
  const top5 = sorted.slice(0, 5);

  const fillClass = r => r >= 85 ? 'fill-green' : r >= 60 ? 'fill-gold' : 'fill-red';
  const pctClass  = r => r >= 85 ? 'pct-green'  : r >= 60 ? 'pct-gold'  : 'pct-red';

  tbody.innerHTML = top5.map((w, i) => `
    <tr>
      <td><span class="ward-rank ${i < 2 ? '' : i < 4 ? 'rank-mid' : 'rank-low'}">${i + 1}</span></td>
      <td class="ward-name-cell">${en ? 'Ward' : 'वडा'} ${w.ward}</td>
      <td class="td-num">${w.total}</td>
      <td class="td-num ${w.escalated >= 4 ? 'escalation-high' : 'escalation-count'}">${w.escalated}</td>
      <td>
        <div class="resolution-bar-wrap">
          <div class="resolution-track">
            <div class="resolution-fill ${fillClass(w.rate)}" style="width:${w.rate}%;"></div>
          </div>
          <span class="resolution-pct ${pctClass(w.rate)}">${w.rate}%</span>
        </div>
      </td>
      <td class="td-budget">${fmtNPR(w.allocated)}</td>
      <td class="td-budget-used">${fmtNPR(w.used)}</td>
      <td class="td-time">${w.avgDays} ${en ? 'd' : 'दिन'}</td>
    </tr>
  `).join('');
}

function updateStatCards(escalations, wardStats) {
  const total      = wardStats.reduce((s, w) => s + w.total, 0);
  const totalBudget = wardStats.reduce((s, w) => s + w.allocated, 0);
  const totalSpent  = wardStats.reduce((s, w) => s + w.used,      0);
  const utilPct     = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const activeWards = wardStats.filter(w => w.total > 0).length;

  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  setEl('statTotal',     total);
  setEl('statEscalated', escalations.length);
  setEl('statWards',     `${activeWards}/33`);

  const utilFill = document.querySelector('.stat-card.budget .util-fill');
  const utilPctEl = document.querySelector('.stat-card.budget .util-pct');
  const statNumBudget = document.querySelector('.stat-card.budget .stat-num');
  if (utilFill)    utilFill.style.width = `${utilPct}%`;
  if (utilPctEl)   utilPctEl.textContent = `${utilPct}%`;
  if (statNumBudget) statNumBudget.textContent = `${utilPct}%`;
}

/* ── 6. Modal — All Escalations List ── */
function openEscalationsModal() {
  const body = document.getElementById('escalationsModalBody');
  const en   = isEn();

  body.innerHTML = STATIC_ESCALATIONS.map(c => `
    <div class="esc-modal-item">
      <div class="esc-modal-header">
        <div>
          <div class="esc-modal-id">${c.id}</div>
          <div class="esc-modal-title">${en ? c.title_en : c.title_ne}</div>
        </div>
      </div>
      <div class="esc-modal-body">
        ${c.photo
          ? `<img src="${c.photo}" class="esc-photo" alt="Complaint photo">`
          : `<div class="esc-photo-placeholder">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                 <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                 <circle cx="12" cy="13" r="4"/>
               </svg>
               ${en ? 'No photo uploaded' : 'फोटो उपलब्ध छैन'}
             </div>`
        }
        <p class="esc-desc">${en ? c.desc_en : c.desc_ne}</p>
        <div class="esc-meta-row">
          <span class="esc-meta-chip">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/></svg>
            ${en ? 'Ward' : 'वडा'} ${c.ward}
          </span>
          <span class="esc-meta-chip">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            ${en ? c.landmark_en : c.landmark_ne}
          </span>
          <span class="esc-meta-chip">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${c.daysAgo} ${en ? 'days ago' : 'दिन पहिले'}
          </span>
        </div>
        ${c.lat && c.lng ? `
          <a class="esc-map-link"
             href="https://www.openstreetmap.org/?mlat=${c.lat}&mlon=${c.lng}&zoom=17"
             target="_blank" rel="noopener">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
              <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
            </svg>
            ${en ? `Open on map (${c.lat.toFixed(4)}, ${c.lng.toFixed(4)})` : `नक्सामा हेर्नुहोस् (${c.lat.toFixed(4)}, ${c.lng.toFixed(4)})`}
          </a>` : ''}
      </div>
      <div class="esc-modal-footer">
        <button class="btn btn-outline btn-sm" onclick="closeEscalationsModal(); openComplaintDetailModal('${c.id}')">
          ${en ? 'Full Detail' : 'पूर्ण विवरण'}
        </button>
      </div>
    </div>
  `).join('');

  document.getElementById('escalationsOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeEscalationsModal() {
  document.getElementById('escalationsOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* ── 7. Modal — Single Complaint Detail (WITH MAP LINK) ── */
async function openComplaintDetailModal(id) {
  const en = isEn();
  const body  = document.getElementById('complaintDetailBody');
  const title = document.getElementById('complaintDetailTitle');

  title.innerHTML = en ? 'Loading…' : 'लोड हुँदैछ...';
  body.innerHTML = '';
  document.getElementById('complaintDetailOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';

  try {
    const res = await fetch(`${API}/complaints/${id}`, { headers: authHdr() });
    const { complaint: c } = await res.json();
    const STATUS_LABELS = {
      'pending': { ne: 'समीक्षामा', en: 'Pending' },
      'in-progress': { ne: 'प्रक्रियामा', en: 'In Progress' },
      'resolved': { ne: 'समाधान भएको', en: 'Resolved' },
      'escalated': { ne: 'एस्कलेट', en: 'Escalated' },
    };
    const s = STATUS_LABELS[c.status] || { ne: c.status, en: c.status };

    body.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:16px;">
        ${c.photo ? `<img src="${c.photo}" style="width:100%;max-height:250px;object-fit:cover;border-radius:12px;border:1px solid var(--border);" alt="Photo">` : ''}
        <div>
          <h4 style="font-size:1.1rem;font-weight:700;color:var(--ink);margin-bottom:4px;">${c.title}</h4>
          <p style="color:var(--gray);font-size:0.9rem;">${c.description}</p>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:10px;">
          <span style="background:var(--bg);border:1px solid var(--border);padding:4px 12px;border-radius:999px;font-size:0.82rem;">
            ${en ? 'Ward' : 'वडा'} ${c.location?.ward || '—'}
          </span>
          <span style="background:var(--bg);border:1px solid var(--border);padding:4px 12px;border-radius:999px;font-size:0.82rem;">
            ${c.location?.landmark || '—'}
          </span>
          <span style="background:var(--bg);border:1px solid var(--border);padding:4px 12px;border-radius:999px;font-size:0.82rem;">
            ${en ? s.en : s.ne}
          </span>
        </div>
        ${c.location?.lat ? `
          <a href="https://www.openstreetmap.org/?mlat=${c.location.lat}&mlon=${c.location.lng}&zoom=17"
             target="_blank" rel="noopener"
             style="display:inline-flex;align-items:center;gap:6px;font-size:0.82rem;font-weight:600;color:var(--info);text-decoration:none;padding:8px 14px;background:var(--info-bg);border-radius:8px;margin-top:8px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
              <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
            </svg>
            ${en ? 'View on Map' : 'नक्सामा हेर्नुहोस्'} (${c.location.lat.toFixed(4)}, ${c.location.lng.toFixed(4)})
          </a>` : ''}
        <div style="margin-top:8px;display:flex;gap:8px;">
          <select id="detailStatusSelect" style="border:1.5px solid var(--border);border-radius:6px;padding:6px 10px;font-size:0.82rem;font-family:inherit;">
            <option value="pending" ${c.status === 'pending' ? 'selected' : ''}>${en ? 'Pending' : 'समीक्षामा'}</option>
            <option value="in-progress" ${c.status === 'in-progress' ? 'selected' : ''}>${en ? 'In Progress' : 'प्रक्रियामा'}</option>
            <option value="resolved" ${c.status === 'resolved' ? 'selected' : ''}>${en ? 'Resolved' : 'समाधान'}</option>
          </select>
          <button class="btn btn-primary btn-sm" onclick="updateStatusFromDetail('${c._id}')">
            ${en ? 'Update Status' : 'स्थिती अपडेट गर्नुहोस्'}
          </button>
        </div>
      </div>
    `;
    title.innerHTML = `<span data-lang="ne">गुनासो विवरण</span><span data-lang="en">Complaint Detail</span>`;
  } catch (err) {
    body.innerHTML = `<p style="color:var(--error);">${en ? 'Failed to load complaint.' : 'गुनासो लोड गर्न असफल।'}</p>`;
  }
}

async function updateStatusFromDetail(id) {
  const select = document.getElementById('detailStatusSelect');
  if (!select) return;
  try {
    const res = await fetch(`${API}/complaints/${id}/status`, {
      method: 'PUT',
      headers: authHdr(),
      body: JSON.stringify({ status: select.value }),
    });
    if (res.ok) {
      closeComplaintDetailModal();
      location.reload();
    }
  } catch (err) {
    console.error('Update failed:', err);
  }
}

function closeComplaintDetailModal() {
  document.getElementById('complaintDetailOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* ── 8. Modal — All 33 Wards Performance ── */
function openWardPerformanceModal() {
  const en   = isEn();
  const body = document.getElementById('wardPerfModalBody');

  const sorted = [...ALL_WARDS_DATA].sort((a, b) => b.rate - a.rate);
  const fillClass = r => r >= 85 ? 'fill-green' : r >= 60 ? 'fill-gold' : 'fill-red';
  const pctClass  = r => r >= 85 ? 'pct-green'  : r >= 60 ? 'pct-gold'  : 'pct-red';

  body.innerHTML = `
    <div class="table-scroll">
      <table class="ward-modal-table">
        <thead>
          <tr>
            <th>#</th>
            <th>${en ? 'Ward' : 'वडा'}</th>
            <th>${en ? 'Total' : 'कुल'}</th>
            <th>${en ? 'Escalations' : 'एस्कलेसन'}</th>
            <th>${en ? 'Resolved' : 'समाधान'}</th>
            <th style="min-width:130px;">${en ? 'Resolution Rate' : 'समाधान दर'}</th>
            <th>${en ? 'Allocated' : 'विनियोजित'}</th>
            <th>${en ? 'Used' : 'खर्च'}</th>
            <th>${en ? 'Avg. Time' : 'औसत समय'}</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map((w, i) => `
            <tr>
              <td><span class="ward-rank ${w.rate >= 85 ? '' : w.rate >= 60 ? 'rank-mid' : 'rank-low'}">${i + 1}</span></td>
              <td class="ward-name-cell">${en ? 'Ward' : 'वडा'} ${w.ward}</td>
              <td class="td-num">${w.total}</td>
              <td class="td-num ${w.escalated >= 4 ? 'escalation-high' : 'escalation-count'}">${w.escalated}</td>
              <td class="td-num">${w.resolved}</td>
              <td>
                <div class="resolution-bar-wrap">
                  <div class="resolution-track">
                    <div class="resolution-fill ${fillClass(w.rate)}" style="width:${w.rate}%;transition:width 0.6s ease;"></div>
                  </div>
                  <span class="resolution-pct ${pctClass(w.rate)}">${w.rate}%</span>
                </div>
              </td>
              <td class="td-budget">${fmtNPR(w.allocated)}</td>
              <td class="td-budget-used">${fmtNPR(w.used)}</td>
              <td class="td-time">${w.avgDays} ${en ? 'd' : 'दिन'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('wardPerfOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';

  setTimeout(() => {
    document.querySelectorAll('#wardPerfModalBody .resolution-fill').forEach(bar => {
      const w = bar.style.width;
      bar.style.width = '0%';
      requestAnimationFrame(() => { bar.style.width = w; });
    });
  }, 50);
}

function closeWardPerformanceModal() {
  document.getElementById('wardPerfOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* ── 9. Settings modal ── */
function openSettingsModal() {
  document.getElementById('settingsOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeSettingsModal() {
  document.getElementById('settingsOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* Close any modal on Escape */
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  closeEscalationsModal();
  closeComplaintDetailModal();
  closeWardPerformanceModal();
  closeSettingsModal();
});

/* ── 10. Init ── */
document.addEventListener('DOMContentLoaded', async () => {
  if (!getToken()) { redirectToLogin(); return; }

  const savedLang = localStorage.getItem('nagarikAawazLang') || 'ne';
  if (savedLang === 'en') setLang('en');

  const [escalations, wardStats] = await Promise.all([
    loadEscalations(),
    loadWardStats(),
  ]);

  STATIC_ESCALATIONS = escalations;
  ALL_WARDS_DATA     = wardStats;

  renderQueueList(escalations);
  renderWardTable(wardStats);
  loadAllComplaints();
  updateStatCards(escalations, wardStats);
  animateBars();
});