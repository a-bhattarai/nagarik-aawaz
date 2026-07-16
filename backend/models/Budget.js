const mongoose = require("mongoose");

const breakdownItemSchema = new mongoose.Schema(
  {
    label: String,
    amount: Number,
  },
  { _id: false },
);

const budgetSchema = new mongoose.Schema(
  {
    ward: {
      type: Number,
      required: true,
    },
    fiscalYear: {
      type: String, // e.g. "2082/83"
      required: true,
    },
    allocatedAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    spentAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    // Task-wise division — stored, but never sent to citizen/ward-official views
    breakdown: {
      type: [breakdownItemSchema],
      default: [],
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// One budget record per ward per fiscal year
budgetSchema.index({ ward: 1, fiscalYear: 1 }, { unique: true });

budgetSchema.virtual("remainingAmount").get(function () {
  return this.allocatedAmount - this.spentAmount;
});

budgetSchema.set("toJSON", { virtuals: true });
budgetSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Budget", budgetSchema);
