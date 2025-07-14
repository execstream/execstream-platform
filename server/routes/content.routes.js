import { Router } from "express";
import * as ContentController from "../controllers/content.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import authOptionalMiddleware from "../middlewares/authOptional.middleware.js";
import roleMiddleware from "../middlewares/role.middleware.js";

const router = Router();

router.get("/all", authOptionalMiddleware, ContentController.listAll); //this will give paginated content to keep load time low, [that is why no middleware here], but for admin, should i keep an all content route?
//GET /api/content/all?page=2&limit=5&search=marketing%20hey%20today&content_type=article&sort=created_at:asc
router.get("/flags/all", ContentController.getFlaggedContent); //featured, popular, hero section
// Public route to get content by slug (for article detail pages)
router.get("/slug/:slug", ContentController.getBySlug);

router.use(authMiddleware);
router.use(roleMiddleware(["superAdmin", "editor"]));

router.get("/get/:id", ContentController.getById);
router.post("/create", ContentController.createContent);
router.patch("/update/:id", ContentController.updateContent);
router.delete("/delete/:id", ContentController.removeContent);
router.patch("/publish/:id", ContentController.publishContent);
router.patch("/:id/toggle/:flag", ContentController.toggleFlag);

router.post(
  "/add/:contentId/contributors",
  ContentController.addContributorToContent
);
router.patch(
  "/update/:contentId/contributors/:contributorSubId",
  ContentController.patchContributorInContent
);
router.delete(
  "/delete/:contentId/contributors/:contributorSubId",
  ContentController.deleteContributorFromContent
);

export default router;
