/* ================================================================
   NAGARIK AAWAZ — scriptbudget.js
================================================================ */

const API = 'http://localhost:5001/api';

/* ── Language ── */
function setLang(lang) {
  document.body.classList.toggle('lang-mode-en', lang === 'en');
  document.getElementById('btn-ne').classList.toggle('active', lang === 'ne');
  document.getElementById('btn-en').classList.toggle('active', lang === 'en');
  localStorage.setItem('nagarikAawazLang', lang);
}

function toNepaliDigits(n) {
  const map = {'0':'०','1':'१','2':'२','3':'३','4':'४','5':'५','6':'६','7':'७','8':'८','9':'९'};
  return String(n).split('').map(d => map[d] ?? d).join('');
}

function fmtNPR(n) {
  if (n >= 10000000) return `रु. ${(n / 10000000).toFixed(1)} करोड`;
  if (n >= 100000)   return `रु. ${(n / 100000).toFixed(1)} लाख`;
  return `रु. ${n.toLocaleString()}`;
}

/* ── Fetch and render budgets ── */
async function loadBudgets(ward = '', fiscalYear = '') {
  const params = new URLSearchParams();
  if (ward)       params.set('ward', ward);
  if (fiscalYear) params.set('fiscalYear', fiscalYear);

  try {
    const res  = await fetch(`${API}/budgets?${params.toString()}`);
    const data = await res.json();
    if (res.ok) renderBudgets(data.budgets);
    else        console.error('Failed to load budgets:', data.message);
  } catch (err) {
    console.error('Network error loading budgets:', err);
  }
}

function renderBudgets(budgets) {
  /* ── Stat cards ── */
  const totalAllocated = budgets.reduce((s, b) => s + b.allocatedAmount, 0);
  const totalSpent     = budgets.reduce((s, b) => s + b.spentAmount,     0);
  const utilPct        = totalAllocated > 0
    ? Math.round((totalSpent / totalAllocated) * 100)
    : 0;

  const elAlloc = document.getElementById('statAllocated');
  const elSpent = document.getElementById('statSpent');
  const elUtil  = document.getElementById('statUtilPct');
  if (elAlloc) elAlloc.textContent = fmtNPR(totalAllocated);
  if (elSpent) elSpent.textContent = fmtNPR(totalSpent);
  if (elUtil)  elUtil.textContent  = `${utilPct}%`;

  /* ── Budget table ── */
  const tbody = document.getElementById('budgetTableBody');
  if (!tbody) return;

  if (budgets.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:28px;color:var(--gray);">
      <span data-lang="ne">कुनै बजेट रेकर्ड फेला परेन।</span>
      <span data-lang="en">No budget records found.</span>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = budgets.map(b => {
    const pct   = b.allocatedAmount > 0
      ? Math.round((b.spentAmount / b.allocatedAmount) * 100)
      : 0;
    const color = pct >= 90 ? 'var(--error)' : pct >= 70 ? 'var(--gold)' : 'var(--green-accent)';

    return `<tr>
      <td class="td-ward">
        <span data-lang="ne">वडा नं. ${toNepaliDigits(b.ward)}</span>
        <span data-lang="en">Ward ${b.ward}</span>
      </td>
      <td class="td-fiscal">${b.fiscalYear}</td>
      <td class="td-amount">${fmtNPR(b.allocatedAmount)}</td>
      <td class="td-amount" style="color:var(--warning);">${fmtNPR(b.spentAmount)}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px;min-width:120px;">
          <div style="flex:1;height:6px;border-radius:999px;background:var(--border);overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:${color};border-radius:999px;transition:width 0.8s ease;"></div>
          </div>
          <span style="font-size:0.76rem;font-weight:700;color:${color};font-family:'Poppins',sans-serif;">${pct}%</span>
        </div>
      </td>
    </tr>`;
  }).join('');
}

/* ── Vote button (existing feature) ── */
function toggleVote(btn) {
  const voted = btn.classList.toggle('voted');
  const span  = btn.querySelector('[data-vote]');
  let count   = parseInt(span.textContent, 10);
  span.textContent = voted ? count + 1 : count - 1;
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  const savedLang = localStorage.getItem('nagarikAawazLang');
  if (savedLang === 'en') setLang('en');

  // Ward dropdown 1–33
  const wardFilter = document.getElementById('wardFilter');
  if (wardFilter) {
    for (let i = 1; i <= 33; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `वडा नं. ${toNepaliDigits(i)} / Ward ${i}`;
      wardFilter.appendChild(opt);
    }
    wardFilter.addEventListener('change', () => {
      const fy = document.getElementById('fiscalYearFilter')?.value || '';
      loadBudgets(wardFilter.value, fy);
    });
  }

  const fyFilter = document.getElementById('fiscalYearFilter');
  if (fyFilter) {
    fyFilter.addEventListener('change', () => {
      const ward = wardFilter?.value || '';
      loadBudgets(ward, fyFilter.value);
    });
  }

  // Initial load — all budgets, no filter
  loadBudgets();
});