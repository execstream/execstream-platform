import bcrypt from "bcryptjs";
import Admin from "../models/Admin.js";
import crypto from "crypto";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";
// import nodemailer from "nodemailer";
import Otp from "../models/Otp.js";
import { sendEmail } from "../configs/sendgrid.js";
import { generateToken } from "../utils/generateToken.js";
import dotenv from "dotenv";
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// const transporter = nodemailer.createTransport({
//   service: "Gmail",
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

const sanitizeAdmin = (adminDoc) => {
  const obj = adminDoc.toObject();
  delete obj.password;
  return obj;
};

export const register = async (req, res) => {
  console.log("Registration attempt:", req.body);
  if (
    !req.body.name ||
    !req.body.email ||
    !req.body.password ||
    !req.body.role ||
    !req.body.otp
  ) {
    return res
      .status(400)
      .json({ message: "All fields including OTP are required." });
  }
  try {
    const { name, email, password, role, otp } = req.body;
    const emailNormalized = email.toLowerCase();
    const exists = await Admin.findOne({ email: emailNormalized });
    if (exists) {
      console.log("Registration attempt with existing email:", emailNormalized);
      return res.status(400).json({ message: "Email already registered." });
    }

    const otpRecord = await Otp.findOne({ email: emailNormalized });
    if (!otpRecord) {
      console.log("No OTP found for this email.");
      return res.status(400).json({ message: "No OTP found for this email." });
    }

    if (otpRecord.expiresAt < Date.now()) {
      console.log("OTP has expired.");
      await otpRecord.deleteOne();
      return res
        .status(400)
        .json({ message: "OTP has expired. Please request a new one." });
    }

    const isMatch = await bcrypt.compare(otp, otpRecord.code);
    if (!isMatch) {
      console.log("OTP did not match.");
      return res
        .status(400)
        .json({ message: "Invalid OTP. Please try again." });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const admin = new Admin({
      name,
      email: emailNormalized,
      password: password_hash,
      role,
    });
    await admin.save();
    await otpRecord.deleteOne();

    await generateToken(admin, res);

    console.log("New admin registered:", emailNormalized);

    res.status(201).json({
      message: "Admin registered successfully.",
      admin: sanitizeAdmin(admin),
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: "Registration failed." });
  }
};

export const login = async (req, res) => {
  console.log("Login attempt:", req.body);
  try {
    const { email, password } = req.body;
    const emailNormalized = email.toLowerCase();
    const admin = await Admin.findOne({ email: emailNormalized });
    if (!admin) return res.status(401).json({ message: "Invalid credentials" });

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) return res.status(401).json({ message: "Invalid credentials" });

    admin.last_login = new Date();
    await admin.save();

    await generateToken(admin, res);
    console.log("Admin logged in:", emailNormalized);

    res.json({
      message: "Login successful",
      admin: sanitizeAdmin(admin),
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Login failed." });
  }
};

export const myProfile = async (req, res) => {
  console.log("Fetching profile for user ID:", req.user.id);
  try {
    const admin = await Admin.findById(req.user.id).select("-password");
    res.json(admin);
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ message: "Failed to retrieve profile." });
  }
};

// export const changePassword = async (req, res) => {
//   console.log("Change password request for user ID:", req.user.id);
//   try {
//     const { old_password, new_password } = req.body;
//     const admin = await Admin.findById(req.user.id);

//     const valid = await bcrypt.compare(old_password, admin.password);
//     if (!valid)
//       return res.status(401).json({ message: "Old password is incorrect" });

//     admin.password = await bcrypt.hash(new_password, 10);
//     admin.updated_at = new Date();
//     await admin.save();

//     res.json({ message: "Password changed successfully." });
//   } catch (err) {
//     console.error("Change password error:", err);
//     res.status(500).json({ message: "Password change failed." });
//   }
// };

// export const checkUser = (req, res) => {
//   console.log("Checking user:", req.user);
//   try {
//     res.status(200).json(req.user);
//   } catch (e) {
//     console.log(e);
//     res.status(500).json({
//       message: "Internal server error",
//     });
//   }
// };

export const sendOtp = async (req, res) => {
  const { email } = req.body;
  const emailNormalized = email.toLowerCase();
  console.log("Sending OTP to:", emailNormalized);
  if (!email) return res.status(400).json({ message: "Email is required." });

  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    await Otp.deleteMany({ email: emailNormalized });
    await new Otp({ email: emailNormalized, code, expiresAt }).save();
    await sendEmail({
      to: emailNormalized,
      subject: "Your ExecStream OTP for registration",
      html: `<p>Your OTP is <strong>${code}</strong>. It expires in 10 minutes.</p>`,
    });

    console.log("Email sent with OTP to:", emailNormalized);

    res.status(200).json({ message: "OTP sent to your email." });
  } catch (err) {
    console.error("Error sending OTP:", err);
    res.status(500).json({ message: "Failed to send OTP." });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const emailNormalized = email.toLowerCase();
  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  console.log("Forgot password request for email:", emailNormalized);

  try {
    const admin = await Admin.findOne({ email: emailNormalized });
    if (!admin) {
      console.log("No account found with email:", emailNormalized);
      return res.status(404).json({ message: "No account with that email." });
    }

    if (admin.provider === "google") {
      console.log(
        "Password reset attempt for Google account(not applicable):",
        email
      );
      return res.status(400).json({
        message:
          "This account uses Google sign-in. Please use the 'Sign in with Google' button instead.",
      });
    } else if (admin.provider === "linkedin") {
      console.log(
        "Password reset attempt for linkedIn account(not applicable):",
        email
      );
      return res.status(400).json({
        message:
          "This account uses LinkedIn sign-in. Please use the 'Sign in with LinkedIn' button instead.",
      });
    }

    const token = crypto.randomBytes(20).toString("hex");
    const expiration = Date.now() + 10 * 60 * 1000; // 10 mins

    admin.resetPasswordToken = token;
    admin.resetPasswordExpires = expiration;
    await admin.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;

    const html = await ejs.renderFile(
      path.join(__dirname, "../views/emails/resetPassword.ejs"),
      { resetUrl, year: new Date().getFullYear() }
    );

    // const mailOptions = {
    //   to: admin.email,
    //   from: process.env.EMAIL_USER,
    //   subject: "Admin Password Reset",
    //   html,
    // };

    // await transporter.sendMail(mailOptions);
    await sendEmail({
      to: admin.email,
      subject: "Admin Password Reset",
      html,
    });

    console.log("Password reset email sent to:", emailNormalized);

    res.status(200).json({ message: "Password reset email sent." });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Failed to initiate password reset." });
  }
};

export const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { new_password } = req.body;
  if (!token || !new_password) {
    return res
      .status(400)
      .json({ message: "Token and new password are required." });
  }
  console.log("Reset password request for token:", { token, new_password });

  try {
    const admin = await Admin.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!admin) {
      console.log("Invalid or expired password reset token:", token);
      return res
        .status(400)
        .json({ message: "Password reset token is invalid or has expired." });
    }

    admin.password = await bcrypt.hash(new_password, 10);
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpires = undefined;
    // admin.updated_at = new Date();
    await admin.save();

    const supportUrl = "http://localhost:5173/contact-us";

    const html = await ejs.renderFile(
      path.join(__dirname, "../views/emails/passwordChanged.ejs"),
      { supportUrl, year: new Date().getFullYear() }
    );

    // const mailOptions = {
    //   to: admin.email,
    //   from: process.env.EMAIL_USER,
    //   subject: "Your password has been changed",
    //   html,
    // };

    // await transporter.sendMail(mailOptions);
    await sendEmail({
      to: admin.email,
      subject: "Your password has been changed",
      html,
    });

    console.log("Password reset successful for user ID:", admin._id);

    res.status(200).json({ message: "Password has been reset successfully." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Failed to reset password." });
  }
};

export const logout = async (req, res) => {
  console.log("Logging out user ID:", req.user.id);
  try {
    await Admin.findByIdAndUpdate(req.user.id, { last_logout: new Date() });

    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    });

    res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ message: "Failed to logout" });
  }
};

export const googleCallback = async (req, res) => {
  console.log("Google Callback function: ", req.user);

  try {
    const user = req.user;

    if (!user) {
      return res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed`);
    }

    if (!user.isNew) {
      res.clearCookie("signup_role", {
        httpOnly: false,
      });
      const token = await generateToken(user, res);
      console.log("Generated token for existing Google user:", token);
      return res.redirect(`${process.env.CLIENT_URL}/`);
    }

    const name = user.profile.displayName;
    const googleId = user.profile.id;
    const email = user.profile.emails[0].value;
    const role = req.cookies.signup_role;
    const allowedRoles = [
      "superAdmin",
      "editor",
      "newsletterAdmin",
      "eventAdmin",
    ];

    if (!role || !allowedRoles.includes(role)) {
      console.error("Invalid or missing role during Google signup:", role);
      return res.redirect(
        `${process.env.CLIENT_URL}/login?error=missing_or_invalid_role`
      );
    }
    const admin = new Admin({
      name,
      email,
      role,
      provider: "google",
      googleId,
    });
    await admin.save();

    await generateToken(admin, res);
    res.clearCookie("signup_role", {
      httpOnly: false,
    });

    console.log("New Google user registered:", email);

    return res.redirect(`${process.env.CLIENT_URL}/`);
  } catch (error) {
    console.error("Google callback error:", error);
    return res.redirect(
      `${process.env.CLIENT_URL}/login?error=callback_failed`
    );
  }
};

export const linkedinCallback = async (req, res) => {
  console.log("LinkedIn Callback function: ", req.user);

  try {
    const user = req.user;

    if (!user) {
      return res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed`);
    }

    if (!user.isNew) {
      res.clearCookie("signup_role", {
        httpOnly: false,
      });
      const token = await generateToken(user, res);
      console.log("Generated token for existing LinkedIn user:", token);
      return res.redirect(`${process.env.CLIENT_URL}/`);
    }

    const name = user.profile.displayName;
    const linkedinId = user.profile.id;
    const email = user.profile.emails[0].value;
    const role = req.cookies.signup_role;

    const allowedRoles = [
      "superAdmin",
      "editor",
      "newsletterAdmin",
      "eventAdmin",
    ];
    if (!role || !allowedRoles.includes(role)) {
      console.error("Invalid or missing role during LinkedIn signup:", role);
      return res.redirect(
        `${process.env.CLIENT_URL}/login?error=missing_or_invalid_role`
      );
    }

    const admin = new Admin({
      name,
      email,
      role,
      provider: "linkedin",
      linkedinId,
    });
    await admin.save();

    await generateToken(admin, res);
    res.clearCookie("signup_role", {
      httpOnly: false,
    });

    console.log("New LinkedIn user registered:", email);
    return res.redirect(`${process.env.CLIENT_URL}/`);
  } catch (error) {
    console.error("LinkedIn callback error:", error);
    return res.redirect(
      `${process.env.CLIENT_URL}/login?error=callback_failed`
    );
  }
};

// export const googleSignup = async (req, res) => {
//   const { name, email, role, googleId } = req.body;

//   if (!name || !email || !role || !googleId) {
//     return res
//       .status(400)
//       .json({ message: "Name, email, and role are required." });
//   }

//   const allowedRoles = [
//     "superAdmin",
//     "editor",
//     "newsletterAdmin",
//     "eventAdmin",
//   ];
//   if (!allowedRoles.includes(role)) {
//     return res.status(400).json({ message: "Invalid role selected." });
//   }

//   console.log("Initiating Google Signup for email: ", email);

//   try {
//     const existing = await Admin.findOne({ email });
//     if (existing) {
//       return res.status(400).json({ message: "Email already registered." });
//     }

//     const admin = new Admin({ name, email, role, provider: "google", googleId });
//     await admin.save();

//     await generateToken(admin, res);

//     console.log("New admin registered via Google:", email);

//     res.status(201).json({
//       message: "Google signup successful.",
//       user: {
//         id: admin._id,
//         name: admin.name,
//         email: admin.email,
//         role: admin.role,
//       },
//     });
//   } catch (err) {
//     console.error("Google signup error:", err);
//     res.status(500).json({ message: "Google signup failed." });
//   }
// };

// export const linkedinSignup = async (req, res) => {
//   const { name, email, role, linkedinId } = req.body;

//   if (!name || !email || !role || !linkedinId) {
//     return res
//       .status(400)
//       .json({ message: "Name, email, and role are required." });
//   }

//   const allowedRoles = [
//     "superAdmin",
//     "editor",
//     "newsletterAdmin",
//     "eventAdmin",
//   ];
//   if (!allowedRoles.includes(role)) {
//     return res.status(400).json({ message: "Invalid role selected." });
//   }

//   console.log("Initiating LinkedIn Signup for email: ", email);

//   try {
//     const existing = await Admin.findOne({ email });
//     if (existing) {
//       return res.status(400).json({ message: "Email already registered." });
//     }

//     const admin = new Admin({ name, email, role, provider: "linkedin", linkedinId });
//     await admin.save();

//     await generateToken(admin, res);

//     console.log("New admin registered via LinkedIn:", email);

//     res.status(201).json({
//       message: "LinkedIn signup successful.",
//       user: {
//         id: admin._id,
//         name: admin.name,
//         email: admin.email,
//         role: admin.role,
//       },
//     });
//   } catch (err) {
//     console.error("LinkedIn signup error:", err);
//     res.status(500).json({ message: "LinkedIn signup failed." });
//   }
// };
