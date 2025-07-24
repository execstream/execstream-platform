import mongoose from "mongoose";

const homeExpertSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    expert_profile_image_url: { type: String, required: true },
    job_position: { type: String },
    company_name: { type: String },
    order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

homeExpertSchema.index({ is_active: 1, order: 1 });

export default mongoose.model("HomeExpert", homeExpertSchema);
