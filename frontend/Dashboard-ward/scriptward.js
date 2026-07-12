/* ================================================================
   NAGARIK AAWAZ — dashboard-ward.js
   Sections:
     1.  Language toggle
     2.  Stat number switching
     3.  Mobile sidebar
     4.  Notification panel
     5.  Sidebar modal popups
     6.  Table: filter + search
     7.  Table: status change
     8.  Table: escalate complaint
     9.  Table: view complaint
     10. Backend integration (fetch from /api/complaints)
     11. Init
================================================================ */

/* ── 1. Language toggle ── */
function setLang(lang) {
  document.body.classList.toggle('lang-mode-en', lang === 'en');
  document.getElementById('btn-ne').classList.toggle('active', lang === 'ne');
  document.getElementById('btn-en').classList.toggle('active', lang === 'en');
  localStorage.setItem('nagarikAawazLang', lang);
  updateStatNumbers(lang);
}

/* ── 2. Stat number switching ── */
function updateStatNumbers(lang) {
  document.querySelectorAll('.stat-num[data-ne]').forEach(el => {
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

function handleSidebarResize() {
  if (window.innerWidth > 900) {
    const sidebar  = document.getElementById('sidebar');
    const backdrop = document.getElementById('sbBackdrop');
    sidebar.classList.remove('open');
    backdrop.classList.remove('show');
    document.getElementById('sbIconOpen').style.display  = 'block';
    document.getElementById('sbIconClose').style.display = 'none';
    document.getElementById('menuToggleSb').setAttribute('aria-expanded', 'false');
  }
}

/* ── 4. Notification panel ── */
let notifOpen = false;

function toggleNotifPanel() {
  const panel = document.getElementById('notifPanel');
  const btn   = document.getElementById('notifBtn');
  notifOpen = !notifOpen;
  panel.style.display = notifOpen ? 'block' : 'none';
  btn.setAttribute('aria-expanded', String(notifOpen));
}

function markAllRead() {
  document.querySelectorAll('.notif-item.unread').forEach(item => {
    item.classList.remove('unread');
  });
  document.getElementById('notifDot').style.display = 'none';
}

// Close notification panel when clicking outside
document.addEventListener('click', (e) => {
  const wrapper = document.querySelector('.notif-wrapper');
  if (notifOpen && wrapper && !wrapper.contains(e.target)) {
    document.getElementById('notifPanel').style.display = 'none';
    notifOpen = false;
    document.getElementById('notifBtn').setAttribute('aria-expanded', 'false');
  }
});

/* ── 5. Sidebar modal popups ──
   Each sidebar item (except the active one) opens a modal panel
   with relevant information for that section.
*/
const MODAL_CONTENT = {

  escalated: {
    title_ne: 'महानगरमा पठाइएका गुनासोहरू',
    title_en: 'Complaints Escalated to Metro',
    body_ne: `
      <div class="modal-list">
        <div class="modal-item">
          <div class="modal-item-icon" style="background:var(--error-bg);color:var(--error);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
            </svg>
          </div>
          <div class="modal-item-body">
            <h4>NA-2082-10188 — पुल भत्किने जोखिम</h4>
            <p>खोल्सी किनार, वडा ८ · अनुमानित खर्च: रु. ४२ लाख</p>
          </div>
        </div>
        <div class="modal-item">
          <div class="modal-item-icon" style="background:var(--error-bg);color:var(--error);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
            </svg>
          </div>
          <div class="modal-item-body">
            <h4>NA-2082-10102 — खानेपानी लाइन फुटेको</h4>
            <p>माथिल्लो टोल, वडा ८ · अनुमानित खर्च: रु. १५ लाख</p>
          </div>
        </div>
        <div class="modal-item">
          <div class="modal-item-icon" style="background:var(--error-bg);color:var(--error);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
            </svg>
          </div>
          <div class="modal-item-body">
            <h4>NA-2082-10089 — पुरानो भवन जोखिममा</h4>
            <p>बजार क्षेत्र, वडा ८ · महानगरले जाँच गरिरहेको</p>
          </div>
        </div>
      </div>
      
    `,
    body_en: `
      <div class="modal-list">
        <div class="modal-item">
          <div class="modal-item-icon" style="background:var(--error-bg);color:var(--error);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
            </svg>
          </div>
          <div class="modal-item-body">
            <h4>NA-2082-10188 — Bridge structural risk</h4>
            <p>Kholsi Bank, Ward 8 · Est. cost: NPR 4.2M</p>
          </div>
        </div>
        <div class="modal-item">
          <div class="modal-item-icon" style="background:var(--error-bg);color:var(--error);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
            </svg>
          </div>
          <div class="modal-item-body">
            <h4>NA-2082-10102 — Water main ruptured</h4>
            <p>Upper Tole, Ward 8 · Est. cost: NPR 1.5M</p>
          </div>
        </div>
        <div class="modal-item">
          <div class="modal-item-icon" style="background:var(--error-bg);color:var(--error);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
            </svg>
          </div>
          <div class="modal-item-body">
            <h4>NA-2082-10089 — Old building at risk</h4>
            <p>Market area, Ward 8 · Under metro inspection</p>
          </div>
        </div>
      </div>
      
    `,
  },

  budget: {
    title_ne: 'वडा बजेट — वडा नं. ८',
    title_en: 'Ward Budget — Ward No. 8',
    body_ne: `
      <div class="modal-list">
        <div class="modal-item">
          <div class="modal-item-icon" style="background:var(--green-light);color:var(--green-deep);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>
            </svg>
          </div>
          <div class="modal-item-body">
            <h4>कुल बजेट</h4>
            <p>रु. ४५ लाख — आ.व. २०८२/८३</p>
          </div>
        </div>
        <div class="modal-item">
          <div class="modal-item-icon" style="background:var(--warning-bg);color:var(--warning);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div class="modal-item-body">
            <h4>खर्च भएको</h4>
            <p>रु. २८ लाख (६२%) — अझै रु. १७ लाख बाँकी</p>
          </div>
        </div>
      </div>
      
    `,
    body_en: `
      <div class="modal-list">
        <div class="modal-item">
          <div class="modal-item-icon" style="background:var(--green-light);color:var(--green-deep);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>
            </svg>
          </div>
          <div class="modal-item-body">
            <h4>Total Budget</h4>
            <p>NPR 4.5M — FY 2082/83</p>
          </div>
        </div>
        <div class="modal-item">
          <div class="modal-item-icon" style="background:var(--warning-bg);color:var(--warning);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div class="modal-item-body">
            <h4>Spent</h4>
            <p>NPR 2.8M (62%) — NPR 1.7M remaining</p>
          </div>
        </div>
      </div>
      
    `,
  },

  reports: {
    title_ne: 'प्रतिवेदनहरू',
    title_en: 'Reports',
    body_ne: `
      <div class="modal-list">
        <div class="modal-item">
          <div class="modal-item-icon" style="background:var(--info-bg);color:var(--info);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div class="modal-item-body">
            <h4>मासिक गुनासो सारांश</h4>
            <p>फाल्गुण २०८२ — कुल: २६ · समाधान: १८ · बाँकी: ८</p>
          </div>
        </div>
        <div class="modal-item">
          <div class="modal-item-icon" style="background:var(--green-light);color:var(--green-deep);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>
            </svg>
          </div>
          <div class="modal-item-body">
            <h4>त्रैमासिक प्रदर्शन</h4>
            <p>समाधान दर: ८१% · औसत समयः ३.८ दिन</p>
          </div>
        </div>
      </div>
      <button class="modal-link" style="border:none;cursor:pointer;" onclick="exportReport(); closeModal();">
        Excel मा निर्यात गर्नुहोस् →
      </button>
    `,
    body_en: `
      <div class="modal-list">
        <div class="modal-item">
          <div class="modal-item-icon" style="background:var(--info-bg);color:var(--info);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div class="modal-item-body">
            <h4>Monthly Complaint Summary</h4>
            <p>Falgun 2082 — Total: 26 · Resolved: 18 · Pending: 8</p>
          </div>
        </div>
        <div class="modal-item">
          <div class="modal-item-icon" style="background:var(--green-light);color:var(--green-deep);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>
            </svg>
          </div>
          <div class="modal-item-body">
            <h4>Quarterly Performance</h4>
            <p>Resolution rate: 81% · Average time: 3.8 days</p>
          </div>
        </div>
      </div>
      <button class="modal-link" style="border:none;cursor:pointer;" onclick="exportReport(); closeModal();">
        Export to Excel →
      </button>
    `,
  },

  settings: {
    title_ne: 'सेटिङ',
    title_en: 'Settings',
    body_ne: `
      <div class="modal-list">
        <div class="modal-item">
          <div class="modal-item-icon" style="background:var(--green-light);color:var(--green-deep);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>
            </svg>
          </div>
          <div class="modal-item-body">
            <h4>प्रोफाइल</h4>
            <p>राम बहादुर थापा — वडा अध्यक्ष, वडा नं. ८</p>
          </div>
        </div>
        <div class="modal-item">
          <div class="modal-item-icon" style="background:var(--info-bg);color:var(--info);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <div class="modal-item-body">
            <h4>सूचना सेटिङ</h4>
            <p>नयाँ गुनासो र स्थिती परिवर्तनको लागि सूचना सक्षम छ।</p>
          </div>
        </div>
      </div>
    `,
    body_en: `
      <div class="modal-list">
        <div class="modal-item">
          <div class="modal-item-icon" style="background:var(--green-light);color:var(--green-deep);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>
            </svg>
          </div>
          <div class="modal-item-body">
            <h4>Profile</h4>
            <p>Ram B. Thapa — Ward Chair, Ward 8</p>
          </div>
        </div>
        <div class="modal-item">
          <div class="modal-item-icon" style="background:var(--info-bg);color:var(--info);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <div class="modal-item-body">
            <h4>Notification Settings</h4>
            <p>Notifications enabled for new complaints and status changes.</p>
          </div>
        </div>
      </div>
    `,
  },
};

function openModal(key) {
  const data    = MODAL_CONTENT[key];
  const overlay = document.getElementById('modalOverlay');
  const isEn    = document.body.classList.contains('lang-mode-en');

  document.getElementById('modalTitle').textContent = isEn ? data.title_en : data.title_ne;
  document.getElementById('modalBody').innerHTML    = isEn ? data.body_en  : data.body_ne;

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

/* ── 6. Table: filter + search ── */
function applyFilters() {
  const search     = document.getElementById('searchInput').value.toLowerCase();
  const statusVal  = document.getElementById('statusFilter').value;
  const rows       = document.querySelectorAll('#tableBody tr');
  let   visible    = 0;

  rows.forEach(row => {
    const text   = row.textContent.toLowerCase();
    const status = row.dataset.status || '';
    const matchesSearch = !search || text.includes(search);
    const matchesStatus = !statusVal || status === statusVal;

    if (matchesSearch && matchesStatus) {
      row.style.display = '';
      visible++;
    } else {
      row.style.display = 'none';
    }
  });

  // Update count
  const isNe = !document.body.classList.contains('lang-mode-en');
  const countEl = document.getElementById('complaintCount');
  if (countEl) {
    countEl.innerHTML = isNe
      ? `<span data-lang="ne">${visible} गुनासोहरू</span>`
      : `<span data-lang="en">${visible} complaints</span>`;
  }
}

function clearFilters() {
  document.getElementById('searchInput').value = '';
  document.getElementById('statusFilter').value = '';
  applyFilters();
}

/* ── 7. Table: status change ── */
function handleStatusChange(selectEl, complaintId) {
  const newStatus = selectEl.value;
  const row       = selectEl.closest('tr');

  // Update the row's data-status for filter to work correctly
  row.dataset.status = newStatus;

  console.log(`Status change: ${complaintId} → ${newStatus}`);

  
     fetch(`http://localhost:5000/api/complaints/${complaintId}/status`, {
       method: 'PATCH',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${localStorage.getItem('nagarikAawazToken')}`
       },
       body: JSON.stringify({ status: newStatus })
     })
     .then(res => res.json())
     .then(data => console.log('Status updated:', data))
     .catch(err => console.error('Status update failed:', err));
  
}

/* ── 8. Table: escalate complaint ── */
function escalateComplaint(complaintId) {
  const isNe = !document.body.classList.contains('lang-mode-en');
  const msg  = isNe
    ? `${complaintId} महानगरपालिकामा पठाउने हो? यो कार्य फिर्ता हुन सक्दैन।`
    : `Escalate ${complaintId} to Metro? This action cannot be undone.`;

  if (!confirm(msg)) return;

  // Find the row and update it visually
  const rows = document.querySelectorAll('#tableBody tr');
  rows.forEach(row => {
    if (row.querySelector('.cell-id')?.textContent === complaintId) {
      row.dataset.status = 'escalated';
      // Replace status select with escalated badge
      const statusCell = row.querySelector('td:nth-child(5)');
      if (statusCell) {
        statusCell.innerHTML = `
          <span class="badge b-escalated">
            <span class="badge-dot"></span>
            <span data-lang="ne">महानगरमा पठाइयो</span>
            <span data-lang="en">Escalated</span>
          </span>`;
        // Re-apply language
        const isEn = document.body.classList.contains('lang-mode-en');
        if (isEn) {
          statusCell.querySelector('[data-lang="ne"]').style.display = 'none';
          statusCell.querySelector('[data-lang="en"]').style.display = 'inline';
        }
      }
      // Remove escalate button
      const escalateBtn = row.querySelector('.btn-escalate');
      if (escalateBtn) escalateBtn.remove();
    }
  });

 
     fetch(`http://localhost:5000/api/complaints/${complaintId}/escalate`, {
       method: 'PATCH',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${localStorage.getItem('nagarikAawazToken')}`
       }
     })
     .then(res => res.json())
     .then(data => console.log('Escalated:', data))
     .catch(err => console.error('Escalation failed:', err));
  
}

/* ── 9. Table: view complaint ── */
function viewComplaint(complaintId) {
  // Find row data
  const rows = document.querySelectorAll('#tableBody tr');
  let found  = null;
  rows.forEach(row => {
    if (row.querySelector('.cell-id')?.textContent === complaintId) found = row;
  });
  if (!found) return;

  const isEn  = document.body.classList.contains('lang-mode-en');
  const title = found.querySelector('.cell-title span[data-lang="' + (isEn ? 'en' : 'ne') + '"]')?.textContent || complaintId;
  const desc  = found.querySelector('.desc-text[data-lang="' + (isEn ? 'en' : 'ne') + '"]')?.textContent  || '—';
  const loc   = found.querySelector('.cell-landmark span[data-lang="' + (isEn ? 'en' : 'ne') + '"]')?.textContent || '—';
  const coords = found.querySelector('.cell-coords')?.textContent || '—';
  const status = found.dataset.status || '—';

  const statusLabels = {
    pending: isEn ? 'Pending Review'   : 'समीक्षामा',
    progress: isEn ? 'In Progress'     : 'प्रक्रियामा',
    resolved: isEn ? 'Resolved'        : 'समाधान भएको',
    escalated: isEn ? 'Escalated'      : 'महानगरमा पठाइयो',
  };

  const content = `
    <div style="display:flex;flex-direction:column;gap:14px;">
      <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:14px;">
        <div style="font-size:0.7rem;font-weight:700;color:var(--gray);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:5px;">
          ${isEn ? 'COMPLAINT ID' : 'गुनासो आईडी'}
        </div>
        <div style="font-family:'Poppins',sans-serif;font-weight:700;color:var(--green-deep);">${complaintId}</div>
      </div>
      <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:14px;">
        <div style="font-size:0.7rem;font-weight:700;color:var(--gray);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:5px;">
          ${isEn ? 'TITLE' : 'शीर्षक'}
        </div>
        <div style="font-weight:600;">${title}</div>
      </div>
      <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:14px;">
        <div style="font-size:0.7rem;font-weight:700;color:var(--gray);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:5px;">
          ${isEn ? 'DESCRIPTION' : 'विवरण'}
        </div>
        <div style="color:var(--gray);font-size:0.88rem;line-height:1.6;">${desc}</div>
      </div>
      <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:14px;">
        <div style="font-size:0.7rem;font-weight:700;color:var(--gray);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:5px;">
          ${isEn ? 'LOCATION / LANDMARK' : 'स्थान / चिनारी'}
        </div>
        <div style="font-weight:600;">${loc}</div>
        <div style="font-family:'Poppins',sans-serif;font-size:0.76rem;color:var(--gray);margin-top:4px;">${coords}</div>
      </div>
      <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:14px;">
        <div style="font-size:0.7rem;font-weight:700;color:var(--gray);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:5px;">
          ${isEn ? 'STATUS' : 'स्थिती'}
        </div>
        <div style="font-weight:600;">${statusLabels[status] || status}</div>
      </div>
    </div>
  `;

  document.getElementById('modalTitle').textContent = isEn ? `Complaint Details — ${complaintId}` : `गुनासो विवरण — ${complaintId}`;
  document.getElementById('modalBody').innerHTML    = content;
  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

/* ── Export placeholder ── */
function exportReport() {
  alert('Export feature will be connected to backend.');
}



//    HOW TO LOAD REAL COMPLAINTS FROM YOUR BACKEND
//    ================================================

//    Your server.js already has: app.use("/api/complaints", require("./routes/complaintRoutes"))

//    Step 1 — Add a GET /api/complaints?ward=8 endpoint in complaintRoutes.js:

     router.get('/', authMiddleware, async (req, res) => {
       try {
         const { ward } = req.query;
         const filter = ward ? { 'location.ward': parseInt(ward) } : {};
         const complaints = await Complaint.find(filter).sort({ createdAt: -1 });
         res.json({ complaints });
       } catch (err) {
         res.status(500).json({ message: err.message });
       }
     });

//    Step 2 — Call it here and render rows:

     async function loadComplaints() {
       const token = localStorage.getItem('nagarikAawazToken');
       const ward  = 8; // set this dynamically from logged-in official's profile

       try {
         const res  = await fetch(`http://localhost:5000/api/complaints?ward=${ward}`, {
           headers: { 'Authorization': `Bearer ${token}` }
         });
         const { complaints } = await res.json();
         renderComplaints(complaints);
       } catch (err) {
         console.error('Failed to load complaints:', err);
       }
     }

     function renderComplaints(complaints) {
       const tbody = document.getElementById('tableBody');
       tbody.innerHTML = '';

       complaints.forEach(c => {
         const tr = document.createElement('tr');
         tr.dataset.status = c.status || 'pending';

         const friendlyId = 'NA-' + (new Date().getFullYear() + 57) + '-' + c._id.slice(-5).toUpperCase();
         const photoHtml  = c.photo
           ? `<img src="${c.photo}" class="photo-thumb-img" alt="Photo">`
           : `<div class="photo-placeholder"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></div>`;

         tr.innerHTML = `
           <td class="cell-id">${friendlyId}</td>
           <td class="cell-title-col">
             <div class="cell-title">
               <span data-lang="ne">${c.title}</span>
               <span data-lang="en">${c.title}</span>
             </div>
             <div class="cell-landmark">
               <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
               <span data-lang="ne">${c.location?.landmark || '—'}</span>
               <span data-lang="en">${c.location?.landmark || '—'}</span>
             </div>
             <div class="cell-coords">${c.location?.lat ? c.location.lat.toFixed(5) + ', ' + c.location.lng.toFixed(5) : '—'}</div>
           </td>
           <td class="cell-desc">
             <span data-lang="ne" class="desc-text">${c.description}</span>
             <span data-lang="en" class="desc-text">${c.description}</span>
           </td>
           <td class="cell-photo"><div class="photo-thumb-wrap">${photoHtml}</div></td>
           <td>
             <select class="status-select" onchange="handleStatusChange(this, '${c._id}')">
               <option value="pending" ${c.status === 'pending' ? 'selected' : ''}>समीक्षामा / Pending</option>
               <option value="progress" ${c.status === 'progress' ? 'selected' : ''}>प्रक्रियामा / In Progress</option>
               <option value="resolved" ${c.status === 'resolved' ? 'selected' : ''}>समाधान / Resolved</option>
             </select>
           </td>
           <td>
             <div class="row-actions">
               ${c.status !== 'escalated' ? `<button class="action-btn btn-escalate" onclick="escalateComplaint('${c._id}')" title="Escalate"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg></button>` : ''}
               <button class="action-btn btn-view" onclick="viewComplaint('${c._id}')" title="View"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
             </div>
           </td>
         `;
         tbody.appendChild(tr);
       });

       // Re-apply language state after rendering
       const lang = document.body.classList.contains('lang-mode-en') ? 'en' : 'ne';
       updateStatNumbers(lang);
     }

//    Step 3 — Call loadComplaints() at the end of your DOMContentLoaded:
     loadComplaints();


/* ── 11. Init ── */
// document.addEventListener('DOMContentLoaded', () => {
//   // Restore language
//   const savedLang = localStorage.getItem('nagarikAawazLang') || 'ne';
//   if (savedLang === 'en') setLang('en');
//   else updateStatNumbers('ne');

//   // Sidebar resize
//   window.addEventListener('resize', handleSidebarResize);
// });