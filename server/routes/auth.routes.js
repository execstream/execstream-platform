import { Router } from "express";
import * as AuthController from "../controllers/auth.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import roleMiddleware from "../middlewares/role.middleware.js";
import { emailIpRateLimiter } from "../utils/rateLimiters.js";

const router = Router();

router.post(
  "/login",
  emailIpRateLimiter({
    max: 3,
    windowMs: 10 * 60 * 1000,
    message: "Too many login attempts. Please try again in 10 minutes.",
  }),
  AuthController.login
);
router.post(
  "/send-otp",
  emailIpRateLimiter({
    max: 3,
    windowMs: 10 * 60 * 1000,
    message: "Too many OTP requests. Try again later.",
  }),
  AuthController.sendOtp
);
router.post(
  "/forgot-password",
  emailIpRateLimiter({
    max: 3,
    windowMs: 15 * 60 * 1000,
    message: "Too many reset requests. Try again later.",
  }),
  AuthController.forgotPassword
);
router.post(
  "/reset-password/:token",
  emailIpRateLimiter({
    max: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: "Too many password resets. Try again in an hour.",
  }),
  AuthController.resetPassword
);
router.post("/logout", authMiddleware, AuthController.logout);
router.get("/me", authMiddleware, AuthController.myProfile);
router.put("/me/update", authMiddleware, AuthController.updateAdminProfile);
router.put("/change-password", authMiddleware, AuthController.changePassword);
router.get("/check", authMiddleware, AuthController.checkUser); //lightweight ping to check authentication
router.put(
  "/admins/update-role/:id",
  authMiddleware,
  roleMiddleware(["superAdmin"]),
  AuthController.updateRole
);

router.get(
  "/admins/all",
  authMiddleware,
  roleMiddleware(["superAdmin"]),
  AuthController.getAllAdmins
);

export default router;
