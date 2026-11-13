const express = require("express");
const Joi = require("joi");
const User = require("../models/User");
const ManagerHistory = require("../models/ManagerHistory");
const authenticate = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const asyncHandler = require("../utils/asyncHandler");
const { dateFromKey, getLocalParts } = require("../utils/messTime");

const router = express.Router();
router.use(authenticate, requireRole("Manager"));

router.get("/", asyncHandler(async (req, res) => {
  const [members, history] = await Promise.all([
    User.find({ messId: req.user.messId, isActive: true }).select("_id name email role").sort({ name: 1 }).lean(),
    ManagerHistory.find({ messId: req.user.messId }).populate("managerId", "name email").populate("transferredBy", "name").sort({ startDate: -1 }).lean(),
  ]);
  res.json({ success: true, members, history });
}));

router.put("/schedule", asyncHandler(async (req, res) => {
  const schema = Joi.object({
    managerId: Joi.string().hex().length(24).required(),
    note: Joi.string().trim().max(300).allow("").default(""),
  });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });
  const candidate = await User.findOne({ _id: value.managerId, messId: req.user.messId, isActive: true }).select("_id role");
  if (!candidate) return res.status(404).json({ success: false, message: "Selected member not found" });

  const { dateKey } = getLocalParts();
  const currentMonth = dateKey.slice(0, 7);
  const nextMonthDate = new Date(Date.UTC(Number(currentMonth.slice(0, 4)), Number(currentMonth.slice(5, 7)), 1));
  const startDate = nextMonthDate;
  const endDate = new Date(Date.UTC(nextMonthDate.getUTCFullYear(), nextMonthDate.getUTCMonth() + 1, 0));
  const startKey = startDate.toISOString().slice(0, 10);
  const nextStart = dateFromKey(startKey);
  const nextEnd = endDate;

  await ManagerHistory.deleteMany({ messId: req.user.messId, startDate: { $gte: nextStart } });
  const currentHistory = await ManagerHistory.findOne({
    messId: req.user.messId, startDate: { $lte: dateFromKey(dateKey) },
    $or: [{ endDate: null }, { endDate: { $gte: dateFromKey(dateKey) } }],
  }).sort({ startDate: -1 });
  if (currentHistory) {
    const lastDay = new Date(nextStart.getTime() - 86400000);
    currentHistory.endDate = lastDay;
    await currentHistory.save();
  }
  const scheduled = await ManagerHistory.create({
    messId: req.user.messId, managerId: candidate._id, startDate: nextStart, endDate: nextEnd,
    transferredBy: req.user._id, note: value.note,
  });
  res.status(201).json({ success: true, scheduled });
}));

module.exports = router;
