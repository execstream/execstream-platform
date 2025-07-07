import mongoose from "mongoose";

const contributorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
    },
    bio: { type: String, trim: true },
    profile_image_url: { type: String, trim: true },
    linkedin_url: { type: String, trim: true },
    twitter_url: { type: String, trim: true },
    website_url: { type: String, trim: true },
    current_employment: {
      company_name: { type: String },
      job_position: { type: String },
      company_logo_url: { type: String },
      description: { type: String },
    },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

contributorSchema.index({ name: 1 });
contributorSchema.index({ created_at: -1 });

export default mongoose.model("Contributor", contributorSchema);
