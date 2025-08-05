import cron from "node-cron";
import Content from "../models/Content.js";
import { clearCacheByPrefix } from "../helpers/cache.helpers.js";

const publishScheduledContent = async () => {
  console.log(
    "🔁 Running cron job: Checking for scheduled content to publish..."
  );

  try {
    const now = new Date();

    const contentsToPublish = await Content.find({
      status: "scheduled",
      scheduled_for: { $lte: now },
    }).select("_id title");

    if (contentsToPublish.length === 0) {
      console.log("📌 No content to publish at this time.");
      return;
    }

    console.log(`Found ${contentsToPublish.length} content(s) to publish.`);

    const contentIds = contentsToPublish.map((content) => content._id);

    const result = await Content.updateMany(
      { _id: { $in: contentIds } },
      { $set: { status: "published", publish_date: now } }
    );

    if (result.modifiedCount > 0) {
      console.log(
        `📢 Successfully published ${result.modifiedCount} content(s).`
      );
      console.log(
        "♻️ Clearing content caches due to newly published content..."
      );
      await clearCacheByPrefix("/api/v1/content");
    }
  } catch (error) {
    console.error("Error running the publish scheduler:", error);
  }
};

// Schedule the job to run every minute
export const startScheduler = () => {
  cron.schedule("* * * * *", publishScheduledContent);
  console.log(
    "⏰ Scheduler started. Will check for content to publish every minute."
  );
};
