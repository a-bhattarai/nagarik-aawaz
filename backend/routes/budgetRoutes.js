const express = require("express");
const router = express.Router();
const Budget = require("../models/budget");
const { protect, authorize } = require("../middleware/auth");

// Never expose `breakdown` (task division) — everything else is fine to show,
// including _id, since the frontend needs it to open the edit modal.
const PUBLIC_FIELDS = "_id ward fiscalYear allocatedAmount spentAmount";

/**
 * Helper function to safely convert to number
 */
function safeNumber(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const num = Number(value);
  return isNaN(num) ? undefined : num;
}

/**
 * GET /api/budgets?ward=&fiscalYear=
 * PUBLIC — citizens browse without logging in.
 * Ward officials see only their ward.
 * Metro admins see all wards.
 * Returns { budgets: [...] } to match scriptbudget.js's `data.budgets`.
 */
router.get("/", async (req, res) => {
  try {
    const { ward, fiscalYear } = req.query;
    const filter = {};

    // Check if user is authenticated via token
    let user = null;
    const token = req.headers.authorization?.split(" ")[1];

    if (token) {
      try {
        const jwt = require("jsonwebtoken");
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const User = require("../models/user");
        user = await User.findById(decoded.id).select("-password");
        console.log("User role:", user ? user.role : "none");
        console.log("Is Metro Admin:", user && user.role === "metro_admin");
      } catch (err) {
        // Token invalid, continue as public
        console.log("Invalid token, treating as public user");
      }
    }

    // Role-based filtering
    if (user && user.role === "ward_official") {
      // Ward officials can only see their own ward
      if (user.ward && !isNaN(user.ward)) {
        filter.ward = Number(user.ward);
      } else {
        // If ward official has no ward assigned, return empty
        return res.status(200).json({ budgets: [] });
      }
    } else if (ward) {
      // Citizens and metro admins can filter by ward
      const wardNum = safeNumber(ward);
      if (wardNum !== undefined) {
        filter.ward = wardNum;
      }
    }
    // If no ward filter and not ward_official, show all wards

    if (fiscalYear) {
      filter.fiscalYear = fiscalYear;
    }

    let budgets = await Budget.find(filter)
      .select(PUBLIC_FIELDS)
      .sort({ ward: 1 });

    // If ward official and no budget found, create default one
    if (
      user &&
      user.role === "ward_official" &&
      budgets.length === 0 &&
      user.ward &&
      !isNaN(user.ward)
    ) {
      const wardNum = Number(user.ward);
      console.log(`Creating default budget for ward ${wardNum}`);

      const defaultBudget = new Budget({
        ward: wardNum,
        fiscalYear: fiscalYear || "2082/83",
        allocatedAmount: 0,
        spentAmount: 0,
        updatedBy: user.id,
        lastUpdated: new Date(),
      });

      await defaultBudget.save();

      // Fetch the newly created budget
      budgets = await Budget.find({ ward: wardNum })
        .select(PUBLIC_FIELDS)
        .sort({ ward: 1 });
    }

    // Log what we're sending
    console.log(
      `Sending ${budgets.length} budgets, isMetro: ${user && user.role === "metro_admin"}`,
    );

    // IMPORTANT: Return exact format frontend expects
    res.status(200).json({ budgets });
  } catch (err) {
    console.error("Error fetching budgets:", err);
    res
      .status(500)
      .json({ message: "Error fetching budgets", error: err.message });
  }
});

/**
 * GET /api/budgets/ward/:wardNumber
 * Get budget for a specific ward (Metro Admin can use this)
 */
router.get("/ward/:wardNumber", async (req, res) => {
  try {
    const wardNum = safeNumber(req.params.wardNumber);
    if (wardNum === undefined) {
      return res.status(400).json({ message: "Invalid ward number" });
    }

    const { fiscalYear } = req.query;
    const filter = { ward: wardNum };
    if (fiscalYear) {
      filter.fiscalYear = fiscalYear;
    }

    const budget = await Budget.findOne(filter).select(PUBLIC_FIELDS);

    if (!budget) {
      return res.status(404).json({
        message: `No budget found for Ward ${wardNum}`,
        budget: null,
      });
    }

    res.status(200).json({ budget });
  } catch (err) {
    console.error("Error fetching ward budget:", err);
    res
      .status(500)
      .json({ message: "Error fetching ward budget", error: err.message });
  }
});

/**
 * GET /api/budgets/summary?fiscalYear=&ward=
 * PUBLIC — totals across all wards (or one ward if ?ward= given).
 */
router.get("/summary", async (req, res) => {
  try {
    const { fiscalYear, ward } = req.query;
    const match = {};

    // Check for authenticated user
    let user = null;
    const token = req.headers.authorization?.split(" ")[1];

    if (token) {
      try {
        const jwt = require("jsonwebtoken");
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const User = require("../models/user");
        user = await User.findById(decoded.id);
      } catch (err) {
        // Invalid token, continue as public
      }
    }

    // Role-based filtering for summary
    if (user && user.role === "ward_official") {
      if (user.ward && !isNaN(user.ward)) {
        match.ward = Number(user.ward);
      } else {
        return res.status(200).json({
          allocatedBudget: 0,
          spentAmount: 0,
          treasuryBalance: 0,
          spentPercent: 0,
        });
      }
    } else if (ward) {
      const wardNum = safeNumber(ward);
      if (wardNum !== undefined) {
        match.ward = wardNum;
      }
    }

    if (fiscalYear) {
      match.fiscalYear = fiscalYear;
    }

    const [totals] = await Budget.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalAllocated: { $sum: "$allocatedAmount" },
          totalSpent: { $sum: "$spentAmount" },
        },
      },
    ]);

    const totalAllocated = totals?.totalAllocated || 0;
    const totalSpent = totals?.totalSpent || 0;

    res.status(200).json({
      allocatedBudget: totalAllocated,
      spentAmount: totalSpent,
      treasuryBalance: totalAllocated - totalSpent,
      spentPercent: totalAllocated
        ? Math.round((totalSpent / totalAllocated) * 100)
        : 0,
    });
  } catch (err) {
    console.error("Error fetching summary:", err);
    res
      .status(500)
      .json({ message: "Error fetching budget summary", error: err.message });
  }
});

/**
 * GET /api/budgets/:id
 * PUBLIC — fetch a single budget by Mongo _id (used by openEditModal).
 * Returns { budget: {...} } to match scriptbudget.js's `data.budget`.
 */
router.get("/:id", async (req, res) => {
  try {
    const budget = await Budget.findById(req.params.id).select(PUBLIC_FIELDS);
    if (!budget) {
      return res.status(404).json({ message: "Budget record not found" });
    }

    // Check if user has permission to view this budget
    const token = req.headers.authorization?.split(" ")[1];
    let user = null;

    if (token) {
      try {
        const jwt = require("jsonwebtoken");
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const User = require("../models/user");
        user = await User.findById(decoded.id);
      } catch (err) {
        // Invalid token, continue as public
      }
    }

    // Ward officials can only view their own ward's budget
    if (
      user &&
      user.role === "ward_official" &&
      user.ward &&
      !isNaN(user.ward)
    ) {
      if (Number(user.ward) !== budget.ward) {
        return res.status(403).json({
          message: "You can only access your own ward's budget",
        });
      }
    }

    res.status(200).json({ budget });
  } catch (err) {
    console.error("Error fetching budget:", err);
    res
      .status(500)
      .json({ message: "Error fetching budget", error: err.message });
  }
});

/**
 * POST /api/budgets
 * METRO ADMIN ONLY — create a new ward budget
 * Frontend calls this when clicking "Add Budget" or "Create New"
 */
router.post("/", protect, authorize("metro_admin"), async (req, res) => {
  try {
    const { ward, fiscalYear, allocatedAmount, spentAmount } = req.body;

    console.log("Creating budget with data:", req.body);

    // Validate ward
    const wardNum = safeNumber(ward);
    if (wardNum === undefined) {
      return res.status(400).json({
        message: "Valid ward number is required",
      });
    }

    // Validate fiscal year
    if (!fiscalYear) {
      return res.status(400).json({
        message: "Fiscal year is required",
      });
    }

    // Check if budget already exists
    const existing = await Budget.findOne({ ward: wardNum, fiscalYear });
    if (existing) {
      return res.status(409).json({
        message: `Budget for Ward ${wardNum} (${fiscalYear}) already exists`,
        budget: existing,
      });
    }

    const budget = await Budget.create({
      ward: wardNum,
      fiscalYear,
      allocatedAmount: Number(allocatedAmount) || 0,
      spentAmount: Number(spentAmount) || 0,
      updatedBy: req.user.id,
      lastUpdated: new Date(),
    });

    // Return the created budget
    const createdBudget = await Budget.findById(budget._id).select(
      PUBLIC_FIELDS,
    );

    res.status(201).json({
      budget: createdBudget,
      message: `Budget for Ward ${wardNum} (${fiscalYear}) created successfully`,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: "A budget for this ward and fiscal year already exists",
      });
    }
    console.error("Error creating budget:", err);
    res
      .status(500)
      .json({ message: "Error creating budget", error: err.message });
  }
});

/**
 * PUT /api/budgets/:id
 * METRO ADMIN ONLY — update allocated/spent by Mongo _id
 * Frontend calls this when saving edits from the modal
 */
router.put("/:id", protect, authorize("metro_admin"), async (req, res) => {
  try {
    const { allocatedAmount, spentAmount } = req.body;

    console.log("Updating budget with data:", req.body);

    // Validate inputs
    if (allocatedAmount === undefined && spentAmount === undefined) {
      return res.status(400).json({
        message:
          "At least one field (allocatedAmount or spentAmount) is required",
      });
    }

    const updateData = {
      updatedBy: req.user.id,
      lastUpdated: new Date(),
    };

    if (allocatedAmount !== undefined) {
      const allocNum = Number(allocatedAmount);
      if (isNaN(allocNum) || allocNum < 0) {
        return res.status(400).json({
          message: "Allocated amount must be a valid positive number",
        });
      }
      updateData.allocatedAmount = allocNum;
    }

    if (spentAmount !== undefined) {
      const spentNum = Number(spentAmount);
      if (isNaN(spentNum) || spentNum < 0) {
        return res.status(400).json({
          message: "Spent amount must be a valid positive number",
        });
      }
      updateData.spentAmount = spentNum;
    }

    const budget = await Budget.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).select(PUBLIC_FIELDS);

    if (!budget) {
      return res.status(404).json({ message: "Budget record not found" });
    }

    res.status(200).json({
      budget,
      message: `Budget for Ward ${budget.ward} updated successfully`,
    });
  } catch (err) {
    console.error("Error updating budget:", err);
    res
      .status(500)
      .json({ message: "Error updating budget", error: err.message });
  }
});

/**
 * DELETE /api/budgets/:id
 * METRO ADMIN ONLY — delete a budget
 * Frontend calls this when clicking "Delete" button
 */
router.delete("/:id", protect, authorize("metro_admin"), async (req, res) => {
  try {
    const budget = await Budget.findById(req.params.id);
    if (!budget) {
      return res.status(404).json({ message: "Budget record not found" });
    }

    const wardInfo = `Ward ${budget.ward} (${budget.fiscalYear})`;
    await Budget.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: `Budget for ${wardInfo} deleted successfully`,
      deletedBudget: {
        id: budget._id,
        ward: budget.ward,
        fiscalYear: budget.fiscalYear,
        allocatedAmount: budget.allocatedAmount,
        spentAmount: budget.spentAmount,
      },
    });
  } catch (err) {
    console.error("Error deleting budget:", err);
    res
      .status(500)
      .json({ message: "Error deleting budget", error: err.message });
  }
});

/**
 * POST /api/budgets/bulk
 * METRO ADMIN ONLY — create budgets for multiple wards at once
 * Useful for initial setup
 */
router.post("/bulk", protect, authorize("metro_admin"), async (req, res) => {
  try {
    const { budgets, fiscalYear } = req.body;

    if (!budgets || !Array.isArray(budgets) || budgets.length === 0) {
      return res.status(400).json({
        message: "Please provide an array of budgets",
      });
    }

    const results = {
      created: [],
      failed: [],
      skipped: [],
    };

    for (const item of budgets) {
      try {
        const wardNum = safeNumber(item.ward);
        if (wardNum === undefined) {
          results.failed.push({ ...item, error: "Invalid ward number" });
          continue;
        }

        const fiscalYearToUse = item.fiscalYear || fiscalYear || "2082/83";

        // Check if exists
        const existing = await Budget.findOne({
          ward: wardNum,
          fiscalYear: fiscalYearToUse,
        });

        if (existing) {
          results.skipped.push({
            ward: wardNum,
            fiscalYear: fiscalYearToUse,
            reason: "Already exists",
          });
          continue;
        }

        const budget = await Budget.create({
          ward: wardNum,
          fiscalYear: fiscalYearToUse,
          allocatedAmount: Number(item.allocatedAmount) || 0,
          spentAmount: Number(item.spentAmount) || 0,
          updatedBy: req.user.id,
          lastUpdated: new Date(),
        });

        results.created.push(budget);
      } catch (err) {
        results.failed.push({ ...item, error: err.message });
      }
    }

    res.status(201).json({
      message: `Created ${results.created.length} budgets`,
      results,
    });
  } catch (err) {
    console.error("Error creating bulk budgets:", err);
    res
      .status(500)
      .json({ message: "Error creating budgets", error: err.message });
  }
});

module.exports = router;
