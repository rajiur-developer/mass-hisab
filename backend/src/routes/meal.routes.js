const express = require("express");
const Joi = require("joi");
const Meal = require("../models/Meal");
const MealRequest = require("../models/MealRequest");
const User = require("../models/User");
const Mess = require("../models/Mess");
const authenticate = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const asyncHandler = require("../utils/asyncHandler");
const { getLocalParts, dateFromKey, isRequestWindowOpen } = require("../utils/messTime");

const router = express.Router();
router.use(authenticate);

const meals = ["breakfast", "lunch", "dinner"];
const requestSchema = Joi.object({
  meal: Joi.string().valid(...meals).required(),
  enabled: Joi.boolean().required(),
});

router.get("/today", asyncHandler(async (req, res) => {
  const { dateKey, time } = getLocalParts();
  const date = dateFromKey(dateKey);
  const filter = { messId: req.user.messId, date };
  if (req.user.role === "Member") filter.userId = req.user._id;

  const [records, requests] = await Promise.all([
    Meal.find(filter).populate("userId", "name email role").lean(),
    MealRequest.find(filter).populate("userId", "name email").sort({ createdAt: -1 }).lean(),
  ]);
  const users = req.user.role === "Manager"
    ? await User.find({ messId: req.user.messId, role: "Member", isActive: true }).select("_id name email phone").lean()
    : [{ _id: req.user._id, name: req.user.name, email: req.user.email, phone: req.user.phone }];

  const recordByUser = new Map(records.map((record) => [record.userId._id.toString(), record]));
  const memberMeals = users.map((user) => {
    const record = recordByUser.get(user._id.toString());
    return {
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone },
      breakfast: record ? record.breakfast : false,
      lunch: record ? record.lunch : false,
      dinner: record ? record.dinner : false,
    };
  });

  const visibleRequests = requests.filter((request) =>
    req.user.role === "Manager" || request.userId._id.toString() === req.user._id.toString()
  ).map((request) => ({
    id: request._id,
    user: { id: request.userId._id, name: request.userId.name, email: request.userId.email },
    meal: request.meal,
    enabled: request.enabled,
    status: request.status,
    createdAt: request.createdAt,
  }));

  res.json({
    success: true,
    date: dateKey,
    timezone: "Asia/Dhaka",
    currentTime: time,
    deadline: req.mess.mealLockTime,
    requestOpen: isRequestWindowOpen(req.mess.mealLockTime),
    members: memberMeals,
    requests: visibleRequests,
  });
}));

router.post("/requests", requireRole("Member"), asyncHandler(async (req, res) => {
  const { error, value } = requestSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });

  const { dateKey } = getLocalParts();
  const date = dateFromKey(dateKey);
  const mess = await Mess.findById(req.user.messId).select("mealLockTime");
  if (!isRequestWindowOpen(mess.mealLockTime)) {
    return res.status(403).json({ success: false, message: "The meal request deadline has passed" });
  }

  const existing = await MealRequest.findOne({ messId: req.user.messId, userId: req.user._id, date, meal: value.meal });
  if (existing) {
    if (existing.status !== "Pending") {
      return res.status(409).json({ success: false, message: "A request for this meal has already been reviewed today" });
    }
    existing.enabled = value.enabled;
    await existing.save();
    return res.json({ success: true, request: existing });
  }

  const request = await MealRequest.create({
    messId: req.user.messId,
    userId: req.user._id,
    date,
    meal: value.meal,
    enabled: value.enabled,
  });
  res.status(201).json({ success: true, request });
}));

router.patch("/requests/:requestId", requireRole("Manager"), asyncHandler(async (req, res) => {
  const schema = Joi.object({ status: Joi.string().valid("Approved", "Rejected").required() });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });

  const request = await MealRequest.findOne({
    _id: req.params.requestId,
    messId: req.user.messId,
    status: "Pending",
  });
  if (!request) return res.status(404).json({ success: false, message: "Pending request not found" });

  if (value.status === "Approved") {
    const update = { [request.meal]: request.enabled, updatedBy: req.user._id };
    await Meal.findOneAndUpdate(
      { messId: req.user.messId, userId: request.userId, date: request.date },
      { $set: update, $setOnInsert: { messId: req.user.messId, userId: request.userId, date: request.date } },
      { upsert: true, new: true, runValidators: true }
    );
  }
  request.status = value.status;
  request.reviewedBy = req.user._id;
  request.reviewedAt = new Date();
  await request.save();
  res.json({ success: true, request });
}));

router.patch("/:userId", requireRole("Manager"), asyncHandler(async (req, res) => {
  const { error, value } = requestSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });

  const target = await User.findOne({
    _id: req.params.userId,
    messId: req.user.messId,
    role: "Member",
    isActive: true,
  }).select("_id");
  if (!target) return res.status(404).json({ success: false, message: "Member not found" });

  const { dateKey } = getLocalParts();
  const date = dateFromKey(dateKey);
  const record = await Meal.findOneAndUpdate(
    { messId: req.user.messId, userId: target._id, date },
    {
      $set: { [value.meal]: value.enabled, updatedBy: req.user._id },
      $setOnInsert: { messId: req.user.messId, userId: target._id, date },
    },
    { upsert: true, new: true, runValidators: true }
  );
  res.json({ success: true, meal: record });
}));

router.put("/deadline", requireRole("Manager"), asyncHandler(async (req, res) => {
  const schema = Joi.object({ time: Joi.string().pattern(/^(?:[01]\d|2[0-3]):[0-5]\d$/).required() });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: "Enter a valid 24-hour time" });

  const mess = await Mess.findOneAndUpdate(
    { _id: req.user.messId },
    { mealLockTime: value.time, timezone: "Asia/Dhaka" },
    { new: true, runValidators: true }
  ).select("mealLockTime timezone");
  res.json({ success: true, deadline: mess.mealLockTime, timezone: mess.timezone });
}));

module.exports = router;
