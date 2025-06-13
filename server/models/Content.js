import mongoose from "mongoose";

const contentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true, trim: true },
  ai_summary: { type: String },
  body: { type: String },
  content_type: {
    type: String,
    enum: [
      "article",
      "podcast",
      "video",
      "interview",
      "webinar",
      "news",
      "insight",
      "report",
      "webcast",
    ],
  },
  media_url: { type: String },
  pdf_url: { type: String },
  media_duration_sec: { type: Number },
  banner_image_url: { type: String },
  meta_description: { type: String },
  meta_keywords: { type: String },
  publish_date: { type: Date },
  status: {
    type: String,
    enum: ["draft", "scheduled", "published"],
    default: "draft",
  },
  featured: { type: Boolean, default: false },
  popular: { type: Boolean, default: false },
  hero: { type: Boolean, default: false },

  theme_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: "Theme" }],
  industry_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: "Industry" }],
  exec_role_ids: [
    { type: mongoose.Schema.Types.ObjectId, ref: "ExecutiveRole" },
  ],
  contributors: [
    {
      contributor_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Contributor",
        required: true,
      },
      role: { type: String },
    },
  ],
  created_by: { type: String },
  updated_by: { type: String },
  created_at: { type: Date },
  updated_at: { type: Date },
});

export default mongoose.model("Content", contentSchema);
