import mongoose from "mongoose";
import slugify from "slugify";

const contentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, unique: true, trim: true },
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
        "movements",
      ],
      required: true,
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
    scheduled_for: { type: Date },
    featured: { type: Boolean, default: false },
    popular: { type: Boolean, default: false },
    hero: { type: Boolean, default: false },
    series_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Series",
      default: null,
    },
    theme_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: "Theme" }],
    sub_theme_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: "SubTheme" }],
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
        name: { type: String },
        email: { type: String },
        bio: { type: String },
        profile_image_url: { type: String },
        uploaded_by_content: { type: Boolean, default: false },
        linkedin_url: { type: String },
        twitter_url: { type: String },
        website_url: { type: String },
        employment: {
          company_name: { type: String },
          job_position: { type: String },
          description: { type: String },
          company_logo_url: { type: String },
          company_logo_uploaded_by_content: { type: Boolean, default: false },
        },
      },
    ],
    created_by: { type: String },
    updated_by: { type: String },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

contentSchema.pre("save", async function (next) {
  if (this.isNew || this.isModified("title")) {
    const baseSlug = slugify(this.title, { lower: true, strict: true });
    let slug = baseSlug;
    let count = 1;

    while (await mongoose.models.Content.findOne({ slug })) {
      slug = `${baseSlug}-${count++}`;
    }

    this.slug = slug;
  }
  next();
});

contentSchema.index({ status: 1, publish_date: -1 });
contentSchema.index({ created_at: -1 });
contentSchema.index({ updated_at: -1 });
contentSchema.index({
  title: "text",
  slug: "text",
  body: "text",
  ai_summary: "text",
});
contentSchema.index({ content_type: 1, status: 1, exec_role_ids: 1 });
contentSchema.index({ status: 1, scheduled_for: 1 });
contentSchema.index({ status: 1, series_id: 1, publish_date: -1 });
contentSchema.index({ series_id: 1, status: 1, publish_date: -1 });
contentSchema.index({ theme_ids: 1, status: 1, publish_date: -1 });
contentSchema.index({ sub_theme_ids: 1, status: 1, publish_date: -1 });
contentSchema.index({ industry_ids: 1, status: 1, publish_date: -1 });
contentSchema.index({ exec_role_ids: 1, status: 1, publish_date: -1 });
contentSchema.index({ content_type: 1, status: 1, publish_date: -1 });
contentSchema.index({ featured: 1, status: 1, publish_date: -1 });
contentSchema.index({ popular: 1, status: 1, publish_date: -1 });
contentSchema.index({ hero: 1, status: 1, publish_date: -1 });

export default mongoose.model("Content", contentSchema);
