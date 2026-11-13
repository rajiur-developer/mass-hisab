const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const Mess = require("../models/Mess");
const User = require("../models/User");
const ManagerHistory = require("../models/ManagerHistory");
const authenticate = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();
const cookieName = "mh_access";
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 15 * 60 * 1000,
};

function issueSession(res, user) {
  if (!process.env.JWT_ACCESS_SECRET) throw new Error("JWT_ACCESS_SECRET is not configured");
  const token = jwt.sign(
    { sub: user._id.toString(), messId: user.messId.toString(), role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m" }
  );
  res.cookie(cookieName, token, cookieOptions);
}

function publicUser(user) {
  return {
    id: user._id,
    messId: user.messId,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };
}

router.post("/register", asyncHandler(async (req, res) => {
  const schema = Joi.object({
    messName: Joi.string().trim().min(2).max(100).required(),
    name: Joi.string().trim().min(2).max(80).required(),
    email: Joi.string().trim().email().max(254).required(),
    phone: Joi.string().trim().max(20).allow("").default(""),
    password: Joi.string().min(8).max(72).required(),
  });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });

  const mess = await Mess.create({ name: value.messName, timezone: "Asia/Dhaka" });
  let createdUser = null;
  try {
    const user = await User.create({
      messId: mess._id,
      name: value.name,
      email: value.email.toLowerCase(),
      phone: value.phone,
      passwordHash: await bcrypt.hash(value.password, 12),
      role: "Manager",
    });
    createdUser = user;
    mess.currentManager = user._id;
    await mess.save();
    const { dateFromKey, getLocalParts } = require("../utils/messTime");
    await ManagerHistory.create({ messId: mess._id, managerId: user._id, startDate: dateFromKey(getLocalParts().dateKey) });
    issueSession(res, user);
    return res.status(201).json({ success: true, user: publicUser(user), mess: { id: mess._id, name: mess.name } });
  } catch (error) {
    if (createdUser) await User.findByIdAndDelete(createdUser._id);
    await Mess.findByIdAndDelete(mess._id);
    throw error;
  }
}));

router.post("/login", asyncHandler(async (req, res) => {
  const schema = Joi.object({
    email: Joi.string().trim().email().max(254).required(),
    password: Joi.string().min(1).max(72).required(),
    messId: Joi.string().hex().length(24).optional(),
  });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: "Enter a valid email and password" });

  const filter = { email: value.email.toLowerCase(), isActive: true };
  if (value.messId) filter.messId = value.messId;
  const candidates = await User.find(filter).select("+passwordHash");
  const matches = [];
  for (const candidate of candidates) {
    if (await bcrypt.compare(value.password, candidate.passwordHash)) matches.push(candidate);
  }
  if (matches.length !== 1) {
    if (matches.length > 1) return res.status(409).json({ success: false, message: "This email belongs to more than one mess. Sign in using your mess ID." });
    return res.status(401).json({ success: false, message: "Email or password is incorrect" });
  }

  const user = matches[0];
  issueSession(res, user);
  return res.json({ success: true, user: publicUser(user), mess: { id: user.messId } });
}));

router.get("/me", authenticate, (req, res) => {
  res.json({ success: true, user: publicUser(req.user), mess: { id: req.mess._id, name: req.mess.name } });
});

router.post("/logout", (req, res) => {
  res.clearCookie(cookieName, { ...cookieOptions, maxAge: undefined });
  res.json({ success: true });
});

module.exports = router;
