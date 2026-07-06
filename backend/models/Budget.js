const mongoose = require("mongoose");

// One breakdown entry = one project/category line item within a ward's
// budget for a given fiscal year.
const breakdownItemSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      trim: true, // e.g. "Road Maintenance", "Sanitation", "Education"
    },
    project: {
      type: String,
      trim: true,
      default: null, // optional specific project name under the category
    },
    allocatedAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    spentAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: true }, // keep _id so individual breakdown items can be targeted for edits
);

const budgetSchema = new mongoose.Schema(
  {
    ward: {
      type: Number,
      required: true,
      min: 1,
      max: 33,
    },
    fiscalYear: {
      type: String, // e.g. "2081/82"
      required: true,
      trim: true,
    },
    allocatedAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    spentAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    breakdown: {
      type: [breakdownItemSchema],
      default: [],
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    // Track which admin/officer last modified this record — useful for
    // an audit trail on public budget data.
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

// One budget document per ward per fiscal year.
budgetSchema.index({ ward: 1, fiscalYear: 1 }, { unique: true });

// Keep lastUpdated in sync automatically whenever the doc is saved.
budgetSchema.pre("save", function (next) {
  this.lastUpdated = new Date();
  next();
});

module.exports = mongoose.model("Budget", budgetSchema);
