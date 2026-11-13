const mongoose = require("mongoose");

const messSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    address: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
    currentManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    mealLockTime: {
      type: String,
      default: "22:00",
      match: /^(?:[01]\d|2[0-3]):[0-5]\d$/,
    },
    timezone: {
      type: String,
      default: "Asia/Dhaka",
    },
    currency: {
      type: String,
      enum: ["BDT"],
      default: "BDT",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Mess", messSchema);
