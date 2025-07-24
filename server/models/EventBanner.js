import mongoose from "mongoose";

const eventBannerSchema = new mongoose.Schema(
  {
    event_banner_image_url: { type: String, required: true },
    caption: { type: String },
    link: { type: String },
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

eventBannerSchema.index({ is_active: 1, order: 1 });

export default mongoose.model("EventBanner", eventBannerSchema);
