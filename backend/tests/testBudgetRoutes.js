const BASE_URL = process.env.BASE_URL || "http://localhost:5000/api/budgets";
const WARD_OFFICIAL_TOKEN = process.env.WARD_OFFICIAL_TOKEN || "";
const METRO_ADMIN_TOKEN = process.env.METRO_ADMIN_TOKEN || "";
const CITIZEN_TOKEN = process.env.CITIZEN_TOKEN || "";

// Must match the ward_official token's `ward` claim.
const TEST_WARD = Number(process.env.TEST_WARD || 5);
// Any ward different from TEST_WARD, used to prove ward_official is locked out.
const OTHER_WARD = Number(process.env.OTHER_WARD || TEST_WARD + 1);
const TEST_FISCAL_YEAR = "2082/83-TEST"; // distinct value so cleanup is safe

let createdBudgetId = null;
let passed = 0;
let failed = 0;

function logResult(name, ok, detail = "") {
  const status = ok ? "PASS" : "FAIL";
  console.log(`[${status}] ${name}${detail ? " - " + detail : ""}`);
  ok ? passed++ : failed++;
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    // no JSON body, fine for some responses
  }
  return { status: res.status, body };
}

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

async function run() {
  console.log(`\nRunning budget route smoke tests against ${BASE_URL}\n`);

  if (!WARD_OFFICIAL_TOKEN || !METRO_ADMIN_TOKEN || !CITIZEN_TOKEN) {
    console.log(
      "WARNING: one or more of WARD_OFFICIAL_TOKEN / METRO_ADMIN_TOKEN / " +
        "CITIZEN_TOKEN not set. Related tests will be skipped.\n",
    );
  }

  // 1. GET without auth should now be rejected (login is required to view)
  {
    const { status } = await request("/");
    logResult(
      "GET /api/budgets with no token is rejected",
      status === 401,
      `status ${status}`,
    );
  }

  // 2. POST without a token should be rejected
  {
    const { status } = await request("/", {
      method: "POST",
      body: JSON.stringify({
        ward: TEST_WARD,
        fiscalYear: TEST_FISCAL_YEAR,
        allocatedAmount: 1000,
      }),
    });
    logResult(
      "POST without token is rejected",
      status === 401,
      `status ${status}`,
    );
  }

  // 3. ward_official can no longer create budgets at all - not even for
  //    their own ward. Creation is metro_admin only now.
  if (WARD_OFFICIAL_TOKEN) {
    const { status } = await request("/", {
      method: "POST",
      headers: authHeader(WARD_OFFICIAL_TOKEN),
      body: JSON.stringify({
        ward: TEST_WARD,
        fiscalYear: TEST_FISCAL_YEAR,
        allocatedAmount: 500000,
      }),
    });
    logResult(
      "ward_official is blocked from creating (view-only now)",
      status === 403,
      `status ${status}`,
    );
  }

  // 4. citizen can never create either
  if (CITIZEN_TOKEN) {
    const { status } = await request("/", {
      method: "POST",
      headers: authHeader(CITIZEN_TOKEN),
      body: JSON.stringify({
        ward: TEST_WARD,
        fiscalYear: TEST_FISCAL_YEAR,
        allocatedAmount: 500000,
      }),
    });
    logResult(
      "citizen is blocked from creating",
      status === 403,
      `status ${status}`,
    );
  }

  // 5. Only metro_admin can actually create the test record we'll use below
  if (METRO_ADMIN_TOKEN) {
    const { status, body } = await request("/", {
      method: "POST",
      headers: authHeader(METRO_ADMIN_TOKEN),
      body: JSON.stringify({
        ward: TEST_WARD,
        fiscalYear: TEST_FISCAL_YEAR,
        allocatedAmount: 500000,
        spentAmount: 120000,
        breakdown: [
          {
            category: "Road Maintenance",
            project: "Ward Road Repair",
            allocatedAmount: 300000,
            spentAmount: 100000,
          },
          {
            category: "Sanitation",
            allocatedAmount: 200000,
            spentAmount: 20000,
          },
        ],
      }),
    });
    logResult(
      "metro_admin creates test budget",
      status === 201,
      `status ${status}: ${JSON.stringify(body)}`,
    );
    if (status === 201 && body?.budget?._id) createdBudgetId = body.budget._id;
  } else {
    console.log(
      "SKIPPED remaining tests that need a test record: METRO_ADMIN_TOKEN not set.\n",
    );
  }

  if (createdBudgetId) {
    // 6. ward_official viewing the list is silently pinned to their own
    //    ward, even if a different ?ward= is requested.
    if (WARD_OFFICIAL_TOKEN) {
      const { status, body } = await request(`/?ward=${OTHER_WARD}`, {
        headers: authHeader(WARD_OFFICIAL_TOKEN),
      });
      const onlyOwnWard =
        Array.isArray(body?.budgets) &&
        body.budgets.every((b) => b.ward === TEST_WARD);
      logResult(
        "ward_official list is locked to own ward (ignores ?ward= override)",
        status === 200 && onlyOwnWard,
        `status ${status}, wards seen: ${body?.budgets?.map((b) => b.ward)}`,
      );
    }

    // 7. ward_official CAN view a single budget in their own ward
    if (WARD_OFFICIAL_TOKEN) {
      const { status } = await request(`/${createdBudgetId}`, {
        headers: authHeader(WARD_OFFICIAL_TOKEN),
      });
      logResult(
        "ward_official can view own-ward budget by id",
        status === 200,
        `status ${status}`,
      );
    }

    // 8. citizen can view the same record too (transparency, any ward)
    if (CITIZEN_TOKEN) {
      const { status, body } = await request(`/${createdBudgetId}`, {
        headers: authHeader(CITIZEN_TOKEN),
      });
      logResult(
        "citizen can view any ward's budget by id",
        status === 200 && body?.budget?.ward === TEST_WARD,
        `status ${status}`,
      );
    }

    // 9. ward_official can no longer update, even their own ward's budget
    if (WARD_OFFICIAL_TOKEN) {
      const { status } = await request(`/${createdBudgetId}`, {
        method: "PUT",
        headers: authHeader(WARD_OFFICIAL_TOKEN),
        body: JSON.stringify({ spentAmount: 150000 }),
      });
      logResult(
        "ward_official is blocked from updating (view-only now)",
        status === 403,
        `status ${status}`,
      );
    }

    // 10. metro_admin can still update any ward's budget
    if (METRO_ADMIN_TOKEN) {
      const { status } = await request(`/${createdBudgetId}`, {
        method: "PUT",
        headers: authHeader(METRO_ADMIN_TOKEN),
        body: JSON.stringify({ allocatedAmount: 550000 }),
      });
      logResult(
        "metro_admin updates any ward budget",
        status === 200,
        `status ${status}`,
      );
    }

    // 11. ward_official cannot delete
    if (WARD_OFFICIAL_TOKEN) {
      const { status } = await request(`/${createdBudgetId}`, {
        method: "DELETE",
        headers: authHeader(WARD_OFFICIAL_TOKEN),
      });
      logResult(
        "ward_official is blocked from deleting",
        status === 403,
        `status ${status}`,
      );
    }

    // 12. metro_admin cleans up the test record
    if (METRO_ADMIN_TOKEN) {
      const { status } = await request(`/${createdBudgetId}`, {
        method: "DELETE",
        headers: authHeader(METRO_ADMIN_TOKEN),
      });
      logResult(
        "metro_admin deletes test budget (cleanup)",
        status === 200,
        `status ${status}`,
      );
    } else {
      console.log(
        `\nNOTE: Test budget record ${createdBudgetId} was NOT deleted (no METRO_ADMIN_TOKEN set). Clean it up manually.`,
      );
    }
  }

  console.log(`\nDone. ${passed} passed, ${failed} failed.\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("Test script crashed:", err);
  process.exit(1);
});
