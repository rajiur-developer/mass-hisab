const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const Joi = require("joi");
const User = require("../models/User");
const Meal = require("../models/Meal");
const authenticate = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();
router.use(authenticate, requireRole("Manager"));

router.get("/", asyncHandler(async (req, res) => {
  const members = await User.find({ messId: req.user.messId, isActive: true })
    .select("_id name email phone joinedAt")
    .sort({ name: 1 });
  res.json({ success: true, members });
}));

router.post("/", asyncHandler(async (req, res) => {
  const schema = Joi.object({
    name: Joi.string().trim().min(2).max(80).required(),
    email: Joi.string().trim().email().max(254).required(),
    phone: Joi.string().trim().max(20).allow("").default(""),
    password: Joi.string().min(8).max(72).optional(),
  });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });

  const temporaryPassword = value.password || crypto.randomBytes(9).toString("base64url");
  const member = await User.create({
    messId: req.user.messId,
    name: value.name,
    email: value.email.toLowerCase(),
    phone: value.phone,
    passwordHash: await bcrypt.hash(temporaryPassword, 12),
    role: "Member",
  });
  res.status(201).json({
    success: true,
    member: { id: member._id, name: member.name, email: member.email, phone: member.phone },
    temporaryPassword: value.password ? undefined : temporaryPassword,
  });
}));

router.patch("/:memberId", asyncHandler(async (req, res) => {
  const schema = Joi.object({
    name: Joi.string().trim().min(2).max(80),
    phone: Joi.string().trim().max(20).allow(""),
    email: Joi.string().trim().email().max(254),
    isActive: Joi.boolean(),
  }).min(1);
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });

  const member = await User.findOneAndUpdate(
    { _id: req.params.memberId, messId: req.user.messId },
    value,
    { new: true, runValidators: true }
  ).select("_id name email phone isActive");
  if (!member) return res.status(404).json({ success: false, message: "Member not found" });
  res.json({ success: true, member });
}));

router.delete("/:memberId", asyncHandler(async (req, res) => {
  const member = await User.findOneAndUpdate(
    { _id: req.params.memberId, messId: req.user.messId, isActive: true },
    { isActive: false },
    { new: true }
  ).select("_id name email");
  if (!member) return res.status(404).json({ success: false, message: "Member not found" });
  await Meal.updateMany({ messId: req.user.messId, userId: member._id }, { $set: { lockedAt: new Date() } });
  res.json({ success: true, message: "Member deactivated" });
}));

module.exports = router;
