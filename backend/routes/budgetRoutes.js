const express = require('express');
const router = express.Router();
const Budget = require('../models/Budget');
const { protect, authorize } = require('../middleware/auth');

// Small helper: a ward_official may only touch their own ward's budget.
// metro_admin can touch any ward. Assumes req.user = { id, role, ward, ... }
// as set by middleware/auth.js's `protect`.
function canModifyWard(user, wardNumber) {
  if (user.role === 'metro_admin') return true;
  if (user.role === 'ward_official') return Number(user.ward) === Number(wardNumber);
  return false;
}

/**
 * @route   GET /api/budgets
 * @desc    Public - list all budgets. Optional filters: ?ward=5&fiscalYear=2081/82
 * @access  Public (citizens can view)
 */
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.ward) filter.ward = Number(req.query.ward);
    if (req.query.fiscalYear) filter.fiscalYear = req.query.fiscalYear;

    const budgets = await Budget.find(filter).sort({ ward: 1, fiscalYear: -1 });
    res.status(200).json({ count: budgets.length, budgets });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch budgets', error: err.message });
  }
});

/**
 * @route   GET /api/budgets/:id
 * @desc    Public - get a single budget record by its Mongo _id
 * @access  Public (citizens can view)
 */
router.get('/:id', async (req, res) => {
  try {
    const budget = await Budget.findById(req.params.id);
    if (!budget) return res.status(404).json({ message: 'Budget record not found' });
    res.status(200).json({ budget });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch budget', error: err.message });
  }
});

/**
 * @route   POST /api/budgets
 * @desc    Create a new ward budget record for a fiscal year
 * @access  ward_official (own ward only), metro_admin (any ward)
 */
router.post('/', protect, authorize('ward_official', 'metro_admin'), async (req, res) => {
  try {
    const { ward, fiscalYear, allocatedAmount, spentAmount, breakdown } = req.body;

    if (ward === undefined || !fiscalYear || allocatedAmount === undefined) {
      return res.status(400).json({
        message: 'ward, fiscalYear, and allocatedAmount are required'
      });
    }

    if (!canModifyWard(req.user, ward)) {
      return res.status(403).json({
        message: 'ward_official can only create budgets for their own ward'
      });
    }

    const existing = await Budget.findOne({ ward, fiscalYear });
    if (existing) {
      return res.status(409).json({
        message: `Budget for ward ${ward}, fiscal year ${fiscalYear} already exists. Use PUT to update it.`
      });
    }

    const budget = await Budget.create({
      ward,
      fiscalYear,
      allocatedAmount,
      spentAmount: spentAmount || 0,
      breakdown: breakdown || [],
      updatedBy: req.user.id
    });

    res.status(201).json({ message: 'Budget created', budget });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Budget for this ward and fiscal year already exists' });
    }
    res.status(500).json({ message: 'Failed to create budget', error: err.message });
  }
});

/**
 * @route   PUT /api/budgets/:id
 * @desc    Update an existing budget record (amounts and/or breakdown)
 * @access  ward_official (own ward only), metro_admin (any ward)
 */
router.put('/:id', protect, authorize('ward_official', 'metro_admin'), async (req, res) => {
  try {
    const budget = await Budget.findById(req.params.id);
    if (!budget) return res.status(404).json({ message: 'Budget record not found' });

    if (!canModifyWard(req.user, budget.ward)) {
      return res.status(403).json({
        message: 'ward_official can only update budgets for their own ward'
      });
    }

    const { allocatedAmount, spentAmount, breakdown, fiscalYear } = req.body;

    if (allocatedAmount !== undefined) budget.allocatedAmount = allocatedAmount;
    if (spentAmount !== undefined) budget.spentAmount = spentAmount;
    if (breakdown !== undefined) budget.breakdown = breakdown;
    if (fiscalYear !== undefined) budget.fiscalYear = fiscalYear;
    budget.updatedBy = req.user.id;

    await budget.save();
    res.status(200).json({ message: 'Budget updated', budget });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update budget', error: err.message });
  }
});

/**
 * @route   DELETE /api/budgets/:id
 * @desc    Delete a budget record (kept admin-only — deleting ward
 *          financial history is more sensitive than editing it)
 * @access  metro_admin only
 */
router.delete('/:id', protect, authorize('metro_admin'), async (req, res) => {
  try {
    const budget = await Budget.findByIdAndDelete(req.params.id);
    if (!budget) return res.status(404).json({ message: 'Budget record not found' });
    res.status(200).json({ message: 'Budget deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete budget', error: err.message });
  }
});

module.exports = router;
