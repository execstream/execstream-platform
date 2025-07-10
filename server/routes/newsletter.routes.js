import { Router } from "express";
import * as NewsletterController from "../controllers/newsletter.controller.js";
import { emailIpRateLimiter } from "../utils/rateLimiters.js";

const router = Router();

const newsletterRateLimit = emailIpRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: "Too many subscription attempts. Please try again in 15 minutes.",
});

router.post(
  "/subscribe",
  newsletterRateLimit,
  NewsletterController.addSubscriber
);

export default router;
