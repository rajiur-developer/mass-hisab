const mongoose = require("mongoose");

let connectionPromise;

async function connectDatabase() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error("MONGO_URI is not configured");
  }

  mongoose.set("strictQuery", true);

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    }).then(() => {
      console.log("MongoDB connected");
      return mongoose.connection;
    }).finally(() => {
      connectionPromise = null;
    });
  }

  return connectionPromise;
}

module.exports = connectDatabase;
