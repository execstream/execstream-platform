import cron from "node-cron";
import { sendWeeklyNewsletter } from "../controllers/newsletter.controller.js";

// Every Sunday at 10 AM
cron.schedule("0 10 * * 0", async () => {
  console.log("Running weekly newsletter job...");
  await sendWeeklyNewsletter();
});
