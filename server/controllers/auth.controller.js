import bcrypt from "bcryptjs";
import Admin from "../models/Admin.js";
import crypto from "crypto";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";
import Otp from "../models/Otp.js";
import { sendEmail } from "../configs/sendgrid.js";
import { generateToken } from "../utils/generateToken.js";
import { validateEmail, validateStrongPassword } from "../utils/validators.js";
import { config } from "../configs/env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sanitizeAdmin = (adminDoc) => {
  const obj = adminDoc.toObject();
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  return obj;
};

export const login = async (req, res) => {
  console.log("Login attempt:", req.body);
  if (!req.body.email || !req.body.password || !req.body.otp) {
    return res
      .status(400)
      .json({ message: "All fields including OTP are required." });
  }
  try {
    const { email, password, otp } = req.body;
    const emailError = validateEmail(email);
    if (emailError) {
      console.error("[ValidationError] Invalid email format", {
        attemptedEmail: email,
        error: emailError,
        timestamp: new Date().toISOString(),
        ip: req.ip,
        route: req.originalUrl,
      });

      return res.status(400).json({ message: emailError });
    }
    const emailNormalized = email.toLowerCase();
    const admin = await Admin.findOne({ email: emailNormalized });
    if (!admin) {
      console.error("[LoginError] Admin not found for given email", {
        attemptedEmail: emailNormalized,
        ip: req.ip,
        timestamp: new Date().toISOString(),
        route: req.originalUrl,
      });
      return res.status(401).json({ message: "Invalid credentials" });
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

    const isMatch = otp.toString() === otpRecord.code;
    if (!isMatch) {
      console.log("OTP did not match.");
      return res
        .status(400)
        .json({ message: "Invalid OTP. Please try again." });
    }

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      console.error("[LoginError] Credential mismatch", {
        userId: admin._id?.toString(),
        attemptedEmail: emailNormalized,
        ip: req.ip,
        timestamp: new Date().toISOString(),
        route: req.originalUrl,
      });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    admin.last_login = new Date();
    await admin.save();
    await otpRecord.deleteOne();

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
    const admin = await Admin.findOne({
      _id: req.user.id,
    }).select("-password");

    if (!admin) {
      console.error("[FetchAdminProfileError] Admin not found", {
        adminId: id,
        requestedBy: req.user?.id,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });
      return res.status(404).json({ message: "Admin not found" });
    }

    console.log("Admin profile fetched successfully: ", admin);
    res.json({ message: "Admin profile fetched successfully", admin });
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ message: "Failed to retrieve profile." });
  }
};

export const updateRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!id || !role) {
    console.error("id and role are required");
    return res
      .status(400)
      .json({ message: "id parameter and role field is required" });
  }

  console.log(`Updating role of admin with id: ${id} to role: ${role}`);

  const allowedRoles = [
    "editor",
    "newsletterAdmin",
    "eventAdmin",
    "superAdmin",
  ];

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  try {
    const admin = await Admin.findOne({ _id: id }).select("-password");
    if (!admin) {
      console.error("[UpdateRoleError] Admin not found", {
        adminId: id,
        requestedBy: req.user?.id,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });
      return res.status(404).json({ message: "Admin not found" });
    }

    if (admin.role === "superAdmin") {
      return res.status(403).json({ message: "Cannot change superAdmin role" });
    }

    admin.role = role;
    await admin.save();

    console.log(`Role of ${id} updated successfully`);

    res
      .status(200)
      .json({ message: "Role updated", admin: sanitizeAdmin(admin) });
  } catch (err) {
    console.error("Role update error:", err);
    res.status(500).json({ message: "Failed to update role" });
  }
};

export const getAllAdmins = async (req, res) => {
  console.log("Fetching all admins");
  try {
    const admins = await Admin.find({}).select("-password");
    console.log("Admins fetched successfully");
    res
      .status(200)
      .json({ message: "All admins fetched successfully", admins });
  } catch (err) {
    console.error("Error fetching admins:", err);
    res.status(500).json({ message: "Failed to fetch admins" });
  }
};

export const updateAdminProfile = async (req, res) => {
  const { name } = req.body;

  if (!name) {
    console.error("[AdminProfileUpdateError] Missing required field: 'name'", {
      requestId: req.id || null,
      userId: req.user?.id || null,
      timestamp: new Date().toISOString(),
      ip: req.ip,
    });

    return res.status(400).json({
      message: "Name field must be provided.",
    });
  }

  console.log("Updating Admin Profile:", name);

  try {
    const admin = await Admin.findOne({
      _id: req.user.id,
      isDeleted: false,
    }).select("-password");
    if (!admin) {
      console.error("[UpdateAdminProfileError] Admin not found", {
        adminId: id,
        requestedBy: req.user?.id,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });
      return res.status(404).json({ message: "Admin not found" });
    }

    admin.name = name || admin.name;
    await admin.save();

    console.log(`Admin profile updated successfully`);

    res.status(200).json({
      message: "Profile updated successfully",
      admin: sanitizeAdmin(admin),
    });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

export const changePassword = async (req, res) => {
  console.log("[ChangePassword] Request received for user ID:", req.user?.id);

  try {
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      console.warn("[ChangePassword] Missing old or new password", {
        userId: req.user?.id,
      });
      return res
        .status(400)
        .json({ message: "Both old and new password are required." });
    }

    if (old_password === new_password) {
      return res
        .status(400)
        .json({ message: "New password must be different from the old one." });
    }

    const passwordError = validateStrongPassword(new_password);
    if (passwordError) {
      console.error("[ValidationError] Weak password", {
        attemptedId: req.user?.id,
        error: passwordError,
        timestamp: new Date().toISOString(),
        ip: req.ip,
        route: req.originalUrl,
      });
      return res.status(400).json({ message: passwordError });
    }

    const admin = await Admin.findOne({ _id: req.user.id });
    if (!admin) {
      console.warn("[ChangePassword] Admin not found", {
        userId: req.user?.id,
      });
      return res.status(404).json({ message: "Admin not found." });
    }

    const valid = await bcrypt.compare(old_password, admin.password);
    if (!valid) {
      console.warn("[ChangePassword] Incorrect old password", {
        userId: admin._id,
      });
      return res.status(401).json({ message: "Old password is incorrect." });
    }

    admin.password = await bcrypt.hash(new_password, 10);
    admin.updated_at = new Date();
    await admin.save();

    await sendEmail({
      to: admin.email,
      subject: "Your ExecStream Password Changed",
      html: `<p>Hello ${admin.name},</p>
         <p>Your password has been successfully changed.</p>
         <p>If you did not initiate this change, please contact support immediately.</p>
         <br><p>Regards,<br>ExecStream Team</p>`,
    });

    console.log(
      "[ChangePassword] Password updated successfully for:",
      admin.email
    );
    return res.status(200).json({ message: "Password changed successfully." });
  } catch (err) {
    console.error("[ChangePasswordError]", err);
    return res.status(500).json({ message: "Failed to change password." });
  }
};

export const checkUser = (req, res) => {
  console.log("Checking user:", req.user);
  try {
    res.status(200).json(req.user);
  } catch (e) {
    console.log(e);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const sendOtp = async (req, res) => {
  const { email } = req.body;
  const emailNormalized = email.toLowerCase();
  console.log("Sending OTP to:", emailNormalized);
  if (!email) return res.status(400).json({ message: "Email is required." });

  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await Otp.deleteMany({ email: emailNormalized });
    await new Otp({
      email: emailNormalized,
      code,
      expiresAt,
    }).save();
    await sendEmail({
      to: emailNormalized,
      subject: "Your ExecStream OTP for login",
      html: `<p>Your OTP for login is <strong>${code}</strong>. It expires in 10 minutes.</p>`,
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

    const token = crypto.randomBytes(20).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const expiration = Date.now() + 10 * 60 * 1000; // 10 mins

    admin.resetPasswordToken = hashedToken;
    admin.resetPasswordExpires = expiration;
    await admin.save();

    const resetUrl = `${config.CLIENT_URL}/reset-password/${token}`;

    const html = await ejs.renderFile(
      path.join(__dirname, "../views/emails/resetPassword.ejs"),
      { resetUrl, year: new Date().getFullYear() }
    );

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
  const passwordError = validateStrongPassword(new_password);
  if (passwordError) {
    console.error("[ValidationError] Weak password", {
      error: passwordError,
      timestamp: new Date().toISOString(),
      ip: req.ip,
      route: req.originalUrl,
    });
    return res.status(400).json({ message: passwordError });
  }

  console.log("Reset password request for token:", { token, new_password });

  try {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const admin = await Admin.findOne({
      resetPasswordToken: hashedToken,
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
    await admin.save();

    const supportUrl = `${config.CLIENT_URL}/contact-us`;

    const html = await ejs.renderFile(
      path.join(__dirname, "../views/emails/passwordChanged.ejs"),
      { supportUrl, year: new Date().getFullYear() }
    );

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
      secure: config.IS_PRODUCTION,
      sameSite: config.IS_PRODUCTION ? "none" : "strict",
    });

    console.log("logged out");

    res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ message: "Failed to logout" });
  }
};
