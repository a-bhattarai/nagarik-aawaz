/* ================================================================
   NAGARIK AAWAZ — scriptmetro.js
   Sections:
     1.  Language toggle
     2.  Mobile sidebar
     3.  Notification dropdown
     4.  Budget bar animation
     5.  Escalation detail data (static + backend hooks)
     6.  Modal — All Escalations List
     7.  Modal — Single Complaint Detail
     8.  Modal — All 33 Wards Performance
     9.  Settings modal
     10. Backend integration hooks
     11. Init
================================================================ */

const API_BASE = 'http://localhost:5001/api';
const API      = 'http://localhost:5001/api';
const getToken = () => localStorage.getItem('nagarikAawazToken');
const authHdr  = () => ({ 'Authorization': `Bearer ${getToken()}` });
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

/* ── 5. Static escalation data (replace with backend fetch) ──────
   Each complaint has: id, title_ne, title_en, desc_ne, desc_en,
   photo (URL or null), lat, lng, landmark_ne, landmark_en,
   ward, daysAgo, estCost
────────────────────────────────────────────────────────────────── */
const STATIC_ESCALATIONS = [
  {
    id:          'NA-2082-10188',
    title_ne:    'पुल भत्किने जोखिम — तुरुन्त मर्मत आवश्यक',
    title_en:    'Foot-bridge structurally unsafe — urgent repair needed',
    desc_ne:     'पुलको मुख्य बीम पूर्ण रूपले क्षतिग्रस्त भएको छ। आगामी वर्षाले बाढीको जोखिम थप बढाउनेछ। तुरुन्त मर्मतको आवश्यकता छ।',
    desc_en:     'The main beam of the footbridge is completely damaged. The upcoming monsoon will increase flood risk significantly. Immediate repair is required.',
    photo:       null,
    lat:         28.2082,
    lng:         83.9880,
    landmark_ne: 'खोल्सी किनार, मूल पुल नजिक',
    landmark_en: 'Kholsi Bank, near main bridge',
    ward:        8,
    daysAgo:     2,
    estCost:     'रु. ४२ लाख / NPR 4.2M',
    severity:    'critical',
  },
  {
    id:          'NA-2082-10092',
    title_ne:    'मुख्य ढल लाइन क्षतिग्रस्त, ढिलो भए बाढीको जोखिम',
    title_en:    'Main sewer line damaged, flood risk if delayed',
    desc_ne:     'मुख्य ढल लाइन भाँचिएको छ र पानी सडकमा बग्दैछ। ढिलो भएमा बाढी आउने सम्भावना छ।',
    desc_en:     'The main sewer line is broken and water is flowing onto the road. Delay could cause flooding in the area.',
    photo:       null,
    lat:         28.1950,
    lng:         83.9760,
    landmark_ne: 'नया बजार, ढल ट्यांकी नजिक',
    landmark_en: 'Naya Bazar, near drainage tank',
    ward:        14,
    daysAgo:     4,
    estCost:     'रु. १८ लाख / NPR 1.8M',
    severity:    'high',
  },
  {
    id:          'NA-2082-10071',
    title_ne:    'खानेपानी ट्यांकी फुटेको, सम्पूर्ण टोलमा आपूर्ति बन्द',
    title_en:    'Water tank ruptured, supply cut to entire area',
    desc_ne:     'खानेपानी ट्यांकीमा ठूलो चिरा परेको छ। यसले गर्दा वरपरका ५०० परिवारलाई पानी आपूर्ति बन्द भएको छ।',
    desc_en:     'A large crack has appeared in the water supply tank. This has cut off water supply to around 500 nearby families.',
    photo:       null,
    lat:         28.2150,
    lng:         83.9920,
    landmark_ne: 'माथिल्लो टोल, पानी ट्यांकी नजिक',
    landmark_en: 'Upper Tole, near water tank',
    ward:        21,
    daysAgo:     5,
    estCost:     'रु. ९ लाख / NPR 900K',
    severity:    'high',
  },
];

/* All 33 wards static data (replace with backend fetch) */
const ALL_WARDS_DATA = Array.from({ length: 33 }, (_, i) => {
  const ward = i + 1;
  // Seed some variation
  const total      = Math.floor(Math.random() * 60) + 20;
  const resolved   = Math.floor(total * (0.5 + Math.random() * 0.45));
  const escalated  = Math.floor(Math.random() * 5);
  const rate       = Math.round((resolved / total) * 100);
  const allocated  = (Math.floor(Math.random() * 80) + 40) * 100000; // in NPR
  const used       = Math.floor(allocated * (0.4 + Math.random() * 0.45));
  const avgDays    = (1.5 + Math.random() * 6).toFixed(1);
  return { ward, total, resolved, escalated, rate, allocated, used, avgDays };
});

/* Override with known real data */
const KNOWN = {
  12: { total:74, resolved:70, escalated:2, rate:94, allocated:1200000, used:900000,  avgDays:'2.1' },
   5: { total:61, resolved:55, escalated:1, rate:90, allocated:850000,  used:580000,  avgDays:'2.6' },
   8: { total:52, resolved:42, escalated:3, rate:81, allocated:1100000, used:700000,  avgDays:'3.8' },
  19: { total:39, resolved:26, escalated:1, rate:67, allocated:650000,  used:410000,  avgDays:'5.2' },
  14: { total:58, resolved:30, escalated:5, rate:52, allocated:980000,  used:550000,  avgDays:'7.4' },
};
ALL_WARDS_DATA.forEach(w => {
  if (KNOWN[w.ward]) Object.assign(w, KNOWN[w.ward]);
});

function fmtNPR(n) {
  if (n >= 10000000) return `रु. ${(n/10000000).toFixed(1)} क.`;
  if (n >= 100000)   return `रु. ${(n/100000).toFixed(0)} लाख`;
  return `रु. ${n.toLocaleString()}`;
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
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/>
            </svg>
            ${en ? 'Ward' : 'वडा'} ${c.ward}
          </span>
          <span class="esc-meta-chip">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            ${en ? c.landmark_en : c.landmark_ne}
          </span>
          <span class="esc-meta-chip">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            ${c.daysAgo} ${en ? 'days ago' : 'दिन पहिले'}
          
        </div>

        ${c.lat && c.lng ? `
          <a class="esc-map-link"
             href="https://www.openstreetmap.org/?mlat=${c.lat}&mlon=${c.lng}&zoom=17"
             target="_blank" rel="noopener">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
              <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
            </svg>
            ${en
              ? `Open on map (${c.lat.toFixed(4)}, ${c.lng.toFixed(4)})`
              : `नक्सामा हेर्नुहोस् (${c.lat.toFixed(4)}, ${c.lng.toFixed(4)})`}
          </a>` : ''}

      </div>

      <div class="esc-modal-footer">
        <button class="btn btn-primary btn-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>
          </svg>
          ${en ? 'Authorize Budget' : 'बजेट स्वीकृत गर्नुहोस्'}
        </button>
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

/* ── 7. Modal — Single Complaint Detail ── */
function openComplaintDetailModal(id) {
  const en = isEn();
  const complaint = STATIC_ESCALATIONS.find(c => c.id === id);
  const body  = document.getElementById('complaintDetailBody');
  const title = document.getElementById('complaintDetailTitle');

  if (!complaint) {
    /* If not in static list, show placeholder (backend would fetch it) */
    title.textContent = id;
    body.innerHTML = `
      <div style="text-align:center; padding:32px 16px; color:var(--gray);">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:12px;color:var(--border);">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <p style="font-weight:600;">${en ? 'Connect backend to load details' : 'विवरण लोड गर्न ब्याकेन्ड जोड्नुहोस्'}</p>
        <p style="font-size:0.82rem;margin-top:6px;">GET /api/complaints/${id}</p>
      </div>`;
    document.getElementById('complaintDetailOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
    return;
  }

  title.textContent = `${complaint.id} — ${en ? complaint.title_en : complaint.title_ne}`;

  body.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:18px;">

      <!-- Photo -->
      ${complaint.photo
        ? `<img src="${complaint.photo}" style="width:100%;max-height:240px;object-fit:cover;border-radius:var(--radius-md);border:1px solid var(--border);" alt="Photo">`
        : `<div class="esc-photo-placeholder" style="height:120px;">
             <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
               <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
               <circle cx="12" cy="13" r="4"/>
             </svg>
             ${en ? 'No photo submitted' : 'फोटो उपलब्ध छैन'}
           </div>`
      }

      <!-- Title + description -->
      <div>
        <div style="font-size:0.68rem;font-weight:700;color:var(--gray);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">
          ${en ? 'TITLE' : 'शीर्षक'}
        </div>
        <div style="font-weight:700;font-size:0.95rem;color:var(--ink);">
          ${en ? complaint.title_en : complaint.title_ne}
        </div>
      </div>

      <div>
        <div style="font-size:0.68rem;font-weight:700;color:var(--gray);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">
          ${en ? 'DESCRIPTION' : 'विवरण'}
        </div>
        <p style="font-size:0.88rem;color:var(--gray);line-height:1.7;">
          ${en ? complaint.desc_en : complaint.desc_ne}
        </p>
      </div>

      <!-- Location chips -->
      <div>
        <div style="font-size:0.68rem;font-weight:700;color:var(--gray);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">
          ${en ? 'LOCATION' : 'स्थान'}
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          <span class="esc-meta-chip">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/>
            </svg>
            ${en ? 'Ward' : 'वडा'} ${complaint.ward}
          </span>
          <span class="esc-meta-chip">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
            </svg>
            ${en ? complaint.landmark_en : complaint.landmark_ne}
          </span>
          ${complaint.lat && complaint.lng ? `
            <span class="esc-meta-chip">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              ${complaint.lat.toFixed(5)}, ${complaint.lng.toFixed(5)}
            </span>` : ''}
        </div>
      </div>

      <!-- Map link -->
      ${complaint.lat && complaint.lng ? `
        <a class="esc-map-link"
           href="https://www.openstreetmap.org/?mlat=${complaint.lat}&mlon=${complaint.lng}&zoom=17"
           target="_blank" rel="noopener">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
            <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
          </svg>
          ${en ? 'View location on OpenStreetMap' : 'OpenStreetMap मा स्थान हेर्नुहोस्'}
        </a>` : ''}

      

      <!-- Authorize button -->
      <button class="btn btn-primary" style="width:100%;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>
        </svg>
        ${en ? 'Authorize Budget for This Complaint' : 'यस गुनासोको लागि बजेट स्वीकृत गर्नुहोस्'}
      </button>

    </div>
  `;

  document.getElementById('complaintDetailOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
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

  // Animate bars inside the modal after render
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

/* ── 10. Load escalations from backend ── */
async function loadEscalations() {
  try {
    const res = await fetch(`${API}/complaints`, { headers: authHdr() });
    if (res.status === 401) { redirectToLogin(); return []; }
    const { complaints } = await res.json();

    // Metro admin gets all — filter escalated client-side
    const escalated = complaints.filter(c => c.status === 'escalated');

    // Map to the shape the modal functions expect
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

/* ── Load all complaints and compute per-ward stats ── */
async function loadWardStats() {
  try {
    const [compRes, budRes] = await Promise.all([
      fetch(`${API}/complaints`, { headers: authHdr() }),
      fetch(`${API}/budgets`),   // public — no auth needed
    ]);

    if (compRes.status === 401) { redirectToLogin(); return []; }

    const { complaints } = await compRes.json();
    const { budgets }    = budRes.ok ? await budRes.json() : { budgets: [] };

    // Aggregate by ward
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

/* ── Update top stat cards ── */
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

  // Update budget % bar
  const utilFill = document.querySelector('.stat-card.budget .util-fill');
  const utilPctEl = document.querySelector('.stat-card.budget .util-pct');
  const statNumBudget = document.querySelector('.stat-card.budget .stat-num');
  if (utilFill)    utilFill.style.width = `${utilPct}%`;
  if (utilPctEl)   utilPctEl.textContent = `${utilPct}%`;
  if (statNumBudget) statNumBudget.textContent = `${utilPct}%`;
}

/* ── 11. Init ── */
document.addEventListener('DOMContentLoaded', async () => {
  // Auth guard
  if (!getToken()) { redirectToLogin(); return; }

  const savedLang = localStorage.getItem('nagarikAawazLang') || 'ne';
  if (savedLang === 'en') setLang('en');

  // Load real data
  const [escalations, wardStats] = await Promise.all([
    loadEscalations(),
    loadWardStats(),
  ]);

  // Make them available globally so modal functions can use them
  window._LIVE_ESCALATIONS = escalations;
  window._LIVE_WARD_STATS  = wardStats;

  // Patch the modal functions to use live data instead of static
  // (openEscalationsModal and openWardPerformanceModal reference
  //  STATIC_ESCALATIONS and ALL_WARDS_DATA — override them here)
  window.STATIC_ESCALATIONS = escalations;
  window.ALL_WARDS_DATA     = wardStats;

  updateStatCards(escalations, wardStats);
  animateBars();

  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) {
      document.getElementById('sidebar')?.classList.remove('open');
      document.getElementById('sbBackdrop')?.classList.remove('show');
    }
  });
});