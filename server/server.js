import express from "express";
import cookieParser from "cookie-parser";
import compression from "compression";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import helmet from "helmet";
import { connectDB, disconnectDB } from "./configs/db.js";
import contentRoutes from "./routes/content.routes.js";
import newsletterRoutes from "./routes/newsletter.routes.js";
import tagRoutes from "./routes/tags.routes.js";
import authRoutes from "./routes/auth.routes.js";
import webConfigRoutes from "./routes/webconfig.routes.js";
import seriesRoutes from "./routes/series.routes.js";
import contributorRoutes from "./routes/contributor.routes.js";
import passport from "passport";
import "./configs/passport.js";
import { globalIpRateLimiter } from "./utils/rateLimiters.js";
import { config, getConfigStatus } from "./configs/env.js";
import { startScheduler } from "./configs/cron.js";

const app = express();

app.use(helmet());
app.use(cookieParser());
app.use(compression());
app.use(
  cors({
    origin: config.CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json({ limit: "500kb" }));
app.use(express.urlencoded({ limit: "500kb", extended: true }));
app.use((req, res, next) => {
  if (req.path === config.HEALTH_CHECK_PATH) return next();
  return globalIpRateLimiter(req, res, next);
});

app.use(passport.initialize());

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/content", contentRoutes);
app.use("/api/v1/newsletter", newsletterRoutes);
app.use("/api/v1/tags", tagRoutes);
app.use("/api/v1/contributors", contributorRoutes);
app.use("/api/v1/web-configs", webConfigRoutes);
app.use("/api/v1/series", seriesRoutes);

app.get("/", (req, res) => {
  res.send("Welcome to the API");
});

app.get("/health", (req, res) => {
  const configStatus = getConfigStatus();
  res.status(200).json({
    status: "ok",
    message: "API is running",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    configStatus,
  });
});

app.use((err, req, res, next) => {
  console.error("Global error handler:", err);

  const configStatus = getConfigStatus();

  if (config.IS_PRODUCTION) {
    res.status(500).json({
      error: "Internal server error",
      timestamp: new Date().toISOString(),
      configHash: configStatus.configHash,
    });
  } else {
    res.status(500).json({
      error: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });
  }
});

app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
});

let server;

const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

  const shutdownTimeout = setTimeout(() => {
    console.error("❌ Forcing shutdown after timeout");
    process.exit(1);
  }, 15000);

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log("✅ Server closed successfully");
            resolve();
          }
        });
      });
    }

    await disconnectDB();
    console.log("✅ Database disconnected successfully");

    clearTimeout(shutdownTimeout);
    console.log("✅ Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during graceful shutdown:", error);
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err);
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("unhandledRejection");
});

async function startServer() {
  try {
    console.log("🚀 Starting server initialization...");

    console.log("📡 Connecting to database...");
    await connectDB();
    startScheduler();
    server = app.listen(config.PORT, () => {
      console.log(`🌟 Server running on port ${config.PORT}`);
      console.log(`🔗 Environment: ${config.NODE_ENV}`);
      console.log(
        `🏥 Health check: http://localhost:${config.PORT}${config.HEALTH_CHECK_PATH}`
      );

      if (config.IS_DEVELOPMENT) {
        console.log(`🎯 API Base URL: http://localhost:${config.PORT}`);
      }
    });

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`❌ Port ${config.PORT} is already in use`);
      } else {
        console.error("❌ Server error:", err);
      }
      process.exit(1);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);

    if (config.IS_PRODUCTION) {
      const configStatus = getConfigStatus();
      console.error("Configuration status:", {
        isValid: configStatus.isValid,
        errors: configStatus.errorCount,
        warnings: configStatus.warningCount,
      });
    }

    process.exit(1);
  }
}

startServer();
