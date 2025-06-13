import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import Admin from "../models/Admin.js";

dotenv.config();

const args = process.argv.slice(2);
const roleArg = args.find((arg) => arg.startsWith("--role="));
const role = roleArg?.split("=")[1] || "editor";

const nameArg = args.find((arg) => arg.startsWith("--name="));
const name = nameArg?.split("=")[1] || `${role} User`;

const roleEmailMap = {
  superAdmin: process.env.SUPER_ADMIN_EMAIL,
  editor: process.env.EDITOR_EMAIL,
  newsletterAdmin: process.env.NEWSLETTER_ADMIN_EMAIL,
};

const rolePasswordMap = {
  superAdmin: process.env.SUPER_ADMIN_PASSWORD,
  editor: process.env.EDITOR_PASSWORD,
  newsletterAdmin: process.env.NEWSLETTER_ADMIN_PASSWORD,
};

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected");

    if (!["superAdmin", "editor", "newsletterAdmin"].includes(role)) {
      throw new Error(`Invalid role: ${role}`);
    }

    const email = roleEmailMap[role];
    const exists = await Admin.findOne({ email });

    if (exists) {
      console.warn(`⚠️ ${role} already exists with email: ${email}`);
      process.exit(0);
    }

    const rawPassword = rolePasswordMap[role];

    const password = await bcrypt.hash(rawPassword, 10);

    const admin = new Admin({
      name,
      email,
      password,
      role,
    });

    await admin.save();
    console.log(`✅ ${role} created: ${admin.email}`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err.message);
    process.exit(1);
  }
};

seedAdmin();
