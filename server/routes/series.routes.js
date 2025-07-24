import { Router } from "express";
import * as SeriesController from "../controllers/series.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import roleMiddleware from "../middlewares/role.middleware.js";
import {
  uploadSeriesFiles,
  handleUploadError,
  processSeriesUploads,
} from "../helpers/cloudinary.helpers.js";

const router = Router();

// --- Public Routes ---
router.get("/all", SeriesController.listAll);
// Get a single series by its slug for the series page
// heading and everything then content of series listed below it.(via /all of content controller)
router.get("/slug/:slug", SeriesController.getBySlug);

// --- Protected Admin/Editor Routes ---
router.use(authMiddleware);
router.use(roleMiddleware(["superAdmin", "editor"]));

// Get a single series by ID for editing in the admin panel
router.get("/get/:id", SeriesController.getById);

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
