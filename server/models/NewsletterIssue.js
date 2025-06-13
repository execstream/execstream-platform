import mongoose from "mongoose";

const newsletterIssueSchema = new mongoose.Schema({
  title: { type: String, required: true },
  summary: { type: String },
  scheduled_for: { type: Date, required: true },
  sent: { type: Boolean, default: false },
  content_blocks: [
    {
      content_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Content",
        required: true,
      },
      category: { type: String, required: true },
      link: { type: String, required: true },
      related_content_title: { type: String },
      related_content_link: { type: String },
    },
  ],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});
newsletterIssueSchema.path("content_blocks").validate(function (blocks) {
  for (const block of blocks) {
    const hasTitle = !!block.related_content_title;
    const hasLink = !!block.related_content_link;
    if (hasTitle !== hasLink) {
      return false;
    }
  }
  return true;
}, "related_content_title and related_content_link must both be provided together or omitted together.");

export default mongoose.model("NewsletterIssue", newsletterIssueSchema);
