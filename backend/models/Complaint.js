const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    photo: {
      type: String, // URL to uploaded image (single photo for now)
      default: null,
    },
    location: {
      ward: {
        type: Number,
        required: true,
        min: 1,
        max: 33,
      },
      lat: {
        type: Number,
        default: null,
      },
      lng: {
        type: Number,
        default: null,
      },
    },
    status: {
      type: String,
      enum: ["pending", "in-progress", "resolved", "escalated"],
      default: "pending",
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // ASSUMPTION (flag with Person 2): deadline is stored so escalation
    // logic can query "find all complaints past deadline" directly in
    // MongoDB instead of computing it in application code every time.
    // Default deadline = 7 days from creation. Adjust the pre-save hook
    // below if the real escalation rule differs (e.g. varies by category).
    deadlineAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// Auto-set deadlineAt on creation if not explicitly provided.
complaintSchema.pre("save", function (next) {
  if (this.isNew && !this.deadlineAt) {
    const DEFAULT_DEADLINE_DAYS = 7;
    this.deadlineAt = new Date(
      Date.now() + DEFAULT_DEADLINE_DAYS * 24 * 60 * 60 * 1000,
    );
  }
  next();
});

// Helpful index for escalation job: query pending/in-progress complaints
// whose deadline has passed.
complaintSchema.index({ status: 1, deadlineAt: 1 });

module.exports = mongoose.model("Complaint", complaintSchema);
