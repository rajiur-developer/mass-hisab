const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");
const mealRoutes = require("./routes/meal.routes");
const memberRoutes = require("./routes/member.routes");
const bazarRoutes = require("./routes/bazar.routes");
const managerRoutes = require("./routes/manager.routes");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const connectDatabase = require("./config/database");

const app = express();
app.disable("x-powered-by");
app.use(helmet());

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((origin) => origin.trim())
  : ["http://localhost:3000"];
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());
app.use(async (req, res, next) => {
  try { await connectDatabase(); next(); } catch (error) { next(error); }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 100,
  standardHeaders: "draft-7", legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again later." },
});
app.use("/api", apiLimiter);
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/meals", mealRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/bazar", bazarRoutes);
app.use("/api/manager", managerRoutes);
app.use(notFound);
app.use(errorHandler);
module.exports = app;
