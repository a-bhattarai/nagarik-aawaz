/* ================================================================
   NAGARIK AAWAZ — dashboard-ward.js

   CRITICAL: Backend status enum values are:
     'pending' | 'in-progress' | 'resolved' | 'escalated'
   The status-select options in HTML must use these exact values.
================================================================ */

const API      = 'http://localhost:5001/api';
const getToken = () => localStorage.getItem('nagarikAawazToken');
const authHdr  = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` });

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
  document.querySelectorAll('.stat-num[data-ne]').forEach(el => {
    el.textContent = lang === 'en' ? el.dataset.en : el.dataset.ne;
  });
}

function toNe(n) {
  const map = {'0':'०','1':'१','2':'२','3':'३','4':'४','5':'५','6':'६','7':'७','8':'८','9':'९'};
  return String(n).split('').map(d => map[d] ?? d).join('');
}

/* ── Mobile sidebar ── */
function toggleSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const backdrop = document.getElementById('sbBackdrop');
  const iconOpen  = document.getElementById('sbIconOpen');
  const iconClose = document.getElementById('sbIconClose');
  const btn       = document.getElementById('menuToggleSb');

  const isOpen = sidebar.classList.toggle('open');
  backdrop.classList.toggle('show', isOpen);
  btn?.setAttribute('aria-expanded', String(isOpen));
  if (iconOpen)  iconOpen.style.display  = isOpen ? 'none'  : 'block';
  if (iconClose) iconClose.style.display = isOpen ? 'block' : 'none';
}

/* ── Notification panel ── */
let notifOpen = false;

function toggleNotifPanel() {
  const panel = document.getElementById('notifPanel');
  if (!panel) return;
  notifOpen = !notifOpen;
  panel.style.display = notifOpen ? 'block' : 'none';
  document.getElementById('notifBtn')?.setAttribute('aria-expanded', String(notifOpen));
}

function markAllRead() {
  document.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
  const dot = document.getElementById('notifDot');
  if (dot) dot.style.display = 'none';
}

/* ── Modal helpers ── */
const MODAL_CONTENT = {
  escalated: {
    title_ne: 'महानगरमा पठाइएका गुनासोहरू',
    title_en: 'Complaints Escalated to Metro',
  },
  budget: {
    title_ne: 'वडा बजेट',
    title_en: 'Ward Budget',
  },
  reports: {
    title_ne: 'प्रतिवेदनहरू',
    title_en: 'Reports',
  },
  settings: {
    title_ne: 'सेटिङ',
    title_en: 'Settings',
  },
};

async function openModal(key) {
  const overlay = document.getElementById('modalOverlay');
  const en = document.body.classList.contains('lang-mode-en');
  if (!overlay) return;

  document.getElementById('modalTitle').textContent = en ? MODAL_CONTENT[key].title_en : MODAL_CONTENT[key].title_ne;
  const bodyEl = document.getElementById('modalBody');
  bodyEl.innerHTML = `<p style="color:var(--gray);">${en ? 'Loading…' : 'लोड हुँदैछ...'}</p>`;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  if (key === 'escalated') {
    try {
      const res = await fetch(`${API}/complaints`, { headers: authHdr() });
      const { complaints } = await res.json();
      const escalated = complaints.filter(c => c.status === 'escalated');
      bodyEl.innerHTML = escalated.length ? escalated.map(c => `
        <div style="padding:12px;border:1px solid var(--border);border-radius:8px;margin-bottom:10px;">
          <div style="font-weight:700;font-size:0.85rem;color:var(--green-deep);">${c._id.slice(-5).toUpperCase()}</div>
          <div style="font-weight:600;margin:4px 0;">${c.title}</div>
          <div style="font-size:0.82rem;color:var(--gray);">${c.location?.landmark || '—'}</div>
        </div>
      `).join('') : `<p style="color:var(--gray);">${en ? 'No complaints escalated yet.' : 'हालसम्म कुनै एस्कलेट भएको छैन।'}</p>`;
    } catch { bodyEl.innerHTML = `<p style="color:var(--error);">${en ? 'Failed to load.' : 'लोड गर्न असफल।'}</p>`; }

  } else if (key === 'budget') {
    try {
      const res = await fetch(`${API}/budgets?ward=8`);
      const { budgets } = await res.json();
      const b = budgets && budgets[0];
      bodyEl.innerHTML = b ? `
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div><strong>${en ? 'Fiscal Year' : 'आर्थिक वर्ष'}:</strong> ${b.fiscalYear}</div>
          <div><strong>${en ? 'Allocated' : 'विनियोजित'}:</strong> रु. ${b.allocatedAmount.toLocaleString()}</div>
          <div><strong>${en ? 'Spent' : 'खर्च भएको'}:</strong> रु. ${b.spentAmount.toLocaleString()}</div>
          <div><strong>${en ? 'Remaining' : 'बाँकी'}:</strong> रु. ${(b.allocatedAmount - b.spentAmount).toLocaleString()}</div>
        </div>` : `<p style="color:var(--gray);">${en ? 'No budget record found for Ward 8 yet.' : 'वडा ८ को लागि बजेट रेकर्ड फेला परेन।'}</p>`;
    } catch { bodyEl.innerHTML = `<p style="color:var(--error);">${en ? 'Failed to load budget.' : 'बजेट लोड गर्न असफल।'}</p>`; }

  } else if (key === 'reports') {
    try {
      const res = await fetch(`${API}/complaints`, { headers: authHdr() });
      const { complaints } = await res.json();
      const resolved = complaints.filter(c => c.status === 'resolved').length;
      bodyEl.innerHTML = `
        <p style="margin-bottom:10px;">${en ? 'Quick summary for Ward 8:' : 'वडा ८ को छोटो सारांश:'}</p>
        <div>${en ? 'Total complaints' : 'कुल गुनासो'}: <strong>${complaints.length}</strong></div>
        <div>${en ? 'Resolved' : 'समाधान भएका'}: <strong>${resolved}</strong></div>
        <p style="margin-top:14px;color:var(--gray);font-size:0.82rem;">${en ? 'Downloadable PDF reports coming soon.' : 'डाउनलोड योग्य PDF प्रतिवेदन चाँडै आउनेछ।'}</p>`;
    } catch { bodyEl.innerHTML = `<p style="color:var(--error);">${en ? 'Failed to load.' : 'लोड गर्न असफल।'}</p>`; }

  } else {
    bodyEl.innerHTML = `<p style="color:var(--gray);">${en ? 'Settings coming soon.' : 'सेटिङ चाँडै आउनेछ।'}</p>`;
  }
}

function closeModal() {
  document.getElementById('modalOverlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

/* ── Filter ── */
function applyFilters() {
  const search    = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const statusVal = document.getElementById('statusFilter')?.value || '';
  let visible     = 0;

  document.querySelectorAll('#tableBody tr').forEach(row => {
    const text   = row.textContent.toLowerCase();
    const status = row.dataset.status || '';
    const show   = (!search || text.includes(search)) && (!statusVal || status === statusVal);
    row.style.display = show ? '' : 'none';
    if (show) visible++;
  });

  const countEl = document.getElementById('complaintCount');
  if (countEl) {
    const isEn = document.body.classList.contains('lang-mode-en');
    countEl.textContent = isEn ? `${visible} complaints` : `${toNe(visible)} गुनासोहरू`;
  }
}

function clearFilters() {
  const searchEl = document.getElementById('searchInput');
  const filterEl = document.getElementById('statusFilter');
  if (searchEl) searchEl.value = '';
  if (filterEl) filterEl.value = '';
  applyFilters();
}

/* ── Status change ── */
async function handleStatusChange(selectEl, complaintId) {
  const newStatus = selectEl.value;
  const row       = selectEl.closest('tr');
  const origValue = selectEl.dataset.origValue || '';

  try {
    const res = await fetch(`${API}/complaints/${complaintId}/status`, {
      method: 'PUT',
      headers: authHdr(),
      body: JSON.stringify({ status: newStatus }),
    });

    if (res.status === 401) { redirectToLogin(); return; }

    if (res.ok) {
      row.dataset.status = newStatus;
      selectEl.dataset.origValue = newStatus;
    } else {
      const data = await res.json();
      console.error('Status update failed:', data.message);
      // Revert dropdown
      selectEl.value = origValue;
    }
  } catch (err) {
    console.error('Status update failed:', err);
    selectEl.value = origValue;
  }
}

/* ── Escalate complaint ── */
async function escalateComplaint(complaintId) {
  const isNe = !document.body.classList.contains('lang-mode-en');
  const msg  = isNe
    ? `${complaintId} — यो गुनासो महानगरपालिकामा पठाउने हो? यो कार्य फिर्ता हुन सक्दैन।`
    : `Escalate ${complaintId} to Metro City? This cannot be undone.`;

  if (!confirm(msg)) return;

  try {
    const res = await fetch(`${API}/complaints/${complaintId}/status`, {
      method: 'PUT',
      headers: authHdr(),
      body: JSON.stringify({ status: 'escalated' }),
    });

    if (res.status === 401) { redirectToLogin(); return; }

    if (res.ok) {
      // Find the row and update UI
      document.querySelectorAll('#tableBody tr').forEach(row => {
        const idEl = row.querySelector('.cell-id');
        if (!idEl || !idEl.textContent.includes(complaintId.slice(-5))) return;

        row.dataset.status = 'escalated';

        const statusCell = row.querySelector('td:nth-child(5)');
        if (statusCell) {
          statusCell.innerHTML = `
            <span class="badge b-escalated">
              <span class="badge-dot"></span>
              <span data-lang="ne">महानगरमा पठाइयो</span>
              <span data-lang="en">Escalated</span>
            </span>`;
          if (document.body.classList.contains('lang-mode-en')) {
            statusCell.querySelector('[data-lang="ne"]').style.display = 'none';
            statusCell.querySelector('[data-lang="en"]').style.display = 'inline';
          }
        }
        row.querySelector('.btn-escalate')?.remove();
      });
    } else {
      const data = await res.json();
      alert(data.message || 'Escalation failed.');
    }
  } catch (err) {
    console.error('Escalation failed:', err);
  }
}

/* ── View complaint detail ── */
async function viewComplaint(complaintId) {
  try {
    const res = await fetch(`${API}/complaints/${complaintId}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (res.status === 401) { redirectToLogin(); return; }
    const { complaint } = await res.json();
    const isEn = document.body.classList.contains('lang-mode-en');

    const STATUS_LABELS = {
      'pending':     { ne: 'समीक्षामा',     en: 'Pending Review' },
      'in-progress': { ne: 'प्रक्रियामा',   en: 'In Progress' },
      'resolved':    { ne: 'समाधान भएको',   en: 'Resolved' },
      'escalated':   { ne: 'महानगरमा पठाइयो', en: 'Escalated' },
    };
    const statusLabel = STATUS_LABELS[complaint.status]?.[isEn ? 'en' : 'ne'] || complaint.status;

    document.getElementById('modalTitle').textContent =
      `${complaint._id.slice(-5).toUpperCase()} — ${complaint.title}`;

    document.getElementById('modalBody').innerHTML = `
      <div style="display:flex;flex-direction:column;gap:16px;">
        ${complaint.photo
          ? `<img src="${complaint.photo}" style="width:100%;max-height:220px;object-fit:cover;border-radius:10px;border:1px solid var(--border);" alt="Photo">`
          : `<div style="width:100%;height:70px;background:var(--bg);border:1.5px dashed var(--border);border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--gray);font-size:0.82rem;">${isEn ? 'No photo submitted' : 'फोटो छैन'}</div>`}
        <div>
          <div style="font-size:0.66rem;font-weight:700;color:var(--gray);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">${isEn ? 'DESCRIPTION' : 'विवरण'}</div>
          <p style="font-size:0.87rem;color:var(--gray);line-height:1.7;">${complaint.description}</p>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <div style="flex:1;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;">
            <div style="font-size:0.66rem;font-weight:700;color:var(--gray);text-transform:uppercase;margin-bottom:4px;">${isEn ? 'WARD' : 'वडा'}</div>
            <div style="font-weight:700;">${isEn ? 'Ward' : 'वडा नं.'} ${complaint.location?.ward ?? '—'}</div>
          </div>
          <div style="flex:1;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;">
            <div style="font-size:0.66rem;font-weight:700;color:var(--gray);text-transform:uppercase;margin-bottom:4px;">${isEn ? 'STATUS' : 'स्थिती'}</div>
            <div style="font-weight:700;">${statusLabel}</div>
          </div>
        </div>
        ${complaint.location?.landmark
          ? `<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;">
               <div style="font-size:0.66rem;font-weight:700;color:var(--gray);text-transform:uppercase;margin-bottom:4px;">${isEn ? 'LANDMARK' : 'चिनारी स्थान'}</div>
               <div style="font-weight:600;">${complaint.location.landmark}</div>
             </div>` : ''}
        ${complaint.location?.lat
          ? `<a href="https://www.openstreetmap.org/?mlat=${complaint.location.lat}&mlon=${complaint.location.lng}&zoom=17"
               target="_blank" rel="noopener"
               style="display:inline-flex;align-items:center;gap:6px;font-size:0.8rem;font-weight:600;color:var(--info);">
               ${isEn ? 'Open on map' : 'नक्सामा हेर्नुहोस्'}
               (${complaint.location.lat.toFixed(4)}, ${complaint.location.lng.toFixed(4)})
             </a>` : ''}
      </div>`;

    document.getElementById('modalOverlay')?.classList.add('open');
    document.body.style.overflow = 'hidden';
  } catch (err) {
    console.error('Failed to fetch complaint detail:', err);
  }
}

/* ── Load complaints from backend ── */
async function loadComplaints() {
  try {
    const res = await fetch(`${API}/complaints`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (res.status === 401) { redirectToLogin(); return; }
    const { complaints } = await res.json();
    renderComplaints(complaints);
    renderEscalatedSection(complaints);
    updateStats(complaints);
  } catch (err) {
    console.error('Failed to load complaints:', err);
  }
}

function renderEscalatedSection(complaints) {
  const tbody = document.getElementById('escalatedSectionBody');
  const countEl = document.getElementById('escalatedCount');
  if (!tbody) return;
  const en = document.body.classList.contains('lang-mode-en');
  const escalated = complaints.filter(c => c.status === 'escalated');

  if (countEl) countEl.textContent = en ? `${escalated.length} escalated` : `${toNe(escalated.length)} एस्कलेट भएका`;

  if (!escalated.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--gray);">
      ${en ? 'No complaints escalated yet.' : 'हालसम्म कुनै गुनासो एस्कलेट भएको छैन।'}</td></tr>`;
    return;
  }

  tbody.innerHTML = escalated.map(c => `
    <tr>
      <td class="cell-id">${c._id.slice(-5).toUpperCase()}</td>
      <td class="cell-title-col">
        <div class="cell-title">${c.title}</div>
        <div class="cell-landmark">${c.location?.landmark || '—'}</div>
      </td>
      <td class="cell-desc"><span class="desc-text">${c.description}</span></td>
      <td>
        <button class="action-btn btn-view" onclick="viewComplaint('${c._id}')" title="View">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </td>
    </tr>
  `).join('');
}

/* ── Update stat cards ── */
function updateStats(complaints) {
  const pending   = complaints.filter(c => c.status === 'pending').length;
  const progress  = complaints.filter(c => c.status === 'in-progress').length;
  const escalated = complaints.filter(c => c.status === 'escalated').length;
  const resolved  = complaints.filter(c => c.status === 'resolved').length;

  const setNum = (el, val) => {
    if (!el) return;
    el.dataset.ne = toNe(val);
    el.dataset.en = String(val);
    el.textContent = document.body.classList.contains('lang-mode-en') ? val : toNe(val);
  };

  setNum(document.querySelector('.s-pending  .stat-num'), pending);
  setNum(document.querySelector('.s-field    .stat-num'), progress);
  setNum(document.querySelector('.s-escalated .stat-num'), escalated);
  setNum(document.querySelector('.s-resolved .stat-num'), resolved);
}

/* ── Render table ── */
function renderComplaints(complaints) {
  const tbody = document.getElementById('tableBody');
  if (!tbody) return;

  const count = document.getElementById('complaintCount');
  if (count) {
    const isEn = document.body.classList.contains('lang-mode-en');
    count.textContent = isEn
      ? `${complaints.length} complaints`
      : `${toNe(complaints.length)} गुनासोहरू`;
  }

  if (complaints.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--gray);">
      <span data-lang="ne">यस वडामा कुनै गुनासो छैन।</span>
      <span data-lang="en">No complaints in this ward yet.</span>
    </td></tr>`;
    return;
  }

  const STATUS_OPTS_NE = {
    'pending':     'समीक्षामा',
    'in-progress': 'प्रक्रियामा',
    'resolved':    'समाधान',
    'escalated':   'एस्कलेट',
  };

  tbody.innerHTML = complaints.map(c => {
    const isEscalated = c.status === 'escalated';
    const photoCell = c.photo
      ? `<img src="${c.photo}" class="photo-thumb-img" alt="Photo">`
      : `<div class="photo-placeholder">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
             <circle cx="12" cy="13" r="4"/>
           </svg>
         </div>`;

    const statusCell = isEscalated
      ? `<span class="badge b-escalated"><span class="badge-dot"></span>
           <span data-lang="ne">महानगरमा पठाइयो</span>
           <span data-lang="en">Escalated</span>
         </span>`
      : `<select class="status-select"
           onchange="handleStatusChange(this, '${c._id}')"
           data-orig-value="${c.status}">
           <option value="pending"     ${c.status === 'pending'     ? 'selected' : ''}>समीक्षामा / Pending</option>
           <option value="in-progress" ${c.status === 'in-progress' ? 'selected' : ''}>प्रक्रियामा / In Progress</option>
           <option value="resolved"    ${c.status === 'resolved'    ? 'selected' : ''}>समाधान / Resolved</option>
         </select>`;

    const actionsCell = isEscalated
      ? `<button class="action-btn btn-view" onclick="viewComplaint('${c._id}')" title="View">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
           </svg>
         </button>`
      : `<button class="action-btn btn-escalate" onclick="escalateComplaint('${c._id}')" title="Escalate">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
           </svg>
         </button>
         <button class="action-btn btn-view" onclick="viewComplaint('${c._id}')" title="View">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
           </svg>
         </button>`;

    return `<tr data-status="${c.status}">
      <td class="cell-id">${c._id.slice(-5).toUpperCase()}</td>
      <td class="cell-title-col">
        <div class="cell-title">
          <span data-lang="ne">${c.title}</span>
          <span data-lang="en">${c.title}</span>
        </div>
        <div class="cell-landmark">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          <span data-lang="ne">${c.location?.landmark || '—'}, वडा ${c.location?.ward ?? '—'}</span>
          <span data-lang="en">${c.location?.landmark || '—'}, Ward ${c.location?.ward ?? '—'}</span>
        </div>
        ${c.location?.lat ? `<div class="cell-coords">${c.location.lat.toFixed(4)}, ${c.location.lng.toFixed(4)}</div>` : ''}
      </td>
      <td class="cell-desc">
        <span class="desc-text">${c.description}</span>
      </td>
      <td class="cell-photo">
        <div class="photo-thumb-wrap">${photoCell}</div>
      </td>
      <td>${statusCell}</td>
      <td>
        <div class="row-actions">${actionsCell}</div>
      </td>
    </tr>`;
  }).join('');
}

function exportReport() {
  alert(document.body.classList.contains('lang-mode-en')
    ? 'Export will be available once backend reporting endpoint is ready.'
    : 'ब्याकेन्ड तयार भएपछि निर्यात सुविधा उपलब्ध हुनेछ।');
}

/* ── Populate user info ── */
function populateUserInfo() {
  const name = localStorage.getItem('nagarikAawazName') || '';
  const ward = localStorage.getItem('nagarikAawazWard') || '';

  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const avatarEl = document.querySelector('.user-avatar');
  if (avatarEl && initials) avatarEl.textContent = initials;

  document.querySelectorAll('.uname[data-lang="ne"]').forEach(el => { if (name) el.textContent = name; });
  document.querySelectorAll('.uname[data-lang="en"]').forEach(el => { if (name) el.textContent = name; });

  const h2Ne = document.querySelector('.page-title h2[data-lang="ne"]');
  const h2En = document.querySelector('.page-title h2[data-lang="en"]');
  if (h2Ne && ward) h2Ne.textContent = `वडा नं. ${ward} — गुनासो व्यवस्थापन`;
  if (h2En && ward) h2En.textContent = `Ward ${ward} — Complaint Management`;
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  // Auth guard
  if (!getToken()) { redirectToLogin(); return; }

  const savedLang = localStorage.getItem('nagarikAawazLang') || 'ne';
  if (savedLang === 'en') setLang('en');
  else updateStatNumbers('ne');

  populateUserInfo();
  loadComplaints();

  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) {
      document.getElementById('sidebar')?.classList.remove('open');
      document.getElementById('sbBackdrop')?.classList.remove('show');
    }
  });

  // Close notif panel on outside click
  document.addEventListener('click', e => {
    const wrapper = document.querySelector('.notif-wrapper');
    if (notifOpen && wrapper && !wrapper.contains(e.target)) {
      document.getElementById('notifPanel').style.display = 'none';
      notifOpen = false;
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
});