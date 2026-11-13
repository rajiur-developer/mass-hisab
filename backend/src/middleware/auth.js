const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Mess = require("../models/Mess");
const ManagerHistory = require("../models/ManagerHistory");
const { getLocalParts, dateFromKey } = require("../utils/messTime");

async function authenticate(req, res, next) {
  try {
    const cookieToken = req.cookies && req.cookies.mh_access;
    const header = req.headers.authorization || "";
    const bearerToken = header.startsWith("Bearer ") ? header.slice(7) : null;
    const token = cookieToken || bearerToken;
    if (!token) return res.status(401).json({ success: false, message: "Authentication required" });
    if (!process.env.JWT_ACCESS_SECRET) throw new Error("JWT_ACCESS_SECRET is not configured");

    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findOne({ _id: payload.sub, messId: payload.messId, isActive: true })
      .select("_id messId name email phone role isActive");
    if (!user) return res.status(401).json({ success: false, message: "Account is unavailable" });

    const mess = await Mess.findOne({ _id: user.messId, isActive: true }).select("_id name mealLockTime timezone");
    if (!mess) return res.status(403).json({ success: false, message: "Mess is unavailable" });

    const { dateKey } = getLocalParts();
    const today = dateFromKey(dateKey);
    const assignment = await ManagerHistory.findOne({
      messId: user.messId, startDate: { $lte: today },
      $or: [{ endDate: null }, { endDate: { $gte: today } }],
    }).sort({ startDate: -1 }).select("managerId");
    if (assignment) user.role = assignment.managerId.toString() === user._id.toString() ? "Manager" : "Member";

    req.user = user;
    req.mess = mess;
    return next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Session expired. Please sign in again." });
    }
    return next(error);
  }
}
module.exports = authenticate;
