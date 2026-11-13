const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

router.get("/", (req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;

  res.status(databaseReady ? 200 : 503).json({
    success: databaseReady,
    service: "mass-hisab-api",
    message: databaseReady ? "API and database are healthy" : "Database unavailable",
    database: databaseReady ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
