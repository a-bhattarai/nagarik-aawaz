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
      type: String,
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
      landmark: {
        type: String,
        trim: true,
        default: null, // optional human-readable location hint, e.g. "near Bindhyabasini Temple"
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
    deadlineAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);
// Auto-set deadlineAt on creation if not explicitly provided.
complaintSchema.pre("save", function () {
  if (this.isNew && !this.deadlineAt) {
    const DEFAULT_DEADLINE_DAYS = 7;
    this.deadlineAt = new Date(
      Date.now() + DEFAULT_DEADLINE_DAYS * 24 * 60 * 60 * 1000,
    );
  }
});
complaintSchema.index({ status: 1, deadlineAt: 1 });
module.exports = mongoose.model("Complaint", complaintSchema);