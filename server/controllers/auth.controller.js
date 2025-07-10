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

    const passwordError = validateStrongPassword(password);
    if (passwordError) {
      console.error("[ValidationError] Weak password", {
        attemptedEmail: email,
        error: passwordError,
        timestamp: new Date().toISOString(),
        ip: req.ip,
        route: req.originalUrl,
      });
      return res.status(400).json({ message: passwordError });
    }

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
    if (!admin) {
      console.error("[LoginError] Admin not found for given email", {
        attemptedEmail: emailNormalized,
        ip: req.ip,
        timestamp: new Date().toISOString(),
        route: req.originalUrl,
      });
      return res.status(401).json({ message: "Invalid credentials" });
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

    if (admin.isDeleted) {
      const deletionDeadline = new Date(
        admin.deletedAt.getTime() + 30 * 24 * 60 * 60 * 1000
      );
      if (Date.now() > deletionDeadline) {
        return res
          .status(403)
          .json({ message: "Account has been permanently deleted." });
      } else {
        // Reactivate
        admin.isDeleted = false;
        admin.deletedAt = null;
        console.log("Reactivating soft-deleted account:", emailNormalized);
      }
    }

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
    const admin = await Admin.findOne({
      _id: req.user.id,
      isDeleted: false,
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
    const admin = await Admin.findOne({ _id: id, isDeleted: false }).select(
      "-password"
    );
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
    const admins = await Admin.find({ isDeleted: false }).select("-password");
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

export const requestEmailChange = async (req, res) => {
  const { new_email, current_password } = req.body;

  if (!new_email || !current_password) {
    return res
      .status(400)
      .json({ message: "New email and password are required." });
  }

  const emailNormalized = new_email.toLowerCase();

  console.log("[SendEmailRequest] Email change request for: ", req.user.id);

  try {
    const admin = await Admin.findOne({ _id: req.user.id, isDeleted: false });
    if (!admin) {
      console.error("Admin not found");
      return res.status(404).json({ message: "Admin not found." });
    }

    if (admin.provider !== "local") {
      console.error(
        "[AdminEmailUpdateBlocked] Third-party auth user attempted to change email",
        {
          userId: admin._id?.toString(),
          emailAttempted: email,
          provider: admin.provider,
          ip: req.ip,
          timestamp: new Date().toISOString(),
          route: req.originalUrl,
        }
      );

      return res
        .status(400)
        .json({ message: "Only local accounts can change email." });
    }

    const exists = await Admin.findOne({ email: emailNormalized });
    if (exists) {
      console.error(
        "[AdminEmailUpdateError] Email already in use by another account",
        {
          attemptedEmail: emailNormalized,
          userId: admin._id?.toString(),
          ip: req.ip,
          timestamp: new Date().toISOString(),
          route: req.originalUrl,
        }
      );
      return res.status(400).json({ message: "This email is already in use." });
    }

    const isValidPassword = await bcrypt.compare(
      current_password,
      admin.password
    );
    if (!isValidPassword) {
      console.error(
        "[EmailChange][InvalidPassword] Password verification failed",
        {
          userId: admin._id?.toString(),
          ip: req.ip,
          timestamp: new Date().toISOString(),
          route: req.originalUrl,
        }
      );
      return res.status(401).json({ message: "Invalid password." });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    const hashedCode = await bcrypt.hash(code, 10);

    await Otp.deleteMany({ email: emailNormalized });
    await new Otp({
      email: emailNormalized,
      code: hashedCode,
      expiresAt,
    }).save();

    await sendEmail({
      to: emailNormalized,
      subject: "Email Change Verification (ExecStream)",
      html: `<p>Your OTP to change email is <strong>${code}</strong>. It expires in 10 minutes.</p>`,
    });

    console.log(
      `[EmailChange][OTP Sent] to ${emailNormalized} for adminId: ${admin._id}`
    );
    return res.status(200).json({ message: "OTP sent to new email." });
  } catch (err) {
    console.error("[EmailChange][Error requesting change]", err);
    return res.status(500).json({ message: "Failed to send OTP." });
  }
};

export const verifyEmailChange = async (req, res) => {
  const { new_email, otp } = req.body;

  if (!new_email || !otp) {
    return res
      .status(400)
      .json({ message: "Both new email and OTP are required." });
  }

  const emailNormalized = new_email.toLowerCase();

  console.log("[VerifyEmailChange] Update email for: ", req.user.id);

  try {
    const admin = await Admin.findOne({
      _id: req.user.id,
      isDeleted: false,
    }).select("-password");
    if (!admin) {
      console.error("Admin not found");
      return res.status(404).json({ message: "Admin not found." });
    }

    if (admin.provider !== "local") {
      console.error(
        "[AdminEmailUpdateBlocked] Third-party auth user attempted to change email",
        {
          userId: admin._id?.toString(),
          emailAttempted: email,
          provider: admin.provider,
          ip: req.ip,
          timestamp: new Date().toISOString(),
          route: req.originalUrl,
        }
      );

      return res
        .status(400)
        .json({ message: "Only local accounts can change email." });
    }

    const otpRecord = await Otp.findOne({ email: emailNormalized });
    if (!otpRecord) {
      console.error("[OTPVerificationError] No OTP record found for email", {
        attemptedEmail: emailNormalized,
        userId: admin._id?.toString(),
        ip: req.ip,
        timestamp: new Date().toISOString(),
        route: req.originalUrl,
      });
      return res.status(400).json({ message: "No OTP found for this email." });
    }

    if (otpRecord.expiresAt < Date.now()) {
      console.error("[OTPExpired] OTP has expired", {
        email: emailNormalized,
        expiresAt: otpRecord.expiresAt,
        currentTime: new Date().toISOString(),
        ip: req.ip,
        route: req.originalUrl,
      });
      await otpRecord.deleteOne();
      return res.status(400).json({ message: "OTP has expired." });
    }

    const isMatch = await bcrypt.compare(otp, otpRecord.code);
    if (!isMatch) {
      console.error("[OTPInvalid] Entered OTP did not match stored OTP", {
        email: emailNormalized,
        ip: req.ip,
        timestamp: new Date().toISOString(),
        route: req.originalUrl,
      });
      return res.status(400).json({ message: "Invalid OTP." });
    }

    const alreadyTaken = await Admin.findOne({ email: emailNormalized });
    if (alreadyTaken) {
      console.error(
        "[EmailAlreadyInUse] Attempted email is already registered",
        {
          email: emailNormalized,
          userId: req.user?.id || null,
          ip: req.ip,
          timestamp: new Date().toISOString(),
          route: req.originalUrl,
        }
      );
      return res.status(400).json({ message: "This email is already in use." });
    }

    admin.email = emailNormalized;
    await admin.save();
    await otpRecord.deleteOne();

    console.log(
      `[EmailChange][Success] Updated email to ${emailNormalized} for adminId: ${admin._id}`
    );

    return res.status(200).json({
      message: "Email updated successfully.",
      admin: sanitizeAdmin(admin),
    });
  } catch (err) {
    console.error("[EmailChange][Verification Error]", err);
    return res
      .status(500)
      .json({ message: "Failed to verify and update email." });
  }
};

export const deleteAdmin = async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  if (!id || !password) {
    console.error(
      "[AdminProfileDeleteError] Both id parameter and password field are required",
      {
        requestId: req.id || null,
        userId: req.user?.id || null,
        timestamp: new Date().toISOString(),
        ip: req.ip,
      }
    );

    return res.status(400).json({
      message: "id parameter must be provided.",
    });
  }

  console.log("[DeleteAdminRequest] Deleting Admin with id: ", id);

  try {
    const admin = await Admin.findById(id);

    if (!admin) {
      console.error("[DeleteAdminError] Admin not found", {
        adminId: id,
        requestedBy: req.user?.id,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });
      return res.status(404).json({ message: "Admin not found." });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      console.error("[LoginError] Credential mismatch", {
        userId: admin._id?.toString(),
        attemptedEmail: admin.email,
        ip: req.ip,
        timestamp: new Date().toISOString(),
        route: req.originalUrl,
      });
      return res.status(401).json({ message: "Invalid credentials." });
    }

    if (admin.role === "superAdmin") {
      console.error("[DeleteAdminBlocked] Attempt to delete superAdmin", {
        targetAdminId: id,
        requestedBy: req.user?.id,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });
      return res
        .status(403)
        .json({ message: "Cannot delete superAdmin account." });
    }

    if (admin.isDeleted) {
      console.error("[DeleteAdminInvalid] Admin already marked for deletion", {
        targetAdminId: id,
        requestedBy: req.user?.id,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });
      return res
        .status(400)
        .json({ message: "Admin is already marked for deletion." });
    }

    admin.isDeleted = true;
    admin.deletedAt = new Date();
    await admin.save();

    await sendEmail({
      to: admin.email,
      subject: "ExecStream Account Deletion Initiated",
      html: `
    <p>Hello ${admin.name},</p>
    <p>Your account on <strong>ExecStream</strong> has been marked for deletion.</p>
    <p>If this was a mistake or you want to reactivate your account, please <strong>log in within the next 30 days</strong>.</p>
    <p>After that, your account will be permanently deleted.</p>
    <br>
    <p>Regards,<br>ExecStream Team</p>
  `,
    });

    console.log("Admin marked for deletion.");

    res.status(200).json({
      message:
        "Admin marked for deletion. Will be permanently removed in 30 days if not reactivated.",
    });
  } catch (err) {
    console.error("[DeleteAdminError] Failed to delete admin: ", err);
    res.status(500).json({ message: "Failed to delete admin." });
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

    const admin = await Admin.findOne({ _id: req.user.id, isDeleted: false });
    if (!admin) {
      console.warn("[ChangePassword] Admin not found", {
        userId: req.user?.id,
      });
      return res.status(404).json({ message: "Admin not found." });
    }

    if (admin.provider !== "local") {
      console.warn("[ChangePassword] Not allowed for third-party auth users", {
        userId: admin._id,
        provider: admin.provider,
      });
      return res.status(400).json({
        message: "Password change is only allowed for local accounts.",
      });
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
    const hashedCode = await bcrypt.hash(code, 10);

    await Otp.deleteMany({ email: emailNormalized });
    await new Otp({
      email: emailNormalized,
      code: hashedCode,
      expiresAt,
    }).save();
    await sendEmail({
      to: emailNormalized,
      subject: "Your ExecStream OTP for registration",
      html: `<p>Your OTP for registration is <strong>${code}</strong>. It expires in 10 minutes.</p>`,
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
      return res.redirect(`${config.CLIENT_URL}/login?error=auth_failed`);
    }

    if (!user.isNew) {
      res.clearCookie("signup_role", {
        httpOnly: false,
      });
      const token = await generateToken(user, res);
      console.log("Generated token for existing Google user:", token);
      return res.redirect(`${config.CLIENT_URL}/`);
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
        `${config.CLIENT_URL}/login?error=missing_or_invalid_role`
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

    return res.redirect(`${config.CLIENT_URL}/`);
  } catch (error) {
    console.error("Google callback error:", error);
    return res.redirect(`${config.CLIENT_URL}/login?error=callback_failed`);
  }
};

export const linkedinCallback = async (req, res) => {
  console.log("LinkedIn Callback function: ", req.user);

  try {
    const user = req.user;

    if (!user) {
      return res.redirect(`${config.CLIENT_URL}/login?error=auth_failed`);
    }

    if (!user.isNew) {
      res.clearCookie("signup_role", {
        httpOnly: false,
      });
      const token = await generateToken(user, res);
      console.log("Generated token for existing LinkedIn user:", token);
      return res.redirect(`${config.CLIENT_URL}/`);
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
        `${config.CLIENT_URL}/login?error=missing_or_invalid_role`
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
    return res.redirect(`${config.CLIENT_URL}/`);
  } catch (error) {
    console.error("LinkedIn callback error:", error);
    return res.redirect(`${config.CLIENT_URL}/login?error=callback_failed`);
  }
};
