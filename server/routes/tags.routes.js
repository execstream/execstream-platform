import { Router } from "express";
import {
  ThemeController,
  IndustryController,
  ExecRoleController,
  SubThemeController,
} from "../controllers/tag.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import roleMiddleware from "../middlewares/role.middleware.js";

const router = Router();

router.use(authMiddleware);
router.use(roleMiddleware(["superAdmin", "editor"]));

router.get("/themes/all", ThemeController.listAll);
router.post("/themes/new", ThemeController.create);
router.put("/themes/update/:id", ThemeController.update);
router.delete("/themes/delete/:id", ThemeController.remove);

router.get("/industries/all", IndustryController.listAll);
router.post("/industries/new", IndustryController.create);
router.put("/industries/update/:id", IndustryController.update);
router.delete("/industries/delete/:id", IndustryController.remove);

router.get("/roles/all", ExecRoleController.listAll);
router.post("/roles/new", ExecRoleController.create);
router.put("/roles/update/:id", ExecRoleController.update);
router.delete("/roles/delete/:id", ExecRoleController.remove);

router.get("/sub-themes/all", SubThemeController.listAll);
router.post("/sub-themes/new", SubThemeController.create);
router.put("/sub-themes/update/:id", SubThemeController.update);
router.delete("/sub-themes/delete/:id", SubThemeController.remove);

export default router;
