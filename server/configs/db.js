import mongoose from "mongoose";
import { config } from "./env.js";

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ MongoDB disconnected");
});

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
      connectTimeoutMS: 10000,
      heartbeatFrequencyMS: 30000,
      retryWrites: true,
      maxIdleTimeMS: 180000,
    });

    console.log(`✅ MongoDB Connected !! Host: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  try {
    console.log("🔄 Starting database disconnect process...");
    const states = ["disconnected", "connected", "connecting", "disconnecting"];
    console.log(
      `📊 Current connection state: ${states[mongoose.connection.readyState]}`
    );

    if (mongoose.connection.readyState === 0) {
      // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
      console.log("ℹ️ Database already disconnected");
      return;
    }

    console.log("🔌 Disconnecting mongoose...");
    await mongoose.disconnect();
    console.log("✅ MongoDB connection closed successfully.");
  } catch (error) {
    console.error("❌ Error during DB disconnect:", error);
    throw error;
  }
};
