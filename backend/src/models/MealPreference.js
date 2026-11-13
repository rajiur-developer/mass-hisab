const mongoose = require("mongoose");

const mealPreferenceSchema = new mongoose.Schema({
  messId: { type: mongoose.Schema.Types.ObjectId, ref: "Mess", required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  breakfast: { type: Boolean, default: false },
  lunch: { type: Boolean, default: false },
  dinner: { type: Boolean, default: false },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

mealPreferenceSchema.index({ messId: 1, userId: 1 }, { unique: true });
module.exports = mongoose.model("MealPreference", mealPreferenceSchema);
