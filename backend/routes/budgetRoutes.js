const express = require("express");
const router = express.Router();
const Budget = require("../models/Budget");
const { protect, authorize } = require("../middleware/auth");

/**
 * @route   GET /api/budgets
 * @desc    List all budgets. Optional filters: ?ward=5&fiscalYear=2081/82
 * @access  Any logged-in user (citizen, ward_official, metro_admin) —
 *          login is now required to view, unlike before when this was public.
 */
router.get("/", protect, async (req, res) => {
  try {
    const filter = {};
    if (req.query.ward) filter.ward = Number(req.query.ward);
    if (req.query.fiscalYear) filter.fiscalYear = req.query.fiscalYear;

    const budgets = await Budget.find(filter).sort({ ward: 1, fiscalYear: -1 });
    res.status(200).json({ count: budgets.length, budgets });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch budgets", error: err.message });
  }
});

/**
 * @route   GET /api/budgets/:id
 * @desc    Get a single budget record by its Mongo _id
 * @access  Any logged-in user
 */
router.get("/:id", protect, async (req, res) => {
  try {
    const budget = await Budget.findById(req.params.id);
    if (!budget)
      return res.status(404).json({ message: "Budget record not found" });
    res.status(200).json({ budget });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch budget", error: err.message });
  }
});

/**
 * @route   POST /api/budgets
 * @desc    Create a new ward budget record for a fiscal year
 * @access  metro_admin ONLY — ward_official can no longer create budgets,
 *          view-only for that role now.
 */
router.post("/", protect, authorize("metro_admin"), async (req, res) => {
  try {
    const { ward, fiscalYear, allocatedAmount, spentAmount, breakdown } =
      req.body;

    if (ward === undefined || !fiscalYear || allocatedAmount === undefined) {
      return res.status(400).json({
        message: "ward, fiscalYear, and allocatedAmount are required",
      });
    }

    const existing = await Budget.findOne({ ward, fiscalYear });
    if (existing) {
      return res.status(409).json({
        message: `Budget for ward ${ward}, fiscal year ${fiscalYear} already exists. Use PUT to update it.`,
      });
    }

    const budget = await Budget.create({
      ward,
      fiscalYear,
      allocatedAmount,
      spentAmount: spentAmount || 0,
      breakdown: breakdown || [],
      updatedBy: req.user.id,
    });

    res.status(201).json({ message: "Budget created", budget });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: "Budget for this ward and fiscal year already exists",
      });
    }
    res
      .status(500)
      .json({ message: "Failed to create budget", error: err.message });
  }
});

/**
 * @route   PUT /api/budgets/:id
 * @desc    Update an existing budget record (amounts and/or breakdown)
 * @access  metro_admin ONLY — ward_official can no longer edit budgets,
 *          view-only for that role now.
 */
router.put("/:id", protect, authorize("metro_admin"), async (req, res) => {
  try {
    const budget = await Budget.findById(req.params.id);
    if (!budget)
      return res.status(404).json({ message: "Budget record not found" });

    const { allocatedAmount, spentAmount, breakdown, fiscalYear } = req.body;

    if (allocatedAmount !== undefined) budget.allocatedAmount = allocatedAmount;
    if (spentAmount !== undefined) budget.spentAmount = spentAmount;
    if (breakdown !== undefined) budget.breakdown = breakdown;
    if (fiscalYear !== undefined) budget.fiscalYear = fiscalYear;
    budget.updatedBy = req.user.id;

    await budget.save();
    res.status(200).json({ message: "Budget updated", budget });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to update budget", error: err.message });
  }
});

/**
 * @route   DELETE /api/budgets/:id
 * @desc    Delete a budget record
 * @access  metro_admin only (unchanged)
 */
router.delete("/:id", protect, authorize("metro_admin"), async (req, res) => {
  try {
    const budget = await Budget.findByIdAndDelete(req.params.id);
    if (!budget)
      return res.status(404).json({ message: "Budget record not found" });
    res.status(200).json({ message: "Budget deleted" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to delete budget", error: err.message });
  }
});

module.exports = router;
