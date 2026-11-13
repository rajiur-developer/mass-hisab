const mongoose = require("mongoose");

const guestMealSchema = new mongoose.Schema(
  {
    breakfast: { type: Number, min: 0, max: 50, default: 0 },
    lunch: { type: Number, min: 0, max: 50, default: 0 },
    dinner: { type: Number, min: 0, max: 50, default: 0 },
  },
  { _id: false }
);

const mealSchema = new mongoose.Schema(
  {
    messId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mess",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    breakfast: { type: Boolean, default: false },
    lunch: { type: Boolean, default: false },
    dinner: { type: Boolean, default: false },
    guestMeals: {
      type: guestMealSchema,
      default: () => ({}),
    },
    lockedAt: {
      type: Date,
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

mealSchema.index({ messId: 1, userId: 1, date: 1 }, { unique: true });
mealSchema.index({ messId: 1, date: 1 });

module.exports = mongoose.model("Meal", mealSchema);
