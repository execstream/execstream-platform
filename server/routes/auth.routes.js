import { Router } from "express";
import * as AuthController from "../controllers/auth.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import roleMiddleware from "../middlewares/role.middleware.js";
import passport from "passport";
import { emailIpRateLimiter } from "../utils/rateLimiters.js";
import { config } from "../configs/env.js";

const router = Router();

router.post(
  "/register",
  emailIpRateLimiter({
    max: 3,
    windowMs: 15 * 60 * 1000,
    message: "Too many registration attempts. Please try again in 15 minutes.",
  }),
  AuthController.register
);
router.post(
  "/login",
  emailIpRateLimiter({
    max: 5,
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
router.post("/reset-password/:token", AuthController.resetPassword);
router.post("/logout", authMiddleware, AuthController.logout);
router.get("/me", authMiddleware, AuthController.myProfile);
router.put("/me/update", authMiddleware, AuthController.updateAdminProfile);
router.post(
  "/change-email/request",
  authMiddleware,
  AuthController.requestEmailChange
);
router.post(
  "/change-email/verify",
  authMiddleware,
  AuthController.verifyEmailChange
);
router.put("/change-password", authMiddleware, AuthController.changePassword);
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["superAdmin"]),
  AuthController.deleteAdmin
);
router.get("/check", authMiddleware, AuthController.checkUser); //lightweight ping to check authentication
router.get(
  "/google",
  (req, res, next) => {
    const { role } = req.query;
    if (role) res.cookie("signup_role", role, { httpOnly: false });
    next();
  },
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${config.CLIENT_URL}/login?error=google_auth_failed`,
  }),
  AuthController.googleCallback
);

router.get(
  "/linkedin",
  (req, res, next) => {
    const { role } = req.query;
    if (role) res.cookie("signup_role", role, { httpOnly: false });
    next();
  },
  passport.authenticate("linkedin", {
    scope: ["openid", "profile", "email"],
  })
);

router.get(
  "/linkedin/callback",
  passport.authenticate("linkedin", {
    failureRedirect: `${config.CLIENT_URL}/login?error=linkedin_auth_failed`,
    session: false,
  }),
  AuthController.linkedinCallback
);

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
