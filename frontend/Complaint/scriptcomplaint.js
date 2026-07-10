/* ================================================================
   NAGARIK AAWAZ — complaint.js
   Sections:
     1.  Language toggle
     2.  Form state
     3.  Stepper
     4.  Validation
     5.  Step navigation
     6.  Character count
     7.  Photo upload (1 photo max — replaces on new upload)
     8.  Leaflet map
     9.  Review map
     10. Review panel builder
     11. Submit
     12. Reset form
     13. Init
================================================================ */

/* ── 1. Language toggle ── */
function setLang(lang) {
  document.body.classList.toggle('lang-mode-en', lang === 'en');
  document.getElementById('btn-ne').classList.toggle('active', lang === 'ne');
  document.getElementById('btn-en').classList.toggle('active', lang === 'en');
  localStorage.setItem('nagarikAawazLang', lang);
}

/* ── 2. Mobile nav ── */

/* ── 2. Form state ── */
let currentStep    = 1;
let markerLat      = null;
let markerLng      = null;
let uploadedPhotos = [];   // max 1 entry: [{ file, dataUrl }]
let map            = null;
let marker         = null;
let reviewMap      = null;
let reviewMarker   = null;

const POKHARA_LAT = 28.2096;
const POKHARA_LNG = 83.9856;

const PIN_SVG_HTML = `
  <div style="
    background:#1B5E3C;
    width:22px;height:22px;
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    border:3px solid #fff;
    box-shadow:0 2px 8px rgba(0,0,0,0.3);
  "></div>`;

/* ── 3. Stepper ── */
function updateStepper(step) {
  const DONE_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="20 6 9 17 4 12"/></svg>`;

  for (let i = 1; i <= 3; i++) {
    const dot   = document.getElementById('dot-' + i);
    const lbl   = document.getElementById('lbl-' + i);
    const lblEn = document.getElementById('lbl-' + i + '-en');

    dot.classList.remove('active', 'done');
    if (lbl)   lbl.classList.remove('active', 'done');
    if (lblEn) lblEn.classList.remove('active', 'done');

    if (i < step) {
      dot.classList.add('done');
      dot.innerHTML = DONE_SVG;
      if (lbl)   lbl.classList.add('done');
      if (lblEn) lblEn.classList.add('done');
    } else if (i === step) {
      dot.classList.add('active');
      dot.textContent = i;
      if (lbl)   lbl.classList.add('active');
      if (lblEn) lblEn.classList.add('active');
    } else {
      dot.textContent = i;
    }

    if (i <= 2) {
      document.getElementById('conn-' + i).classList.toggle('done', i < step);
    }
  }
}

function showStep(step) {
  document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('step-' + step);
  if (target) target.classList.add('active');
  updateStepper(step);
  currentStep = step;

  // Leaflet renders blank if its container was hidden when initialized.
  // Recalculate map size every time step 2 becomes visible.
  if (step === 2 && map) {
    setTimeout(() => map.invalidateSize(), 150);
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── 4. Validation ── */
function clearErrors() {
  document.querySelectorAll('.form-group.has-error').forEach(g => g.classList.remove('has-error'));
}

function setError(groupId) {
  const g = document.getElementById(groupId);
  if (g) g.classList.add('has-error');
}

function validateStep1() {
  clearErrors();
  let valid    = true;
  const isNe   = !document.body.classList.contains('lang-mode-en');
  const title  = document.getElementById('complaintTitle').value.trim();
  const ward   = document.getElementById('wardSelect').value;
  const desc   = document.getElementById('complaintDesc').value.trim();

  if (title.length < 5)  { setError('fg-title'); valid = false; }
  if (!ward)             { setError('fg-ward');  valid = false; }
  if (desc.length < 30)  { setError('fg-desc');  valid = false; }

  const alertEl = document.getElementById('alert-1');
  if (!valid) {
    document.getElementById('alert-1-msg').textContent = isNe
      ? 'कृपया सबै अनिवार्य फिल्डहरू भर्नुहोस्।'
      : 'Please fill in all required fields.';
    alertEl.classList.add('show');
  } else {
    alertEl.classList.remove('show');
  }
  return valid;
}

function validateStep2() {
  clearErrors();
  let valid  = true;
  const isNe = !document.body.classList.contains('lang-mode-en');

  if (uploadedPhotos.length === 0)          { setError('fg-photo');    valid = false; }
  if (markerLat === null || markerLng === null) { setError('fg-location'); valid = false; }

  const alertEl = document.getElementById('alert-2');
  if (!valid) {
    document.getElementById('alert-2-msg').textContent = isNe
      ? 'कृपया फोटो र स्थान दुवै थप्नुहोस्।'
      : 'Please add a photo and mark the location.';
    alertEl.classList.add('show');
  } else {
    alertEl.classList.remove('show');
  }
  return valid;
}

/* ── 5. Step navigation ── */
function goToStep(step) {
  if (step === 2 && !validateStep1()) return;
  if (step === 3 && !validateStep2()) return;
  if (step === 3) buildReviewPanel();
  showStep(step);
  if (step === 3) setTimeout(() => initReviewMap(), 200);
}

/* ── 6. Character count ── */
function updateCharCount(fieldId, countId, max) {
  const len = document.getElementById(fieldId).value.length;
  const el  = document.getElementById(countId);
  el.textContent = len + ' / ' + max;
  el.classList.remove('warn', 'over');
  if (len > max * 0.9) el.classList.add('warn');
  if (len >= max)      el.classList.add('over');
}

/* ── 7. Photo upload — 1 photo max, new upload replaces old ── */
function handlePhotoUpload(input) {
  const files   = Array.from(input.files);
  if (files.length === 0) return;

  const maxSize = 5 * 1024 * 1024;
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const file    = files[0];   // only the first file is used

  if (!allowed.includes(file.type) || file.size > maxSize) {
    input.value = '';
    return;
  }

  const reader  = new FileReader();
  reader.onload = (e) => {
    uploadedPhotos = [{ file, dataUrl: e.target.result }]; // replace, not append
    renderPhotoThumbs();
    document.getElementById('fg-photo').classList.remove('has-error');
  };
  reader.readAsDataURL(file);
  input.value = '';
}

function renderPhotoThumbs() {
  const grid = document.getElementById('photoPreviewGrid');
  grid.innerHTML = '';
  uploadedPhotos.forEach((p, i) => {
    const div = document.createElement('div');
    div.className = 'photo-thumb';
    const img = document.createElement('img');
    img.src = p.dataUrl;
    img.alt = 'Complaint photo';
    const btn = document.createElement('button');
    btn.className = 'remove-thumb';
    btn.textContent = '×';
    btn.setAttribute('aria-label', 'Remove photo');
    btn.onclick = () => { uploadedPhotos.splice(i, 1); renderPhotoThumbs(); };
    div.appendChild(img);
    div.appendChild(btn);
    grid.appendChild(div);
  });
}

// Drag & drop on the drop zone
const dropZone = document.getElementById('dropZone');
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files.length) {
    handlePhotoUpload({ files: e.dataTransfer.files, value: '' });
  }
});

/* ── 8. Leaflet map ── */
function makePinIcon() {
  return L.divIcon({
    className: '',
    html: PIN_SVG_HTML,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -24]
  });
}

function initMap() {
  map = L.map('complaint-map', { zoomControl: true })
    .setView([POKHARA_LAT, POKHARA_LNG], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map);

  map.on('click', (e) => placeMarker(e.latlng.lat, e.latlng.lng));
}

function placeMarker(lat, lng) {
  if (marker) map.removeLayer(marker);
  marker = L.marker([lat, lng], { icon: makePinIcon() }).addTo(map);
  marker.bindPopup(
    '<strong style="font-size:0.85rem;">चिन्ह लगाइएको स्थान</strong><br>'
    + '<small>' + lat.toFixed(5) + ', ' + lng.toFixed(5) + '</small>'
  ).openPopup();

  markerLat = lat;
  markerLng = lng;
  document.getElementById('lat').value = lat.toFixed(6);
  document.getElementById('lng').value = lng.toFixed(6);

  const isNe    = !document.body.classList.contains('lang-mode-en');
  const coordEl = document.getElementById('mapCoords');
  coordEl.innerHTML =
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;flex-shrink:0;">
       <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
       <circle cx="12" cy="10" r="3"/>
     </svg>
     <strong class="coord-value">${lat.toFixed(5)}, ${lng.toFixed(5)}</strong>
     &nbsp;—&nbsp;
     <span style="color:var(--green-accent);font-size:0.78rem;">
       ${isNe ? 'स्थान चिन्ह लगाइयो ✓' : 'Location marked ✓'}
     </span>`;

  document.getElementById('fg-location').classList.remove('has-error');
}

function useMyLocation() {
  const btn = document.getElementById('gpsBtn');
  if (!navigator.geolocation) return;

  const isNe = !document.body.classList.contains('lang-mode-en');
  btn.disabled = true;
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/></svg>
    <span>${isNe ? 'स्थान खोज्दैछ...' : 'Locating...'}</span>`;

  const RESTORE_HTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
    <span data-lang="ne">मेरो वर्तमान स्थान प्रयोग गर्नुहोस्</span>
    <span data-lang="en">Use My Current Location</span>`;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      map.setView([lat, lng], 16);
      placeMarker(lat, lng);
      btn.disabled = false;
      btn.innerHTML = RESTORE_HTML;
    },
    () => {
      btn.disabled = false;
      btn.innerHTML = RESTORE_HTML;
      alert(isNe
        ? 'स्थान पहुँच अस्वीकार गरियो। कृपया नक्सामा क्लिक गरेर स्थान छनोट गर्नुहोस्।'
        : 'Location access denied. Please click on the map to select a location.');
    },
    { timeout: 10000 }
  );
}

/* ── 9. Review map ── */
function initReviewMap() {
  if (!markerLat || !markerLng) return;
  document.getElementById('reviewMapWrap').style.display = 'block';
  if (reviewMap) { reviewMap.remove(); reviewMap = null; }

  reviewMap = L.map('review-map', {
    zoomControl: false,
    dragging: false,
    scrollWheelZoom: false
  }).setView([markerLat, markerLng], 16);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors', maxZoom: 19
  }).addTo(reviewMap);

  reviewMarker = L.marker([markerLat, markerLng], { icon: makePinIcon() }).addTo(reviewMap);
}

/* ── 10. Review panel builder ── */
function buildReviewPanel() {
  const isNe     = !document.body.classList.contains('lang-mode-en');
  const title    = document.getElementById('complaintTitle').value.trim();
  const ward     = document.getElementById('wardSelect').value;
  const desc     = document.getElementById('complaintDesc').value.trim();
  const landmark = document.getElementById('landmark').value.trim();
  const location = (markerLat && markerLng)
    ? (markerLat.toFixed(5) + ', ' + markerLng.toFixed(5))
    : '—';

  // Inline SVG helpers for review table
  const ICON = (path) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round"
      style="width:14px;height:14px;vertical-align:-2px;">${path}</svg>`;

  const ICON_EDIT  = ICON('<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>');
  const ICON_PIN   = ICON('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>');
  const ICON_MAP   = ICON('<polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>');
  const ICON_FLAG  = ICON('<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>');

  const rows = [
    { label: isNe ? 'शीर्षक'              : 'Title',              value: title,     icon: ICON_EDIT },
    { label: isNe ? 'वडा'                 : 'Ward',               value: (isNe ? 'वडा ' : 'Ward ') + ward, icon: ICON_PIN },
    { label: isNe ? 'स्थान (निर्देशांक)' : 'Location (Coords)',  value: location,  icon: ICON_MAP  },
    { label: isNe ? 'नजिकको चिनारी'      : 'Landmark',           value: landmark || (isNe ? 'उल्लेख गरिएन' : 'Not mentioned'), icon: ICON_FLAG },
    { label: isNe ? 'विवरण'              : 'Description',         value: desc,      icon: ICON_EDIT }
  ];

  document.getElementById('reviewTable').innerHTML = rows.map((r, idx) => `
    <tr style="background:${idx % 2 === 0 ? 'var(--bg)' : 'var(--white)'};">
      <td style="padding:12px 16px;font-size:0.82rem;color:var(--gray);font-weight:600;
                 white-space:nowrap;width:160px;border-bottom:1px solid var(--border);">
        ${r.icon} ${r.label}
      </td>
      <td style="padding:12px 16px;font-size:0.88rem;color:var(--ink);
                 border-bottom:1px solid var(--border);line-height:1.6;">
        ${escapeHtml(r.value)}
      </td>
    </tr>
  `).join('');

  // Photo preview in review
  const reviewPhotos = document.getElementById('reviewPhotos');
  if (uploadedPhotos.length > 0) {
    reviewPhotos.innerHTML = `
      <div class="section-label">${isNe ? 'अपलोड गरिएको फोटो' : 'UPLOADED PHOTO'}</div>
      <div class="photo-preview-grid">
        ${uploadedPhotos.map(p => `
          <div class="photo-thumb">
            <img src="${p.dataUrl}" alt="Complaint photo">
          </div>
        `).join('')}
      </div>`;
  } else {
    reviewPhotos.innerHTML = '';
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── 11. Submit ── */
function submitComplaint() {
  const confirmCheck = document.getElementById('confirmCheck');
  const errConfirm   = document.getElementById('err-confirm');
  const isNe         = !document.body.classList.contains('lang-mode-en');

  if (!confirmCheck.checked) {
    errConfirm.style.display = 'flex';
    return;
  }
  errConfirm.style.display = 'none';

  const btn      = document.getElementById('submitBtn');
  const origHTML = btn.innerHTML;
  btn.disabled   = true;
  btn.innerHTML  = `<span class="spinner"></span> <span>${isNe ? 'पेश हुँदैछ...' : 'Submitting...'}</span>`;

  /* ── Backend hook ─────────────────────────────────────────────────
     Replace the setTimeout below with a real API call:

     const formData = new FormData();
     formData.append('title',    document.getElementById('complaintTitle').value.trim());
     formData.append('ward',     document.getElementById('wardSelect').value);
     formData.append('desc',     document.getElementById('complaintDesc').value.trim());
     formData.append('landmark', document.getElementById('landmark').value.trim());
     formData.append('lat',      markerLat);
     formData.append('lng',      markerLng);
     if (uploadedPhotos.length) formData.append('photo', uploadedPhotos[0].file);

     fetch('/api/complaints', { method: 'POST', body: formData })
       .then(res => res.json())
       .then(data => {
         if (data.ticketId) showSuccess(data.ticketId);
         else throw new Error('No ticket ID');
       })
       .catch(() => {
         btn.disabled  = false;
         btn.innerHTML = origHTML;
         document.getElementById('alert-3').classList.add('show');
       });
  ─────────────────────────────────────────────────────────────────── */

  // Demo — simulate API delay
  // ── Real API call ──────────────────────────────────────────────
  const token    = localStorage.getItem('nagarikAawazToken');
  const photoB64 = uploadedPhotos.length > 0 ? uploadedPhotos[0].dataUrl : null;

  fetch('http://localhost:5000/api/complaints', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      title:       document.getElementById('complaintTitle').value.trim(),
      description: document.getElementById('complaintDesc').value.trim(),
      photo:       photoB64,
      location: {
        ward:     parseInt(document.getElementById('wardSelect').value, 10),
        lat:      markerLat,
        lng:      markerLng,
        landmark: document.getElementById('landmark').value.trim() || null
      }
    })
  })
  .then(res => res.json().then(data => ({ status: res.status, data })))
  .then(({ status, data }) => {
    if (status === 201) {
      // Store the real MongoDB _id so dashboard-citizen.html can use it
      const realId = data.complaint._id;
      localStorage.setItem('lastComplaintId', realId);

      // Show a friendly ticket number alongside the real _id
      const friendlyId = 'NA-' + (new Date().getFullYear() + 57) + '-' + realId.slice(-5).toUpperCase();
      showSuccess(friendlyId);
    } else {
      // 400 / 401 / 500 — show the backend error message
      throw new Error(data.message || 'Submission failed. Please try again.');
    }
  })
  .catch(err => {
    btn.disabled  = false;
    btn.innerHTML = origHTML;

    // Reuse the existing step-3 alert banner
    const alertEl  = document.getElementById('alert-3');
    const alertMsg = document.getElementById('alert-3-msg');
    alertMsg.textContent = err.message;
    alertEl.classList.add('show');
    alertEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

function showSuccess(ticketId) {
  document.getElementById('ticketId').textContent = ticketId;
  localStorage.setItem('lastTicket', ticketId);

  document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
  document.querySelector('.form-card-header').style.display = 'none';
  document.getElementById('successPanel').classList.add('active');

  // Mark all steps done
  for (let i = 1; i <= 3; i++) {
    const dot = document.getElementById('dot-' + i);
    if (dot) {
      dot.classList.add('done');
      dot.classList.remove('active');
      dot.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/></svg>`;
    }
    const conn = document.getElementById('conn-' + i);
    if (conn) conn.classList.add('done');
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function generateTicketId() {
  const year = new Date().getFullYear() + 57; // approximate Nepali year
  const rand = String(Math.floor(Math.random() * 90000) + 10000);
  return 'NA-' + year + '-' + rand;
}

/* ── 12. Reset form ── */
function resetForm() {
  markerLat      = null;
  markerLng      = null;
  uploadedPhotos = [];

  ['complaintTitle', 'complaintDesc', 'landmark', 'lat', 'lng'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('wardSelect').value = '';
  document.getElementById('title-count').textContent = '0 / 100';
  document.getElementById('desc-count').textContent  = '0 / 1000';
  document.getElementById('confirmCheck').checked    = false;
  document.getElementById('photoPreviewGrid').innerHTML = '';
  document.getElementById('reviewPhotos').innerHTML     = '';
  document.getElementById('reviewMapWrap').style.display = 'none';

  if (marker) { map.removeLayer(marker); marker = null; }

  const isNe    = !document.body.classList.contains('lang-mode-en');
  const coordEl = document.getElementById('mapCoords');
  coordEl.innerHTML =
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;flex-shrink:0;">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
    <span>${isNe ? 'स्थान छनोट गरिएको छैन' : 'No location selected yet'}</span>`;

  document.getElementById('successPanel').classList.remove('active');
  document.querySelector('.form-card-header').style.display = '';
  document.querySelectorAll('.alert-banner').forEach(a => a.classList.remove('show'));
  clearErrors();
  showStep(1);
  updateStepper(1);
  


  // Re-initialise dot 1 to active state
  const dot1 = document.getElementById('dot-1');
  dot1.classList.add('active');
  dot1.classList.remove('done');
  dot1.textContent = '१';
}

/* ── 13. Init ── */
document.addEventListener('DOMContentLoaded', () => {
  // Auth guard — redirect to login if no token
  const token = localStorage.getItem('nagarikAawazToken');
  if (!token) {
    window.location.href = 'login.html'; // was wrongly pointing to complaint.html
    return;
  }

  // Restore language preference
  const savedLang = localStorage.getItem('nagarikAawazLang');
  if (savedLang === 'en') setLang('en');

  // Boot Leaflet map
  initMap();
});