import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String },
    role: {
      type: String,
      enum: ["superAdmin", "editor", "newsletterAdmin", "eventAdmin"],
      default: "editor",
    },
    last_login: { type: Date },
    last_logout: { type: Date },
    provider: {
      type: String,
      enum: ["local", "google", "linkedin"],
      default: "local",
    },
    googleId: { type: String, unique: true, sparse: true },
    linkedinId: { type: String, unique: true, sparse: true },
    resetPasswordToken: { type: String },
    resetPasswordExpires: {
      type: Date,
      index: { expires: "10m" },
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

export default mongoose.model("Admin", adminSchema);
