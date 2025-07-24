import cron from "node-cron";
import Admin from "../models/Admin.js";
import Content from "../models/Content.js";

cron.schedule("0 0 * * *", async () => {
  const now = new Date();
  const threshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

  try {
    const result = await Admin.deleteMany({
      isDeleted: true,
      deletedAt: { $lte: threshold },
    });
    console.log(
      `[CronJob] Deleted ${result.deletedCount} admin(s) permanently.`
    );
  } catch (err) {
    console.error("[CronJobError] Failed to delete admins:", err);
  }
});

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

    console.log(
      `📢 Successfully published ${result.modifiedCount} content(s).`
    );
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
