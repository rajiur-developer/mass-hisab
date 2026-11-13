const mongoose = require("mongoose");

const memberLedgerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    personalMeals: { type: Number, min: 0, default: 0 },
    mealCostPaisa: { type: Number, min: 0, default: 0 },
    utilitySharePaisa: { type: Number, min: 0, default: 0 },
    totalCostPaisa: { type: Number, min: 0, default: 0 },
    totalDepositPaisa: { type: Number, min: 0, default: 0 },
    balancePaisa: { type: Number, default: 0 },
  },
  { _id: false }
);

const monthlySummarySchema = new mongoose.Schema(
  {
    messId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mess",
      required: true,
      index: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
      min: 2020,
    },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    totalMeals: { type: Number, min: 0, default: 0 },
    totalBazarPaisa: { type: Number, min: 0, default: 0 },
    mealRatePaisa: { type: Number, min: 0, default: 0 },
    totalUtilitiesPaisa: { type: Number, min: 0, default: 0 },
    totalDepositsPaisa: { type: Number, min: 0, default: 0 },
    memberLedgers: {
      type: [memberLedgerSchema],
      default: [],
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["Draft", "Finalized"],
      default: "Draft",
    },
    finalizedAt: {
      type: Date,
      default: null,
    },
    finalizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

monthlySummarySchema.index(
  { messId: 1, year: 1, month: 1 },
  { unique: true }
);

module.exports = mongoose.model("MonthlySummary", monthlySummarySchema);
