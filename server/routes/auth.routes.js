import { Router } from "express";
import * as AuthController from "../controllers/auth.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import passport from "passport";
import dotenv from "dotenv";
dotenv.config();

const router = Router();

router.post("/register", AuthController.register); // seed via DB?
router.post("/login", AuthController.login);
router.post("/send-otp", AuthController.sendOtp);
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/reset-password/:token", AuthController.resetPassword);
router.post("/logout", authMiddleware, AuthController.logout);
router.get("/me", authMiddleware, AuthController.myProfile);
// router.get("/check", authMiddleware, AuthController.checkUser);
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
    failureRedirect: `${process.env.CLIENT_URL}/login?error=google_auth_failed`,
  }),
  AuthController.googleCallback
);

// router.post("/google-signup", AuthController.googleSignup);

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
    failureRedirect: `${process.env.CLIENT_URL}/login?error=linkedin_auth_failed`,
    session: false,
  }),
  AuthController.linkedinCallback
);

// router.post("/linkedin-signup", AuthController.linkedinSignup);

export default router;
