const express = require("express");
const router = express.Router();
const Budget = require("../models/Budget");
const { protect, authorize } = require("../middleware/auth");

// Get budgets
router.get("/", protect, async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === "ward_official") {
      filter.ward = req.user.ward;
    } else if (req.query.ward) {
      filter.ward = req.query.ward;
    }

    const budgets = await Budget.find(filter);

    res.status(200).json({
      count: budgets.length,
      budgets,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single budget
router.get("/:id", protect, async (req, res) => {
  try {
    const budget = await Budget.findById(req.params.id);

    if (!budget) {
      return res.status(404).json({ message: "Budget not found" });
    }

    if (req.user.role === "ward_official" && budget.ward !== req.user.ward) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json({ budget });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create budget
router.post("/", protect, authorize("metro_admin"), async (req, res) => {
  try {
    const budget = await Budget.create(req.body);
    res.status(201).json({ budget });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update budget
router.put("/:id", protect, authorize("metro_admin"), async (req, res) => {
  try {
    const budget = await Budget.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    res.json({ budget });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete budget
router.delete("/:id", protect, authorize("metro_admin"), async (req, res) => {
  try {
    await Budget.findByIdAndDelete(req.params.id);
    res.json({ message: "Budget deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
