/* ================================================================
   NAGARIK AAWAZ — scriptcomplaint.js
   Fixes in this version:
     - Port changed to 5001
     - map.invalidateSize() called every time step-2 becomes visible
     - Location marker is NOW OPTIONAL (photo is the only required field
       in step 2, matching the backend model where lat/lng default null)
     - Review map only shown when marker was actually placed
     - Auth guard redirects to login.html if no token
================================================================ */

const API = 'http://localhost:5000/api';

/* ── State ── */
let currentStep    = 1;
let markerLat      = null;
let markerLng      = null;
let uploadedPhotos = [];   // max 1 entry: { file, dataUrl }
let map            = null;
let marker         = null;
let reviewMap      = null;

const POKHARA_LAT = 28.2096;
const POKHARA_LNG = 83.9856;

/* ── Language ── */
function setLang(lang) {
  document.body.classList.toggle('lang-mode-en', lang === 'en');
  document.getElementById('btn-ne').classList.toggle('active', lang === 'ne');
  document.getElementById('btn-en').classList.toggle('active', lang === 'en');
  localStorage.setItem('nagarikAawazLang', lang);
}

function isEn() {
  return document.body.classList.contains('lang-mode-en');
}

/* ── Character count ── */
function updateCharCount(fieldId, countId, max) {
  const len = document.getElementById(fieldId).value.length;
  const el  = document.getElementById(countId);
  el.textContent = len + ' / ' + max;
  el.classList.toggle('warn', len > max * 0.9);
  el.classList.toggle('over', len >= max);
}

/* ── Stepper ── */
function updateStepper(step) {
  const DONE_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"
    stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

  for (let i = 1; i <= 3; i++) {
    const dot   = document.getElementById('dot-' + i);
    const lbl   = document.getElementById('lbl-' + i);
    const lblEn = document.getElementById('lbl-' + i + '-en');

    dot.classList.remove('active', 'done');
    lbl?.classList.remove('active', 'done');
    lblEn?.classList.remove('active', 'done');

    if (i < step) {
      dot.classList.add('done');
      dot.innerHTML = DONE_SVG;
      lbl?.classList.add('done');
      lblEn?.classList.add('done');
    } else if (i === step) {
      dot.classList.add('active');
      dot.textContent = i;
      lbl?.classList.add('active');
      lblEn?.classList.add('active');
    } else {
      dot.textContent = i;
    }

    if (i <= 2) {
      document.getElementById('conn-' + i)?.classList.toggle('done', i < step);
    }
  }
}

/* ── Show step ──
   KEY FIX: after making step-2 visible, call map.invalidateSize()
   so Leaflet recalculates the container dimensions. Without this
   the map renders as a grey blank tile.
── */
function showStep(step) {
  document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('step-' + step);
  if (target) target.classList.add('active');
  updateStepper(step);
  currentStep = step;

  if (step === 2) {
    if (!map) initMap();
    setTimeout(() => {
      if (map) map.invalidateSize();
    }, 350); // Gives CSS animation (300ms) time to finish
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Validation ── */
function clearErrors() {
  document.querySelectorAll('.form-group.has-error').forEach(g => g.classList.remove('has-error'));
}

function setError(groupId) {
  document.getElementById(groupId)?.classList.add('has-error');
}

function validateStep1() {
  clearErrors();
  let valid = true;

  const title = document.getElementById('complaintTitle').value.trim();
  const ward  = document.getElementById('wardSelect').value;
  const desc  = document.getElementById('complaintDesc').value.trim();

  if (title.length < 5) { setError('fg-title'); valid = false; }
  if (!ward)             { setError('fg-ward');  valid = false; }
  if (desc.length < 30)  { setError('fg-desc');  valid = false; }

  const alertEl = document.getElementById('alert-1');
  if (!valid) {
    document.getElementById('alert-1-msg').textContent = isEn()
      ? 'Please fill in all required fields.'
      : 'कृपया सबै अनिवार्य फिल्डहरू भर्नुहोस्।';
    alertEl.classList.add('show');
  } else {
    alertEl.classList.remove('show');
  }
  return valid;
}

function validateStep2() {
  clearErrors();
  let valid = true;

  // Photo is required
  if (uploadedPhotos.length === 0) {
    setError('fg-photo');
    valid = false;
  }

  // NOTE: location marker is OPTIONAL — lat/lng are nullable in the backend model.
  // We do NOT block progression if no marker was placed. The ward field from step 1 is enough.

  const alertEl = document.getElementById('alert-2');
  if (!valid) {
    document.getElementById('alert-2-msg').textContent = isEn()
      ? 'Please upload a photo of the issue.'
      : 'कृपया समस्याको फोटो अपलोड गर्नुहोस्।';
    alertEl.classList.add('show');
  } else {
    alertEl.classList.remove('show');
  }
  return valid;
}

/* ── Step navigation ── */
function goToStep(step) {
  if (step === 2 && !validateStep1()) return;
  if (step === 3 && !validateStep2()) return;
  if (step === 3) buildReviewPanel();
  showStep(step);
  if (step === 3) setTimeout(() => initReviewMap(), 250);
}

/* ── Photo upload — 1 photo max ── */
function handlePhotoUpload(input) {
  const files   = Array.from(input.files);
  if (!files.length) return;

  const maxSize = 5 * 1024 * 1024;
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const file    = files[0];

  if (!allowed.includes(file.type)) {
    alert(isEn() ? 'Only JPEG, PNG or WEBP images are accepted.' : 'JPEG, PNG वा WEBP मात्र स्वीकार्य छ।');
    input.value = '';
    return;
  }
  if (file.size > maxSize) {
    alert(isEn() ? 'Image must be under 5 MB.' : 'फोटो ५ MB भन्दा सानो हुनुपर्छ।');
    input.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    uploadedPhotos = [{ file, dataUrl: e.target.result }];
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

/* ── Drag-and-drop ── */
document.addEventListener('DOMContentLoaded', () => {
  const dropZone = document.getElementById('dropZone');
  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length) handlePhotoUpload({ files: e.dataTransfer.files, value: '' });
    });
  }
});

/* ── Leaflet map ── */
function makePinIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:#1B5E3C;width:22px;height:22px;
      border-radius:50% 50% 50% 0;transform:rotate(-45deg);
      border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -24]
  });
}

// Rough bounding box around Pokhara Metropolitan City
const POKHARA_BOUNDS = L.latLngBounds(
  [28.10, 83.85],  // southwest corner
  [28.32, 84.10]   // northeast corner
);

function initMap() {
  if (map) return; // already initialised
  map = L.map('complaint-map', {
    zoomControl: true,
    minZoom: 12,                 // can't zoom out past this
    maxBounds: POKHARA_BOUNDS,   // can't pan outside this box
    maxBoundsViscosity: 1.0      // "bounces back" hard at the edge instead of drifting past it
  }).setView([POKHARA_LAT, POKHARA_LNG], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map);

  map.setMaxBounds(POKHARA_BOUNDS);
  map.on('click', (e) => placeMarker(e.latlng.lat, e.latlng.lng));
}

function placeMarker(lat, lng) {
  if (marker) map.removeLayer(marker);
  marker = L.marker([lat, lng], { icon: makePinIcon() }).addTo(map);
  marker.bindPopup(
    `<strong style="font-size:0.85rem;">${isEn() ? 'Marked location' : 'चिन्ह लगाइएको स्थान'}</strong><br>
     <small>${lat.toFixed(5)}, ${lng.toFixed(5)}</small>`
  ).openPopup();

  markerLat = lat;
  markerLng = lng;
  document.getElementById('lat').value = lat.toFixed(6);
  document.getElementById('lng').value = lng.toFixed(6);

  document.getElementById('mapCoords').innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round"
      style="width:15px;height:15px;flex-shrink:0;">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
    <strong style="color:var(--green-deep);font-family:'Poppins',sans-serif;">
      ${lat.toFixed(5)}, ${lng.toFixed(5)}
    </strong>
    &nbsp;—&nbsp;
    <span style="color:var(--green-accent);font-size:0.78rem;">
      ${isEn() ? 'Location marked ✓' : 'स्थान चिन्ह लगाइयो ✓'}
    </span>`;

  document.getElementById('fg-location')?.classList.remove('has-error');
}

function useMyLocation() {
  const btn = document.getElementById('gpsBtn');
  if (!navigator.geolocation) return;

  btn.disabled = true;
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
    <span>${isEn() ? 'Locating…' : 'स्थान खोज्दैछ…'}</span>`;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      map.setView([lat, lng], 16);
      placeMarker(lat, lng);
      btn.disabled = false;
      btn.innerHTML = restoreGpsBtnHTML();
    },
    () => {
      btn.disabled = false;
      btn.innerHTML = restoreGpsBtnHTML();
      alert(isEn()
        ? 'Location access denied. Please click the map to pick a location.'
        : 'स्थान पहुँच अस्वीकार गरियो। नक्सामा क्लिक गरेर स्थान छनोट गर्नुहोस्।');
    },
    { timeout: 10000 }
  );
}

function restoreGpsBtnHTML() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
    <span data-lang="ne">मेरो वर्तमान स्थान प्रयोग गर्नुहोस्</span>
    <span data-lang="en">Use My Current Location</span>`;
}

/* ── Review map (read-only, non-interactive) ── */
function initReviewMap() {
  const wrap = document.getElementById('reviewMapWrap');
  if (!markerLat || !markerLng) {
    wrap.style.display = 'none';
    return;
  }
  wrap.style.display = 'block';

  if (reviewMap) { reviewMap.remove(); reviewMap = null; }

  reviewMap = L.map('review-map', {
    zoomControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    touchZoom: false
  }).setView([markerLat, markerLng], 16);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(reviewMap);

  L.marker([markerLat, markerLng], { icon: makePinIcon() }).addTo(reviewMap);
}

/* ── Build review panel ── */
function buildReviewPanel() {
  const en       = isEn();
  const title    = document.getElementById('complaintTitle').value.trim();
  const ward     = document.getElementById('wardSelect').value;
  const desc     = document.getElementById('complaintDesc').value.trim();
  const landmark = document.getElementById('landmark').value.trim();
  const location = (markerLat && markerLng)
    ? `${markerLat.toFixed(5)}, ${markerLng.toFixed(5)}`
    : (en ? 'Not marked (optional)' : 'चिन्ह लगाइएको छैन (ऐच्छिक)');

  const ICON = (path) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round"
      style="width:14px;height:14px;vertical-align:-2px;">${path}</svg>`;

  const rows = [
    {
      label: en ? 'Title'       : 'शीर्षक',
      value: title,
      icon:  ICON('<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>')
    },
    {
      label: en ? 'Ward'        : 'वडा',
      value: (en ? 'Ward ' : 'वडा ') + ward,
      icon:  ICON('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>')
    },
    {
      label: en ? 'Location'    : 'स्थान (निर्देशांक)',
      value: location,
      icon:  ICON('<polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>')
    },
    {
      label: en ? 'Landmark'    : 'नजिकको चिनारी',
      value: landmark || (en ? 'Not provided' : 'उल्लेख गरिएन'),
      icon:  ICON('<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>')
    },
    {
      label: en ? 'Description' : 'विवरण',
      value: desc,
      icon:  ICON('<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>')
    }
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
      <div class="section-label" style="margin-top:16px;">
        ${en ? 'UPLOADED PHOTO' : 'अपलोड गरिएको फोटो'}
      </div>
      <div class="photo-preview-grid">
        ${uploadedPhotos.map(p => `
          <div class="photo-thumb">
            <img src="${p.dataUrl}" alt="Complaint photo">
          </div>`).join('')}
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

/* ── Submit ── */
function submitComplaint() {
  const confirmCheck = document.getElementById('confirmCheck');
  const errConfirm   = document.getElementById('err-confirm');
  const alertEl      = document.getElementById('alert-3');

  errConfirm.style.display = 'none';
  alertEl.classList.remove('show');

  if (!confirmCheck.checked) {
    errConfirm.style.display = 'flex';
    return;
  }

  const btn      = document.getElementById('submitBtn');
  const origHTML = btn.innerHTML;
  btn.disabled   = true;
  btn.innerHTML  = `<span class="spinner"></span> <span>${isEn() ? 'Submitting…' : 'पेश हुँदैछ…'}</span>`;

  const token    = localStorage.getItem('nagarikAawazToken');
  const photoB64 = uploadedPhotos.length > 0 ? uploadedPhotos[0].dataUrl : null;

  fetch(`${API}/complaints`, {
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
    btn.disabled  = false;
    btn.innerHTML = origHTML;

    if (status === 201) {
      // Store real _id for dashboard lookup
      localStorage.setItem('nagarikAawazLastComplaintId', data.complaint._id);

      const year       = new Date().getFullYear() + 57;
      const friendlyId = `NA-${year}-${data.complaint._id.slice(-5).toUpperCase()}`;
      showSuccess(friendlyId);
    } else if (status === 401) {
      window.location.href = 'login.html';
    } else {
      document.getElementById('alert-3-msg').textContent =
        data.message || (isEn() ? 'Submission failed. Please try again.' : 'पेश गर्न असफल भयो।');
      alertEl.classList.add('show');
      alertEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  })
  .catch(() => {
    btn.disabled  = false;
    btn.innerHTML = origHTML;
    document.getElementById('alert-3-msg').textContent =
      isEn() ? 'Network error. Please check your connection.' : 'नेटवर्क त्रुटि। पुन: प्रयास गर्नुहोस्।';
    alertEl.classList.add('show');
  });
}

/* ── Success panel ── */
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
    document.getElementById('conn-' + i)?.classList.add('done');
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Reset form ── */
function resetForm() {
  markerLat      = null;
  markerLng      = null;
  uploadedPhotos = [];

  ['complaintTitle', 'complaintDesc', 'landmark', 'lat', 'lng']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

  document.getElementById('wardSelect').value      = '';
  document.getElementById('title-count').textContent = '0 / 100';
  document.getElementById('desc-count').textContent  = '0 / 1000';
  document.getElementById('confirmCheck').checked    = false;
  document.getElementById('photoPreviewGrid').innerHTML = '';
  document.getElementById('reviewPhotos').innerHTML     = '';
  document.getElementById('reviewMapWrap').style.display = 'none';

  if (marker && map) { map.removeLayer(marker); marker = null; }

  document.getElementById('mapCoords').innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;flex-shrink:0;">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
    <span>${isEn() ? 'No location selected yet' : 'स्थान छनोट गरिएको छैन'}</span>`;

  document.getElementById('successPanel').classList.remove('active');
  document.querySelector('.form-card-header').style.display = '';
  document.querySelectorAll('.alert-banner').forEach(a => a.classList.remove('show'));
  clearErrors();
  showStep(1);

  const dot1 = document.getElementById('dot-1');
  if (dot1) { dot1.classList.add('active'); dot1.classList.remove('done'); dot1.textContent = '१'; }
  document.getElementById('conn-1')?.classList.remove('done');
  document.getElementById('conn-2')?.classList.remove('done');
}

function clearErrors() {
  document.querySelectorAll('.form-group.has-error').forEach(g => g.classList.remove('has-error'));
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  // Auth guard
  const token = localStorage.getItem('nagarikAawazToken');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  // Language
  const savedLang = localStorage.getItem('nagarikAawazLang');
  if (savedLang === 'en') setLang('en');

  // Init map immediately — it's safe even while step-2 is hidden.
  // The invalidateSize() call in showStep(2) fixes the rendering.
  initMap();
});