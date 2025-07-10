import mongoose from "mongoose";
import { config } from "./env.js";

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.MONGODB_URI);
    console.log(`✅ MongoDB Connected! Host: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  try {
    console.log("🔄 Starting database disconnect process...");
    console.log("📊 Current connection state:", mongoose.connection.readyState);

    if (mongoose.connection.readyState === 0) {
      // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
      console.log("ℹ️ Database already disconnected");
      return;
    }

    console.log("🔌 Disconnecting mongoose...");
    await mongoose.disconnect();
    console.log("🛑 MongoDB connection closed successfully.");
  } catch (error) {
    console.error("❌ Error during DB disconnect:", error);
    throw error;
  }
};
