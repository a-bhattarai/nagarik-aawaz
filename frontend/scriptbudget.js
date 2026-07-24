/* ================================================================
   NAGARIK AAWAZ — scriptbudget.js
   Sections:
     1. Config & helpers
     2. Language
     3. User & auth
     4. Budget loading & rendering
     5. Edit modal
     6. Init
================================================================ */

/* ── 1. Config & helpers ── */
const API = 'http://localhost:5000/api';
var CURRENT_USER = null;

function getToken() {
  return localStorage.getItem('nagarikAawazToken');
}

function fmtNPR(n) {
  if (!n) return 'रु. ०';
  if (n >= 10000000) return 'रु. ' + (n / 10000000).toFixed(1) + ' करोड';
  if (n >= 100000)   return 'रु. ' + (n / 100000).toFixed(1) + ' लाख';
  return 'रु. ' + n.toLocaleString();
}

/* ── 2. Language ── */
function setLang(lang) {
  document.body.classList.toggle('lang-mode-en', lang === 'en');
  document.getElementById('btn-ne').classList.toggle('active', lang === 'ne');
  document.getElementById('btn-en').classList.toggle('active', lang === 'en');
  localStorage.setItem('nagarikAawazLang', lang);
}

function isEn() {
  return document.body.classList.contains('lang-mode-en');
}

function toNepaliDigits(n) {
  var map = {'0':'०','1':'१','2':'२','3':'३','4':'४','5':'५','6':'६','7':'७','8':'८','9':'९'};
  return String(n).split('').map(function(d) { return map[d] || d; }).join('');
}

/* ── 3. User & auth ── */
async function loadCurrentUser() {
  var token = getToken();
  if (!token) {
    CURRENT_USER = { role: 'public' };
    updateUI();
    return;
  }

  try {
    var res = await fetch(API + '/auth/me', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.ok) {
      var data = await res.json();
      CURRENT_USER = data.user || data;
    } else {
      CURRENT_USER = { role: 'public' };
    }
  } catch (err) {
    CURRENT_USER = { role: 'public' };
  }

  updateUI();
}

function updateUI() {
  var homeBtn = document.getElementById('homeBtn');
  if (homeBtn) {
    if (CURRENT_USER && CURRENT_USER.role === 'metro_admin') {
      homeBtn.href = 'dashboard-metro.html';
    } else {
      homeBtn.href = 'dashboard-citizen.html';
    }
  }
}

/* ── 4. Budget loading & rendering ── */
async function loadBudgets(ward, fiscalYear) {
  var params = new URLSearchParams();
  if (ward) params.set('ward', ward);
  if (fiscalYear) params.set('fiscalYear', fiscalYear);

  try {
    var res = await fetch(API + '/budgets?' + params.toString());
    var data = await res.json();
    if (res.ok) renderBudgets(data.budgets);
  } catch (err) {
    console.error('Failed to load budgets:', err);
  }
}

function renderBudgets(budgets) {
  var en = isEn();
  var isMetro = CURRENT_USER && CURRENT_USER.role === 'metro_admin';

  /* --- Stat cards --- */
  var totalAllocated = budgets.reduce(function(s, b) { return s + b.allocatedAmount; }, 0);
  var totalSpent     = budgets.reduce(function(s, b) { return s + b.spentAmount; }, 0);
  var utilPct        = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0;
  var remaining      = totalAllocated - totalSpent;

  var cards = document.querySelectorAll('.finance-card');
  if (cards.length >= 3) {
    var amt1 = cards[0].querySelector('.amount');
    if (amt1) amt1.textContent = fmtNPR(totalAllocated);
    var amt2 = cards[1].querySelector('.amount');
    if (amt2) amt2.textContent = fmtNPR(totalSpent);
    var ring2 = cards[1].querySelector('.ring-label');
    if (ring2) ring2.textContent = utilPct + '%';
    var circle2 = cards[1].querySelector('.ring-fill');
    if (circle2) circle2.setAttribute('stroke-dashoffset', 264 - (264 * utilPct / 100));
    var amt3 = cards[2].querySelector('.amount');
    if (amt3) amt3.textContent = fmtNPR(remaining);
    var ring3 = cards[2].querySelector('.ring-label');
    if (ring3) ring3.textContent = (100 - utilPct) + '%';
    var circle3 = cards[2].querySelector('.ring-fill');
    if (circle3) circle3.setAttribute('stroke-dashoffset', 264 - (264 * (100 - utilPct) / 100));
  }

  /* --- Table header (columns differ by role) --- */
  var thead = document.querySelector('table thead tr');
  if (thead) {
    if (isMetro) {
      thead.innerHTML =
        '<th><span data-lang="ne">वडा</span><span data-lang="en">Ward</span></th>' +
        '<th><span data-lang="ne">आ.व.</span><span data-lang="en">Fiscal Year</span></th>' +
        '<th><span data-lang="ne">विनियोजित</span><span data-lang="en">Allocated</span></th>' +
        '<th><span data-lang="ne">खर्च</span><span data-lang="en">Spent</span></th>' +
        '<th><span data-lang="ne">प्रगति</span><span data-lang="en">Progress</span></th>' +
        '<th><span data-lang="ne">कार्य</span><span data-lang="en">Actions</span></th>';
    } else {
      thead.innerHTML =
        '<th><span data-lang="ne">वडा</span><span data-lang="en">Ward</span></th>' +
        '<th><span data-lang="ne">आ.व.</span><span data-lang="en">Fiscal Year</span></th>' +
        '<th><span data-lang="ne">विनियोजित</span><span data-lang="en">Allocated</span></th>' +
        '<th><span data-lang="ne">खर्च</span><span data-lang="en">Spent</span></th>' +
        '<th colspan="2"><span data-lang="ne">प्रगति</span><span data-lang="en">Progress</span></th>';
    }
  }

  /* --- Table body --- */
  var tbody = document.querySelector('table tbody');
  if (!tbody) return;

  var colspan = isMetro ? 6 : 5;

  if (budgets.length === 0) {
    tbody.innerHTML = '<tr><td colspan="' + colspan + '" style="text-align:center;padding:28px;color:var(--gray);">' +
      (en ? 'No budget records found.' : 'कुनै बजेट रेकर्ड फेला परेन।') + '</td></tr>';
    return;
  }

  var panelP = document.querySelector('.panel-header p');
  if (panelP) {
    panelP.innerHTML = en ? 'Showing all ' + budgets.length + ' wards' : 'सबै ' + budgets.length + ' वडा देखाइँदै';
  }

  tbody.innerHTML = budgets.map(function(b) {
    var pct   = b.allocatedAmount > 0 ? Math.round((b.spentAmount / b.allocatedAmount) * 100) : 0;
    var color = pct >= 90 ? 'var(--error)' : pct >= 70 ? 'var(--gold)' : 'var(--green-accent)';

    var progressBar =
      '<div style="display:flex;align-items:center;gap:8px;min-width:120px;">' +
      '<div style="flex:1;height:8px;border-radius:999px;background:var(--border);overflow:hidden;">' +
      '<div style="height:100%;width:' + pct + '%;background:' + color + ';border-radius:999px;"></div></div>' +
      '<span style="font-size:0.8rem;font-weight:700;color:' + color + ';font-family:Poppins,sans-serif;">' +
      pct + '%</span></div>';

    var editBtn = isMetro
      ? '<button onclick="openEditModal(\'' + b._id + '\')" class="btn-edit-row">' +
        (en ? 'Edit' : 'सम्पादन') + '</button>'
      : '';

    var row = '<tr>' +
      '<td><span class="ward-pill">' +
      (en ? 'Ward ' + b.ward : 'वडा ' + toNepaliDigits(b.ward)) + '</span></td>' +
      '<td>' + b.fiscalYear + '</td>' +
      '<td><strong>' + fmtNPR(b.allocatedAmount) + '</strong></td>' +
      '<td style="color:var(--warning);font-weight:600;">' + fmtNPR(b.spentAmount) + '</td>';

    if (isMetro) {
      row += '<td>' + progressBar + '</td><td>' + editBtn + '</td>';
    } else {
      row += '<td colspan="2">' + progressBar + '</td>';
    }

    row += '</tr>';
    return row;
  }).join('');
}

/* ── 5. Edit modal ── */
async function openEditModal(id) {
  var en = isEn();

  try {
    var res = await fetch(API + '/budgets/' + id);
    var data = await res.json();
    var b = data.budget;

    var html =
      '<div class="budget-edit-form">' +
      '<div class="bef-header">' +
      '<div class="bef-icon">' +
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--green-deep)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg></div>' +
      '<div><h3>' + (en ? 'Edit Budget — Ward ' + b.ward : 'बजेट सम्पादन — वडा ' + toNepaliDigits(b.ward)) + '</h3>' +
      '<p style="font-size:0.82rem;color:var(--gray);">' +
      (en ? 'Fiscal Year: ' + b.fiscalYear : 'आ.व. ' + b.fiscalYear) + '</p></div></div>' +
      '<div class="bef-body">' +
      '<div class="bef-field">' +
      '<label>' + (en ? 'Total Allocated Budget' : 'कुल विनियोजित बजेट') + '</label>' +
      '<div class="bef-input-wrap"><span class="bef-prefix">रु.</span>' +
      '<input id="editAllocated" type="number" value="' + b.allocatedAmount + '" min="0" step="1000"></div></div>' +
      '<div class="bef-field">' +
      '<label>' + (en ? 'Amount Spent So Far' : 'हालसम्म खर्च भएको रकम') + '</label>' +
      '<div class="bef-input-wrap"><span class="bef-prefix">रु.</span>' +
      '<input id="editSpent" type="number" value="' + b.spentAmount + '" min="0" step="1000"></div></div>' +
      '<div class="bef-stats">' +
      '<div class="bef-stat"><span>' + (en ? 'Allocated' : 'विनियोजित') + '</span>' +
      '<strong>' + fmtNPR(b.allocatedAmount) + '</strong></div>' +
      '<div class="bef-stat"><span>' + (en ? 'Remaining' : 'बाँकी') + '</span>' +
      '<strong style="color:var(--info);">' + fmtNPR(b.allocatedAmount - b.spentAmount) + '</strong></div></div></div>' +
      '<div class="bef-footer">' +
      '<button onclick="closeEditModal()" class="btn-cancel">' +
      (en ? 'Cancel' : 'रद्द गर्नुहोस्') + '</button>' +
      '<button onclick="saveBudget(\'' + id + '\')" class="btn-save">' +
      (en ? 'Save Changes' : 'परिवर्तन सुरक्षित गर्नुहोस्') + '</button></div></div>';

    document.getElementById('editModalBody').innerHTML = html;
    document.getElementById('editOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';

  } catch (err) {
    console.error('Failed to open edit modal:', err);
  }
}

function closeEditModal() {
  document.getElementById('editOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

async function saveBudget(id) {
  var en = isEn();
  var allocated = Number(document.getElementById('editAllocated').value);
  var spent     = Number(document.getElementById('editSpent').value);

  if (isNaN(allocated) || allocated < 0) {
    alert(en ? 'Enter a valid allocated amount' : 'वैध विनियोजित रकम प्रविष्ट गर्नुहोस्');
    return;
  }

  try {
    var res = await fetch(API + '/budgets/' + id, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + getToken()
      },
      body: JSON.stringify({ allocatedAmount: allocated, spentAmount: spent })
    });

    if (res.ok) {
      closeEditModal();
      loadBudgets();
    } else {
      var d = await res.json();
      alert(d.message || 'Update failed');
    }
  } catch (err) {
    console.error('Save failed:', err);
  }
}

/* ── 6. Init ── */
document.addEventListener('DOMContentLoaded', function() {
  var savedLang = localStorage.getItem('nagarikAawazLang');
  if (savedLang === 'en') setLang('en');

  loadCurrentUser().then(function() {
    loadBudgets();
  });

  var wardFilter = document.getElementById('wardFilter');
  if (wardFilter) {
    for (var i = 1; i <= 33; i++) {
      var opt = document.createElement('option');
      opt.value = i;
      opt.textContent = 'वडा नं. ' + toNepaliDigits(i) + ' / Ward ' + i;
      wardFilter.appendChild(opt);
    }
    wardFilter.addEventListener('change', function() {
      var fy = document.getElementById('fiscalYearFilter')
        ? document.getElementById('fiscalYearFilter').value : '';
      loadBudgets(wardFilter.value, fy);
    });
  }

  var fyFilter = document.getElementById('fiscalYearFilter');
  if (fyFilter) {
    fyFilter.addEventListener('change', function() {
      var ward = wardFilter ? wardFilter.value : '';
      loadBudgets(ward, fyFilter.value);
    });
  }
});