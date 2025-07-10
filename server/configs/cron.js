import cron from "node-cron";
import Admin from "../models/Admin.js";


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
