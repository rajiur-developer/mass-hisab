const mongoose = require("mongoose");

const mealRequestSchema = new mongoose.Schema(
  {
    messId: { type: mongoose.Schema.Types.ObjectId, ref: "Mess", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: Date, required: true },
    meal: { type: String, enum: ["breakfast", "lunch", "dinner"], required: true },
    enabled: { type: Boolean, required: true },
    status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

mealRequestSchema.index({ messId: 1, userId: 1, date: 1, meal: 1 }, { unique: true });
mealRequestSchema.index({ messId: 1, date: 1, status: 1 });

module.exports = mongoose.model("MealRequest", mealRequestSchema);
