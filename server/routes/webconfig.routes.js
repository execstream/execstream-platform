import express from "express";
import * as WebConfigController from "../controllers/webconfig.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import roleMiddleware from "../middlewares/role.middleware.js";
import {
  handleUploadError,
  parseWebConfigData,
  processWebConfigUploads,
  uploadWebConfigFiles,
} from "../helpers/cloudinary.helpers.js";
import { cacheMiddleware } from "../middlewares/cache.middleware.js";

const router = express.Router();

// Public
router.get(
  "/event-banners/all",
  cacheMiddleware(),
  WebConfigController.getBanners
);
router.get("/experts/all", cacheMiddleware(), WebConfigController.getExperts);
router.get("/partners/all", cacheMiddleware(), WebConfigController.getPartners);

// Admin only
router.use(authMiddleware);
router.use(roleMiddleware(["superAdmin", "editor"]));

const uploadMiddleware = [
  uploadWebConfigFiles,
  handleUploadError,
  processWebConfigUploads,
  parseWebConfigData,
];

// Banners
router.post(
  "/event-banners/new",
  uploadMiddleware,
  WebConfigController.addBanner
);
router.get(
  "/event-banners/all-admin", //both active and inactive
  WebConfigController.getAllBannersForAdmin
);
router.patch(
  "/event-banners/toggle-active/:id",
  WebConfigController.toggleBannerStatus
);
router.delete("/event-banners/delete/:id", WebConfigController.deleteBanner);

// Expert
router.post("/experts/new", uploadMiddleware, WebConfigController.addExpert);
router.patch(
  "/experts/update/:id",
  uploadMiddleware,
  WebConfigController.updateExpert
);
router.get("/experts/all-admin", WebConfigController.getAllExpertsForAdmin);
router.patch(
  "/experts/toggle-active/:id",
  WebConfigController.toggleExpertStatus
);
router.delete("/experts/delete/:id", WebConfigController.deleteExpert);

// Partners
router.post("/partners/new", uploadMiddleware, WebConfigController.addPartner);
router.get("/partners/all-admin", WebConfigController.getAllPartnersForAdmin);
router.patch(
  "/partners/toggle-active/:id",
  WebConfigController.togglePartnerStatus
);
router.delete("/partners/delete/:id", WebConfigController.deletePartner);

export default router;
