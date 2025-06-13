import mongoose from "mongoose";

const contributorSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  bio: { type: String, trim: true },
  photo_url: { type: String, trim: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

export default mongoose.model("Contributor", contributorSchema);
