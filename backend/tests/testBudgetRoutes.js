const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api/budgets';
const WARD_OFFICIAL_TOKEN = process.env.WARD_OFFICIAL_TOKEN || '';
const METRO_ADMIN_TOKEN = process.env.METRO_ADMIN_TOKEN || '';

// Use a ward number that matches the ward_official token's `ward` claim,
// so the "own ward" permission check passes. Adjust to match your test user.
const TEST_WARD = Number(process.env.TEST_WARD || 5);
const TEST_FISCAL_YEAR = '2082/83-TEST'; // distinct value so cleanup is safe

let createdBudgetId = null;
let passed = 0;
let failed = 0;

function logResult(name, ok, detail = '') {
  const status = ok ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${name}${detail ? ' - ' + detail : ''}`);
  ok ? passed++ : failed++;
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    // no JSON body, fine for some responses
  }
  return { status: res.status, body };
}

async function run() {
  console.log(`\nRunning budget route smoke tests against ${BASE_URL}\n`);

  if (!WARD_OFFICIAL_TOKEN || !METRO_ADMIN_TOKEN) {
    console.log(
      'WARNING: WARD_OFFICIAL_TOKEN and/or METRO_ADMIN_TOKEN not set.\n' +
      'Role-protected tests will be skipped. Log in via the auth API to get tokens.\n'
    );
  }

  // 1. Public GET (no auth) should work
  {
    const { status, body } = await request('/');
    logResult('GET /api/budgets (public, no auth)', status === 200, `status ${status}`);
  }

  // 2. POST without a token should be rejected
  {
    const { status } = await request('/', {
      method: 'POST',
      body: JSON.stringify({ ward: TEST_WARD, fiscalYear: TEST_FISCAL_YEAR, allocatedAmount: 1000 })
    });
    logResult('POST without token is rejected', status === 401, `status ${status}`);
  }

  if (WARD_OFFICIAL_TOKEN) {
    // 3. ward_official creates a budget for their own ward -> should succeed
    const { status, body } = await request('/', {
      method: 'POST',
      headers: { Authorization: `Bearer ${WARD_OFFICIAL_TOKEN}` },
      body: JSON.stringify({
        ward: TEST_WARD,
        fiscalYear: TEST_FISCAL_YEAR,
        allocatedAmount: 500000,
        spentAmount: 120000,
        breakdown: [
          { category: 'Road Maintenance', project: 'Ward Road Repair', allocatedAmount: 300000, spentAmount: 100000 },
          { category: 'Sanitation', allocatedAmount: 200000, spentAmount: 20000 }
        ]
      })
    });
    logResult('ward_official creates budget for own ward', status === 201, `status ${status}: ${JSON.stringify(body)}`);
    if (status === 201 && body?.budget?._id) createdBudgetId = body.budget._id;

    // 4. ward_official tries a DIFFERENT ward -> should be forbidden
    const other = await request('/', {
      method: 'POST',
      headers: { Authorization: `Bearer ${WARD_OFFICIAL_TOKEN}` },
      body: JSON.stringify({
        ward: TEST_WARD + 1,
        fiscalYear: TEST_FISCAL_YEAR,
        allocatedAmount: 1000
      })
    });
    logResult('ward_official blocked from other ward', other.status === 403, `status ${other.status}`);
  }

  // 5. GET single budget by id (public)
  if (createdBudgetId) {
    const { status, body } = await request(`/${createdBudgetId}`);
    logResult('GET /api/budgets/:id (public)', status === 200 && body?.budget?.ward === TEST_WARD, `status ${status}`);
  }

  if (WARD_OFFICIAL_TOKEN && createdBudgetId) {
    // 6. ward_official updates their own ward's budget
    const { status, body } = await request(`/${createdBudgetId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${WARD_OFFICIAL_TOKEN}` },
      body: JSON.stringify({ spentAmount: 150000 })
    });
    logResult('ward_official updates own ward budget', status === 200 && body?.budget?.spentAmount === 150000, `status ${status}`);
  }

  if (METRO_ADMIN_TOKEN && createdBudgetId) {
    // 7. metro_admin can update any ward's budget
    const { status } = await request(`/${createdBudgetId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${METRO_ADMIN_TOKEN}` },
      body: JSON.stringify({ allocatedAmount: 550000 })
    });
    logResult('metro_admin updates any ward budget', status === 200, `status ${status}`);

    // 8. metro_admin cleans up test record
    const del = await request(`/${createdBudgetId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${METRO_ADMIN_TOKEN}` }
    });
    logResult('metro_admin deletes test budget (cleanup)', del.status === 200, `status ${del.status}`);
  } else if (createdBudgetId) {
    console.log(`\nNOTE: Test budget record ${createdBudgetId} was NOT deleted (no METRO_ADMIN_TOKEN set). Clean it up manually.`);
  }

  console.log(`\nDone. ${passed} passed, ${failed} failed.\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Test script crashed:', err);
  process.exit(1);
});
