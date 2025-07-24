import { Router } from "express";
import * as ContentController from "../controllers/content.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import authOptionalMiddleware from "../middlewares/authOptional.middleware.js";
import roleMiddleware from "../middlewares/role.middleware.js";
import {
  handleUploadError,
  parseData,
  processContentUploads,
  uploadContentFiles,
} from "../helpers/cloudinary.helpers.js";

const router = Router();

router.get("/all", authOptionalMiddleware, ContentController.listAll);
router.get("/flags/all", ContentController.getFlaggedContent); //featured, popular, hero section
router.get("/slug/:slug", ContentController.getBySlug);

router.use(authMiddleware);
router.use(roleMiddleware(["superAdmin", "editor"]));

router.get("/get/:id", ContentController.getById);
router.delete("/delete/:id", ContentController.removeContent);
router.patch("/publish/:id", ContentController.publishContent);
router.patch("/:id/toggle/:flag", ContentController.toggleFlag);

router.post(
  "/create",
  uploadContentFiles,
  handleUploadError,
  processContentUploads,
  parseData,
  ContentController.createContent
);

router.patch(
  "/update/:id",
  uploadContentFiles, 
  handleUploadError, 
  processContentUploads,
  parseData,
  ContentController.updateContent
);

router.post(
  "/add/:contentId/contributors",
  ContentController.addContributorToContent
);
router.patch(
  "/update/:contentId/contributors/:contributorSubId",
  uploadContentFiles,
  handleUploadError,
  processContentUploads,
  ContentController.patchContributorInContent
);
router.delete(
  "/delete/:contentId/contributors/:contributorSubId",
  ContentController.deleteContributorFromContent
);

export default router;
