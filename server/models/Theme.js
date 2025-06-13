import mongoose from "mongoose";

const themeSchema = new mongoose.Schema(
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

export default mongoose.model("Theme", themeSchema);
