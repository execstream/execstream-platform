import rateLimit from "express-rate-limit";
import crypto from "crypto";

const hashEmail = (email = "") =>
  crypto.createHash("sha256").update(email.toLowerCase().trim()).digest("hex");

export const emailIpRateLimiter = (options) =>
  rateLimit({
    windowMs: options.windowMs || 10 * 60 * 1000,
    max: options.max || 5,
    message: options.message || "Too many requests. Please try again later.",
    keyGenerator: (req, res) => {
      const email = req.body?.email || "";
      const emailHash = hashEmail(email);
      const ip = req.ip;
      return `${ip}_${emailHash}`;
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

export const globalIpRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP. Please slow down.",
});
