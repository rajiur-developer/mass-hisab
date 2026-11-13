require("dotenv").config();

const app = require("./app");
const connectDatabase = require("./config/database");

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  try {
    await connectDatabase();

    const server = app.listen(PORT, () => {
      console.log(`Mass Hisab API listening on port ${PORT}`);
    });

    const shutdown = (signal) => {
      console.log(`${signal} received; shutting down gracefully`);
      server.close(async () => {
        const mongoose = require("mongoose");
        await mongoose.connection.close();
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    console.error("Unable to start server:", error.message);
    process.exit(1);
  }
}

startServer();
