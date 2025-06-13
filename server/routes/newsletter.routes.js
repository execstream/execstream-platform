import { Router } from "express";
import * as NewsletterController from "../controllers/newsletter.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import roleMiddleware from "../middlewares/role.middleware.js";

const router = Router();

router.post("/subscribers/new", NewsletterController.addSubscriber);
router.put("/subscribers/:id/unsubscribe", NewsletterController.unsubscribe);

router.use(authMiddleware);
router.use(roleMiddleware(["superAdmin", "newsletterAdmin"]));

router.get("/subscribers/all", NewsletterController.listAllSubscribers);
router.delete("/subscribers/remove/:id", NewsletterController.removeSubscriber);
router.get("/subscribers/export", NewsletterController.exportCSV);
router.post("/issue/create", NewsletterController.createIssue);
router.get("/issue/all", NewsletterController.getAllIssues);

router.post("/test-newsletter", async (req, res) => {
  try {
    await NewsletterController.sendWeeklyNewsletter();
    res.status(200).json({ message: "Test newsletter sent" });
  } catch (err) {
    console.error("Test send failed:", err);
    res.status(500).json({ message: "Failed to send test newsletter" });
  }
});
export default router;
