const express = require("express");
const Joi = require("joi");
const Meal = require("../models/Meal");
const MealRequest = require("../models/MealRequest");
const MealPreference = require("../models/MealPreference");
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
const preferencesSchema = Joi.object({
  breakfast: Joi.boolean(),
  lunch: Joi.boolean(),
  dinner: Joi.boolean(),
}).min(1);

function validDateKey(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(value + "T00:00:00.000Z"))
    && new Date(value + "T00:00:00.000Z").toISOString().slice(0, 10) === value;
}

async function saveDateMeal({ messId, userId, date, meal, enabled, updatedBy }) {
  const filter = { messId, userId, date };
  const existing = await Meal.findOne(filter).select("_id");
  const preference = existing ? null : await MealPreference.findOne({ messId, userId }).lean();
  const defaults = preference
    ? { breakfast: preference.breakfast, lunch: preference.lunch, dinner: preference.dinner }
    : { breakfast: false, lunch: false, dinner: false };
  return Meal.findOneAndUpdate(
    filter,
    {
      $set: { [meal]: enabled, updatedBy },
      $setOnInsert: { messId, userId, date, ...defaults },
    },
    { upsert: true, new: true, runValidators: true }
  );
}

async function getMealData(req, dateKey) {
  const date = dateFromKey(dateKey);
  const filter = { messId: req.user.messId, date };
  if (req.user.role !== "Manager") filter.userId = req.user._id;

  const [records, preferences, requests] = await Promise.all([
    Meal.find(filter).populate("userId", "name email role").lean(),
    MealPreference.find({ messId: req.user.messId, ...(req.user.role === "Manager" ? {} : { userId: req.user._id }) }).lean(),
    MealRequest.find({ ...filter }).populate("userId", "name email").sort({ createdAt: -1 }).lean(),
  ]);
  const users = req.user.role === "Manager"
    ? await User.find({ messId: req.user.messId, isActive: true, _id: { $ne: req.user._id } }).select("_id name email phone").lean()
    : [{ _id: req.user._id, name: req.user.name, email: req.user.email, phone: req.user.phone }];

  const recordByUser = new Map(records.map((record) => [record.userId._id.toString(), record]));
  const preferenceByUser = new Map(preferences.map((item) => [item.userId.toString(), item]));
  const memberMeals = users.map((user) => {
    const record = recordByUser.get(user._id.toString());
    const preference = preferenceByUser.get(user._id.toString());
    return {
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone },
      breakfast: record ? record.breakfast : Boolean(preference && preference.breakfast),
      lunch: record ? record.lunch : Boolean(preference && preference.lunch),
      dinner: record ? record.dinner : Boolean(preference && preference.dinner),
      hasDateOverride: Boolean(record),
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

  return { date: dateKey, timezone: "Asia/Dhaka", members: memberMeals, requests: visibleRequests };
}

// Monthly day-by-day meal ledger for moderators and members.
router.get("/summary/:month", asyncHandler(async (req, res) => {
  if (!/^\\d{4}-\\d{2}$/.test(req.params.month)) {
    return res.status(400).json({ success: false, message: "Use YYYY-MM month format" });
  }
  const [year, monthNumber] = req.params.month.split("-").map(Number);
  if (monthNumber < 1 || monthNumber > 12) {
    return res.status(400).json({ success: false, message: "Enter a valid month" });
  }
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const start = dateFromKey(`${req.params.month}-01`);
  const end = dateFromKey(`${req.params.month}-${String(daysInMonth).padStart(2, "0")}`);
  const userFilter = req.user.role === "Manager"
    ? { messId: req.user.messId, isActive: true, _id: { $ne: req.user._id } }
    : { _id: req.user._id, messId: req.user.messId, isActive: true };
  const [users, preferences, records] = await Promise.all([
    User.find(userFilter).select("_id name email").sort({ name: 1 }).lean(),
    MealPreference.find({ messId: req.user.messId, userId: { $in: req.user.role === "Manager" ? (await User.find(userFilter).distinct("_id")) : [req.user._id] } }).lean(),
    Meal.find({ messId: req.user.messId, date: { $gte: start, $lte: end }, ...(req.user.role === "Manager" ? {} : { userId: req.user._id }) }).lean(),
  ]);
  const preferenceByUser = new Map(preferences.map((item) => [item.userId.toString(), item]));
  const recordByKey = new Map(records.map((item) => [`${item.date.toISOString().slice(0, 10)}:${item.userId.toString()}`, item]));
  const days = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = `${req.params.month}-${String(day).padStart(2, "0")}`;
    const date = dateFromKey(dateKey);
    const members = users.map((user) => {
      const key = user._id.toString();
      const record = recordByKey.get(`${dateKey}:${key}`);
      const preference = preferenceByUser.get(key);
      const breakfast = record ? record.breakfast : Boolean(preference && preference.breakfast);
      const lunch = record ? record.lunch : Boolean(preference && preference.lunch);
      const dinner = record ? record.dinner : Boolean(preference && preference.dinner);
      return { user: { id: user._id, name: user.name, email: user.email }, breakfast, lunch, dinner, total: Number(breakfast) + Number(lunch) + Number(dinner) };
    });
    days.push({
      date: dateKey,
      members,
      totals: {
        breakfast: members.filter((item) => item.breakfast).length,
        lunch: members.filter((item) => item.lunch).length,
        dinner: members.filter((item) => item.dinner).length,
        meals: members.reduce((sum, item) => sum + item.total, 0),
      },
    });
  }
  res.json({ success: true, month: req.params.month, days });
}));

router.get("/today", asyncHandler(async (req, res) => {
  const { dateKey, time } = getLocalParts();
  const data = await getMealData(req, dateKey);
  res.json({
    success: true, ...data, currentTime: time,
    deadline: req.mess.mealLockTime,
    requestOpen: isRequestWindowOpen(req.mess.mealLockTime),
  });
}));

router.get("/date/:date", asyncHandler(async (req, res) => {
  if (!validDateKey(req.params.date)) return res.status(400).json({ success: false, message: "Use a valid date in YYYY-MM-DD format" });
  const data = await getMealData(req, req.params.date);
  res.json({ success: true, ...data });
}));

// A member's preference is recurring: it remains in effect every day until changed.
router.get("/preferences", asyncHandler(async (req, res) => {
  const preference = await MealPreference.findOne({ messId: req.user.messId, userId: req.user._id }).lean();
  res.json({ success: true, preferences: {
    breakfast: Boolean(preference && preference.breakfast),
    lunch: Boolean(preference && preference.lunch),
    dinner: Boolean(preference && preference.dinner),
  } });
}));

router.put("/preferences", asyncHandler(async (req, res) => {
  const { error, value } = preferencesSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });
  const preference = await MealPreference.findOneAndUpdate(
    { messId: req.user.messId, userId: req.user._id },
    { $set: { ...value, updatedBy: req.user._id }, $setOnInsert: { messId: req.user.messId, userId: req.user._id } },
    { upsert: true, new: true, runValidators: true }
  );
  res.json({ success: true, preferences: {
    breakfast: preference.breakfast, lunch: preference.lunch, dinner: preference.dinner,
  } });
}));

router.patch("/preferences/:userId", requireRole("Manager"), asyncHandler(async (req, res) => {
  const { error, value } = preferencesSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });
  const target = await User.findOne({ _id: req.params.userId, messId: req.user.messId, isActive: true }).select("_id");
  if (!target) return res.status(404).json({ success: false, message: "Member not found" });
  const preference = await MealPreference.findOneAndUpdate(
    { messId: req.user.messId, userId: target._id },
    { $set: { ...value, updatedBy: req.user._id }, $setOnInsert: { messId: req.user.messId, userId: target._id } },
    { upsert: true, new: true, runValidators: true }
  );
  res.json({ success: true, preferences: {
    breakfast: preference.breakfast, lunch: preference.lunch, dinner: preference.dinner,
  } });
}));

router.post("/requests", asyncHandler(async (req, res) => {
  const { error, value } = requestSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });
  const { dateKey } = getLocalParts();
  const date = dateFromKey(dateKey);
  const mess = await Mess.findById(req.user.messId).select("mealLockTime");
  if (!isRequestWindowOpen(mess.mealLockTime)) return res.status(403).json({ success: false, message: "The meal request deadline has passed" });

  const existing = await MealRequest.findOne({ messId: req.user.messId, userId: req.user._id, date, meal: value.meal });
  if (existing) {
    if (existing.status !== "Pending") return res.status(409).json({ success: false, message: "A request for this meal has already been reviewed today" });
    existing.enabled = value.enabled;
    await existing.save();
    return res.json({ success: true, request: existing });
  }
  const request = await MealRequest.create({ messId: req.user.messId, userId: req.user._id, date, meal: value.meal, enabled: value.enabled });
  res.status(201).json({ success: true, request });
}));

router.patch("/requests/:requestId", requireRole("Manager"), asyncHandler(async (req, res) => {
  const schema = Joi.object({ status: Joi.string().valid("Approved", "Rejected").required() });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });
  const request = await MealRequest.findOne({ _id: req.params.requestId, messId: req.user.messId, status: "Pending" });
  if (!request) return res.status(404).json({ success: false, message: "Pending request not found" });
  if (value.status === "Approved") {
    await saveDateMeal({
      messId: req.user.messId, userId: request.userId, date: request.date,
      meal: request.meal, enabled: request.enabled, updatedBy: req.user._id,
    });
  }
  request.status = value.status;
  request.reviewedBy = req.user._id;
  request.reviewedAt = new Date();
  await request.save();
  res.json({ success: true, request });
}));

// Managers can correct a member's meals for any selected date.
router.patch("/:userId/date/:date", requireRole("Manager"), asyncHandler(async (req, res) => {
  if (!validDateKey(req.params.date)) return res.status(400).json({ success: false, message: "Use a valid date in YYYY-MM-DD format" });
  const { error, value } = requestSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });
  const target = await User.findOne({ _id: req.params.userId, messId: req.user.messId, isActive: true }).select("_id");
  if (!target) return res.status(404).json({ success: false, message: "Member not found" });
  const date = dateFromKey(req.params.date);
  const record = await saveDateMeal({
    messId: req.user.messId, userId: target._id, date,
    meal: value.meal, enabled: value.enabled, updatedBy: req.user._id,
  });
  res.json({ success: true, meal: record });
}));

// Backwards-compatible endpoint: update today's meal for a member.
router.patch("/:userId", requireRole("Manager"), asyncHandler(async (req, res) => {
  const { error, value } = requestSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });
  const target = await User.findOne({ _id: req.params.userId, messId: req.user.messId, isActive: true }).select("_id");
  if (!target) return res.status(404).json({ success: false, message: "Member not found" });
  const { dateKey } = getLocalParts();
  const date = dateFromKey(dateKey);
  const record = await Meal.findOneAndUpdate(
    { messId: req.user.messId, userId: target._id, date },
    { $set: { [value.meal]: value.enabled, updatedBy: req.user._id }, $setOnInsert: { messId: req.user.messId, userId: target._id, date } },
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
