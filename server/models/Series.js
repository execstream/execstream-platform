import mongoose from "mongoose";
import slugify from "slugify";

const seriesSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Series title is required."],
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    company_name: {
      type: String,
      trim: true,
    },
    company_website_url: {
      type: String,
      trim: true,
      match: [
        /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i,
        "Please enter a valid website URL.",
      ],
    },
    company_logo_url: {
      type: String,
    },
    frequency: {
      type: String,
      enum: ["weekly", "monthly", "other"],
      default: "weekly",
    },
    created_by: { type: String, required: true },
    updated_by: { type: String },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

// Middleware to automatically create a slug from the title before saving
seriesSchema.pre("save", async function (next) {
  if (this.isNew || this.isModified("title")) {
    let baseSlug = slugify(this.title, { lower: true, strict: true });
    let slug = baseSlug;
    let count = 1;

    // Ensure uniqueness
    while (await mongoose.models.Series.findOne({ slug })) {
      slug = `${baseSlug}-${count++}`;
    }

    this.slug = slug;
  }
  next();
});

// Indexes for faster queries
seriesSchema.index({ title: "text", description: "text" });
seriesSchema.index({ created_at: -1 });
seriesSchema.index({ updated_at: -1 });

export default mongoose.model("Series", seriesSchema);
