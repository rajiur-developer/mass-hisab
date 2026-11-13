const mongoose = require("mongoose");

const memberShareSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amountPaisa: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isSafeInteger,
    },
  },
  { _id: false }
);

const expenseSchema = new mongoose.Schema(
  {
    messId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mess",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    category: {
      type: String,
      enum: ["Electricity", "Gas", "Internet", "Housekeeper", "Rent", "Other"],
      required: true,
    },
    amountPaisa: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isSafeInteger,
    },
    date: {
      type: Date,
      required: true,
    },
    splitType: {
      type: String,
      enum: ["Equal", "Custom"],
      default: "Equal",
    },
    memberShares: {
      type: [memberShareSchema],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Approved",
    },
  },
  { timestamps: true }
);

expenseSchema.index({ messId: 1, date: 1, status: 1 });

module.exports = mongoose.model("Expense", expenseSchema);
