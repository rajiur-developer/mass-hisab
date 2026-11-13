const express = require("express");
const Joi = require("joi");
const Bazar = require("../models/Bazar");
const BazarSettings = require("../models/BazarSettings");
const Meal = require("../models/Meal");
const MealPreference = require("../models/MealPreference");
const User = require("../models/User");
const authenticate = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const asyncHandler = require("../utils/asyncHandler");
const { dateFromKey } = require("../utils/messTime");

const router = express.Router();
router.use(authenticate);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const recordSchema = Joi.object({
  boughtBy: Joi.string().hex().length(24).required(),
  amount: Joi.number().positive().precision(2).required(),
  description: Joi.string().trim().min(2).max(500).required(),
  date: Joi.string().pattern(datePattern).required(),
  receiptUrl: Joi.string().uri().allow("", null).optional(),
});
const paisa = (amount) => Math.round(amount * 100);
const keyOf = (date) => date.toISOString().slice(0, 10);
function mondayKey(dateKey) {
  const date = new Date(dateKey + "T00:00:00.000Z");
  const day = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - day);
  return keyOf(date);
}

router.get("/summary", asyncHandler(async (req, res) => {
  const month = req.query.month;
  if (typeof month !== "string" || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ success: false, message: "month must use YYYY-MM format" });
  }
  const start = dateFromKey(month + "-01");
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  const filter = { messId: req.user.messId, date: { $gte: start, $lt: end }, status: "Approved" };
  const [records, settings, users, meals, preferences] = await Promise.all([
    Bazar.find(filter).populate("boughtBy", "name").sort({ date: 1, createdAt: 1 }).lean(),
    BazarSettings.findOne({ messId: req.user.messId }).lean(),
    User.find({ messId: req.user.messId, isActive: true, _id: { $ne: req.user._id } }).select("_id name").lean(),
    Meal.find({ messId: req.user.messId, date: { $gte: start, $lt: end } }).lean(),
    MealPreference.find({ messId: req.user.messId }).lean(),
  ]);

  const byDate = new Map();
  for (const item of records) {
    const key = keyOf(item.date);
    if (!byDate.has(key)) byDate.set(key, { date: key, totalPaisa: 0, records: [] });
    const day = byDate.get(key);
    day.totalPaisa += item.amountPaisa;
    day.records.push({
      id: item._id, description: item.description, amountPaisa: item.amountPaisa,
      boughtBy: item.boughtBy ? { id: item.boughtBy._id, name: item.boughtBy.name } : null,
      receiptUrl: item.receiptUrl,
    });
  }

  const mealByDateUser = new Map(meals.map((item) => [keyOf(item.date) + ":" + item.userId.toString(), item]));
  const preferenceByUser = new Map(preferences.map((item) => [item.userId.toString(), item]));
  const daily = [];
  const weeklyMap = new Map();
  const monthlyMemberShares = new Map(users.map((user) => [user._id.toString(), { userId: user._id, name: user.name, meals: 0, sharePaisa: 0 }]));

  for (let cursor = new Date(start); cursor < end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const dateKey = keyOf(cursor);
    const day = byDate.get(dateKey) || { date: dateKey, totalPaisa: 0, records: [] };
    let totalMeals = 0;
    const memberCounts = [];
    for (const user of users) {
      const record = mealByDateUser.get(dateKey + ":" + user._id.toString());
      const pref = preferenceByUser.get(user._id.toString());
      const count = ["breakfast", "lunch", "dinner"].reduce((sum, meal) => sum + Number(record ? record[meal] : Boolean(pref && pref[meal])), 0);
      totalMeals += count;
      memberCounts.push({ user, count });
    }
    const shares = memberCounts.map(({ user, count }) => {
      const sharePaisa = totalMeals ? Math.round(day.totalPaisa * count / totalMeals) : 0;
      const aggregate = monthlyMemberShares.get(user._id.toString());
      aggregate.meals += count;
      aggregate.sharePaisa += sharePaisa;
      return { userId: user._id, name: user.name, meals: count, sharePaisa };
    });
    daily.push({ date: dateKey, totalPaisa: day.totalPaisa, totalMeals, shares, records: day.records });
    const weekKey = mondayKey(dateKey);
    if (!weeklyMap.has(weekKey)) weeklyMap.set(weekKey, { weekStart: weekKey, totalPaisa: 0 });
    weeklyMap.get(weekKey).totalPaisa += day.totalPaisa;
  }

  const totalPaisa = records.reduce((sum, item) => sum + item.amountPaisa, 0);
  const memberShares = Array.from(monthlyMemberShares.values());
  if (req.user.role !== "Manager") {
    const own = memberShares.find((item) => item.userId.toString() === req.user._id.toString());
    res.json({ success: true, month, totalPaisa, daily: daily.map((day) => ({
      date: day.date, totalPaisa: day.totalPaisa, mySharePaisa: day.shares.find((s) => s.userId.toString() === req.user._id.toString())?.sharePaisa || 0,
      myMeals: day.shares.find((s) => s.userId.toString() === req.user._id.toString())?.meals || 0,
    })), monthlyMySharePaisa: own ? own.sharePaisa : 0 });
    return;
  }
  const weeklyBudgetPaisa = settings ? settings.weeklyBudgetPaisa : 0;
  res.json({
    success: true, month, totalPaisa, weeklyBudgetPaisa,
    weeklyBudgetMode: settings ? settings.weeklyBudgetMode : "Actual",
    weekly: Array.from(weeklyMap.values()).map((week) => ({ ...week, budgetPaisa: weeklyBudgetPaisa })),
    daily, memberShares,
  });
}));

router.post("/records", requireRole("Manager"), asyncHandler(async (req, res) => {
  const { error, value } = recordSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });
  const member = await User.findOne({ _id: value.boughtBy, messId: req.user.messId, isActive: true }).select("_id");
  if (!member) return res.status(404).json({ success: false, message: "Member not found" });
  const record = await Bazar.create({
    messId: req.user.messId, boughtBy: member._id, amountPaisa: paisa(value.amount),
    description: value.description, date: dateFromKey(value.date), receiptUrl: value.receiptUrl || null,
    createdBy: req.user._id, status: "Approved",
  });
  res.status(201).json({ success: true, record });
}));

router.patch("/records/:id", requireRole("Manager"), asyncHandler(async (req, res) => {
  const schema = Joi.object({
    boughtBy: Joi.string().hex().length(24), amount: Joi.number().positive().precision(2),
    description: Joi.string().trim().min(2).max(500), date: Joi.string().pattern(datePattern),
    receiptUrl: Joi.string().uri().allow("", null),
  }).min(1);
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });
  const update = { ...value };
  if (value.amount !== undefined) { update.amountPaisa = paisa(value.amount); delete update.amount; }
  if (value.date) update.date = dateFromKey(value.date);
  if (value.boughtBy) {
    const member = await User.findOne({ _id: value.boughtBy, messId: req.user.messId, isActive: true }).select("_id");
    if (!member) return res.status(404).json({ success: false, message: "Member not found" });
  }
  const record = await Bazar.findOneAndUpdate({ _id: req.params.id, messId: req.user.messId }, update, { new: true, runValidators: true });
  if (!record) return res.status(404).json({ success: false, message: "Bazar record not found" });
  res.json({ success: true, record });
}));

router.delete("/records/:id", requireRole("Manager"), asyncHandler(async (req, res) => {
  const record = await Bazar.findOneAndDelete({ _id: req.params.id, messId: req.user.messId });
  if (!record) return res.status(404).json({ success: false, message: "Bazar record not found" });
  res.json({ success: true });
}));

router.put("/weekly-setting", requireRole("Manager"), asyncHandler(async (req, res) => {
  const schema = Joi.object({
    amount: Joi.number().min(0).precision(2).required(),
    mode: Joi.string().valid("Actual", "Fixed").required(),
  });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });
  const settings = await BazarSettings.findOneAndUpdate(
    { messId: req.user.messId },
    { $set: { weeklyBudgetPaisa: paisa(value.amount), weeklyBudgetMode: value.mode, updatedBy: req.user._id }, $setOnInsert: { messId: req.user.messId } },
    { upsert: true, new: true, runValidators: true }
  );
  res.json({ success: true, weeklyBudgetPaisa: settings.weeklyBudgetPaisa, weeklyBudgetMode: settings.weeklyBudgetMode });
}));

module.exports = router;
