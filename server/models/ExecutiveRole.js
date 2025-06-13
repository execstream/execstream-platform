import mongoose from "mongoose";

const execRoleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: String,
  },
  { timestamps: true }
);

export default mongoose.model("ExecutiveRole", execRoleSchema);
