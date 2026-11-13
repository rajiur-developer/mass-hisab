const mongoose = require("mongoose");

const depositSchema = new mongoose.Schema(
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
    amountPaisa: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isSafeInteger,
    },
    paymentMethod: {
      type: String,
      enum: ["Cash", "bKash", "Nagad", "Bank"],
      required: true,
    },
    trxId: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },
    paymentDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
  },
  { timestamps: true }
);

depositSchema.index({ messId: 1, userId: 1, paymentDate: 1, status: 1 });

module.exports = mongoose.model("Deposit", depositSchema);
