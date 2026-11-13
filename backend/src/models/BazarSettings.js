const mongoose = require("mongoose");

const bazarSettingsSchema = new mongoose.Schema({
  messId: { type: mongoose.Schema.Types.ObjectId, ref: "Mess", required: true, unique: true },
  weeklyBudgetPaisa: { type: Number, default: 0, min: 0, validate: Number.isSafeInteger },
  weeklyBudgetMode: { type: String, enum: ["Actual", "Fixed"], default: "Actual" },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

module.exports = mongoose.model("BazarSettings", bazarSettingsSchema);
