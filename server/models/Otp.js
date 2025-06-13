import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const otpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    code: { type: String, required: true },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  { timestamps: true }
);

otpSchema.pre("save", async function (next) {
  if (!this.isModified("code")) return next();
  const salt = await bcrypt.genSalt(10);
  this.code = await bcrypt.hash(this.code, salt);
  next();
});

export default mongoose.model("Otp", otpSchema);
