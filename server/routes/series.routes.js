import { Router } from "express";
import * as SeriesController from "../controllers/series.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import roleMiddleware from "../middlewares/role.middleware.js";
import {
  uploadSeriesFiles,
  handleUploadError,
  processSeriesUploads,
} from "../helpers/cloudinary.helpers.js";
import { cacheMiddleware } from "../middlewares/cache.middleware.js";

const router = Router();

router.get("/all", cacheMiddleware() ,SeriesController.listAll);
router.get("/slug/:slug", cacheMiddleware() ,SeriesController.getBySlug); // Get a single series by its slug for the series page

// --- Protected Admin/Editor Routes ---
router.use(authMiddleware);
router.use(roleMiddleware(["superAdmin", "editor"]));

// Get a single series by ID for editing in the admin panel
router.get("/get/:id", SeriesController.getById);

router.get("/usage/:id", SeriesController.getUsageCount);

router.post(
  "/create",
  uploadSeriesFiles,
  handleUploadError,
  processSeriesUploads,
  SeriesController.create
);

router.patch(
  "/update/:id",
  uploadSeriesFiles,
  handleUploadError,
  processSeriesUploads,
  SeriesController.update
);

router.delete("/delete/:id", SeriesController.remove);

export default router;
