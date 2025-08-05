import { Router } from "express";
import {
  ThemeController,
  IndustryController,
  ExecRoleController,
  SubThemeController,
} from "../controllers/tag.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import roleMiddleware from "../middlewares/role.middleware.js";
import { cacheMiddleware } from "../middlewares/cache.middleware.js";

const router = Router();

router.get("/themes/all", cacheMiddleware() ,ThemeController.listAll);
router.get("/industries/all", cacheMiddleware(),IndustryController.listAll);
router.get("/roles/all", cacheMiddleware(),ExecRoleController.listAll);
router.get("/sub-themes/all", cacheMiddleware(),SubThemeController.listAll);

router.use(authMiddleware);
router.use(roleMiddleware(["superAdmin", "editor"]));

router.get("/themes/usage/:id", ThemeController.getUsageCount);
router.post("/themes/new", ThemeController.create);
router.put("/themes/update/:id", ThemeController.update);
router.delete("/themes/delete/:id", ThemeController.remove);

router.get("/industries/usage/:id", IndustryController.getUsageCount);
router.post("/industries/new", IndustryController.create);
router.put("/industries/update/:id", IndustryController.update);
router.delete("/industries/delete/:id", IndustryController.remove);

router.get("/roles/usage/:id", ExecRoleController.getUsageCount);
router.post("/roles/new", ExecRoleController.create);
router.put("/roles/update/:id", ExecRoleController.update);
router.delete("/roles/delete/:id", ExecRoleController.remove);

router.get("/sub-themes/usage/:id", SubThemeController.getUsageCount);
router.post("/sub-themes/new", SubThemeController.create);
router.put("/sub-themes/update/:id", SubThemeController.update);
router.delete("/sub-themes/delete/:id", SubThemeController.remove);

export default router;
