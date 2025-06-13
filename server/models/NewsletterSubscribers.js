import mongoose from "mongoose";

const newsletterSubscriberSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  subscribed_at: { type: Date, default: Date.now },
  unsubscribed: { type: Boolean, default: false },
  unsubscribed_at: { type: Date, default: null },
  // unsubscribed_reason: { type: String, default: null },
});

export default mongoose.model(
  "NewsletterSubscriber",
  newsletterSubscriberSchema
);
