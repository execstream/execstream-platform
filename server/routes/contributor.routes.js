import express from "express";
import * as ContributorController from "../controllers/contributor.controller.js";
import * as EmploymentController from "../controllers/employment.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import roleMiddleware from "../middlewares/role.middleware.js";

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware(["superAdmin", "editor"]));

router.get("/all", ContributorController.getAll);
router.get("/:id", ContributorController.getById);
router.post("/new", ContributorController.create);
router.patch("/update/:id", ContributorController.update);
router.delete("/delete/:id", ContributorController.remove);

router.get("/:id/employment", EmploymentController.getByContributor);
router.post("/:id/employment/new", EmploymentController.create);
router.patch("/employment/update/:employmentId", EmploymentController.update);
router.delete("/employment/delete/:employmentId", EmploymentController.remove);

export default router;
