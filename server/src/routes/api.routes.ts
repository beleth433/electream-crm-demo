import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { DashboardController } from "../controllers/dashboard.controller.js";
import { BikeController } from "../controllers/bike.controller.js";
import { ClientController } from "../controllers/client.controller.js";
import { RentalController } from "../controllers/rental.controller.js";
import { RepairController } from "../controllers/repair.controller.js";
import { PartController } from "../controllers/part.controller.js";
import { FinanceController } from "../controllers/finance.controller.js";
import { ReviewController } from "../controllers/review.controller.js";
import { UploadController, uploadMiddleware } from "../controllers/upload.controller.js";
import { SystemController } from "../controllers/system.controller.js";
import { EmployeeController } from "../controllers/employee.controller.js";
import { BatteryController } from "../controllers/battery.controller.js";
import { ArticleController } from "../controllers/article.controller.js";
import { HistoryController } from "../controllers/history.controller.js";
import { AccessLevelController } from "../controllers/accessLevel.controller.js";
import { UserController } from "../controllers/user.controller.js";
import { ChatController } from "../controllers/chat.controller.js";
import { PresenceController } from "../controllers/presence.controller.js";
import { OutfitController } from "../controllers/outfit.controller.js";
import { LoyaltyController } from "../controllers/loyalty.controller.js";
import { ShopController } from "../controllers/shop.controller.js";

const router = Router();
const accessLevelCtrl = new AccessLevelController();
const userCtrl = new UserController();

// 1. Auth
router.post("/auth/login", AuthController.login);
router.get("/auth/me", AuthController.getMe);

// 2. Dashboard
router.get("/dashboard/stats", DashboardController.getStats);

// 3. Batteries (АКБ)
router.get("/batteries/stats", BatteryController.getStats);
router.get("/batteries/models", BatteryController.getModels);
router.post("/batteries/models", BatteryController.createModel);
router.patch("/batteries/models/:id", BatteryController.updateModel);
router.delete("/batteries/models/:id", BatteryController.deleteModel);
router.get("/batteries", BatteryController.getAll);
router.get("/batteries/:id", BatteryController.getById);
router.post("/batteries", BatteryController.create);
router.patch("/batteries/:id", BatteryController.update);
router.delete("/batteries/:id", BatteryController.delete);
router.post("/batteries/attach", BatteryController.attach);
router.post("/batteries/detach", BatteryController.detach);
router.post("/batteries/swap", BatteryController.swap);

// 4. Bikes
router.get("/bikes/models", BikeController.getModels);
router.post("/bikes/models", BikeController.createModel);
router.patch("/bikes/models/:id", BikeController.updateModel);
router.put("/bikes/models/:id", BikeController.updateModel);
router.delete("/bikes/models/:id", BikeController.deleteModel);
router.get("/bikes", BikeController.getAll);
router.get("/bikes/:id", BikeController.getById);
router.post("/bikes", BikeController.create);
router.patch("/bikes/:id", BikeController.update);
router.delete("/bikes/:id", BikeController.delete);

// 4. Clients
router.get("/clients/search/phone", ClientController.searchByPhone);
router.get("/clients", ClientController.getAll);
router.get("/clients/:id", ClientController.getById);
router.post("/clients", ClientController.create);
router.patch("/clients/:id", ClientController.update);
router.patch("/clients/:id/status", ClientController.updateStatus);
router.delete("/clients/:id", ClientController.delete);

// 5. Rentals
router.get("/rentals/tariffs", RentalController.getTariffs);
router.post("/rentals/tariffs", RentalController.createTariff);
router.patch("/rentals/tariffs/:id", RentalController.updateTariff);
router.delete("/rentals/tariffs/:id", RentalController.deleteTariff);
router.get("/rentals", RentalController.getAll);
router.get("/rentals/:id", RentalController.getById);
router.post("/rentals", RentalController.create);
router.post("/rentals/:id/renew", RentalController.renew);
router.post("/rentals/:id/close", RentalController.close);
router.delete("/rentals/:id", RentalController.delete);

// 6. Outfits (Экипировка)
router.get("/outfits/categories", OutfitController.getCategories);
router.post("/outfits/categories", OutfitController.createCategory);
router.delete("/outfits/categories/:id", OutfitController.deleteCategory);
router.get("/outfits/templates", OutfitController.getTemplates);
router.post("/outfits/templates", OutfitController.createTemplate);
router.delete("/outfits/templates/:id", OutfitController.deleteTemplate);
router.get("/outfits/available", OutfitController.getAvailable);
router.get("/outfits", OutfitController.getAll);
router.get("/outfits/:id", OutfitController.getById);
router.post("/outfits", OutfitController.create);
router.patch("/outfits/:id/status", OutfitController.updateStatus);
router.delete("/outfits/:id", OutfitController.delete);


// 7. Repairs
router.get("/repairs", RepairController.getAll);
router.get("/repairs/:id", RepairController.getById);
router.post("/repairs", RepairController.create);
router.patch("/repairs/:id/status", RepairController.updateStatus);
router.post("/repairs/:id/complete", RepairController.complete);

// 8. Parts
router.get("/parts/categories", PartController.getCategories);
router.post("/parts/categories", PartController.createCategory);
router.patch("/parts/categories/:id", PartController.updateCategory);
router.delete("/parts/categories/:id", PartController.deleteCategory);

router.get("/parts/orders/categories", PartController.getOrderCategories);
router.post("/parts/orders/categories", PartController.createOrderCategory);
router.patch("/parts/orders/categories/:id", PartController.updateOrderCategory);
router.delete("/parts/orders/categories/:id", PartController.deleteOrderCategory);

router.get("/parts/orders", PartController.getOrders);
router.post("/parts/orders", PartController.createOrder);
router.patch("/parts/orders/:id/status", PartController.updateOrderStatus);
router.patch("/parts/orders/:id", PartController.updateOrder);
router.delete("/parts/orders/:id", PartController.deleteOrder);
router.get("/parts", PartController.getAll);
router.get("/parts/:id", PartController.getById);
router.post("/parts", PartController.create);
router.patch("/parts/:id", PartController.update);
router.patch("/parts/:id/restock", PartController.restock);
router.delete("/parts/:id", PartController.delete);

// 9. Payments & Finance
router.get("/payments/settings", FinanceController.getSettings);
router.patch("/payments/settings", FinanceController.updateSettings);
router.get("/payments/summary", FinanceController.getSummary);
router.get("/payments", FinanceController.getAll);
router.post("/payments", FinanceController.create);
router.patch("/payments/:id", FinanceController.update);
router.delete("/payments/:id", FinanceController.delete);

// 10. Reviews
router.get("/reviews", ReviewController.getAll);
router.post("/reviews", ReviewController.create);

// 12. Uploads
router.post("/upload", uploadMiddleware.single("file"), UploadController.handleUpload);

// 13. System Simulation & Templates (Time Machine & Template Controls)
router.get("/system/state", SystemController.getState);
router.post("/system/time", SystemController.setTime);
router.post("/system/reset", SystemController.resetTemplates);
router.post("/system/clear", SystemController.clearTemplates);
router.get("/system/backup", SystemController.downloadBackup);
router.get("/system/storage", SystemController.getStorageStatus);

// 14. Employees & Payroll
router.get("/employees", EmployeeController.getEmployees);
router.get("/employees/:id", EmployeeController.getEmployeeById);
router.post("/employees", EmployeeController.createEmployee);
router.patch("/employees/:id", EmployeeController.updateEmployee);
router.delete("/employees/:id", EmployeeController.deleteEmployee);
router.post("/employees/:id/payout", EmployeeController.payoutSalary);

// 15. Articles / Knowledge Base ("Информация")
router.get("/articles", ArticleController.getAll);
router.get("/articles/categories", ArticleController.getCategories);
router.post("/articles/reset-defaults", ArticleController.resetDefaults);
router.delete("/articles/clear-all", ArticleController.clearAll);
router.get("/articles/:id", ArticleController.getById);
router.post("/articles", ArticleController.create);
router.patch("/articles/:id", ArticleController.update);
router.delete("/articles/:id", ArticleController.delete);

// 16. Audit Log & Activity History ("История")
router.get("/history", HistoryController.getAll);
router.post("/history", HistoryController.log);
router.delete("/history", HistoryController.clear);

// 17. Access Levels & Roles (RBAC)
router.get("/access-levels", (req, res) => accessLevelCtrl.getAll(req, res));
router.get("/access-levels/:id", (req, res) => accessLevelCtrl.getById(req, res));
router.post("/access-levels", (req, res) => accessLevelCtrl.create(req, res));
router.patch("/access-levels/:id", (req, res) => accessLevelCtrl.update(req, res));
router.delete("/access-levels/:id", (req, res) => accessLevelCtrl.delete(req, res));

// 18. Team Users (Authentication, credentials & accounts)
router.get("/users", (req, res) => userCtrl.getAll(req, res));
router.post("/users", (req, res) => userCtrl.create(req, res));
router.patch("/users/:id", (req, res) => userCtrl.update(req, res));
router.delete("/users/:id", (req, res) => userCtrl.delete(req, res));

// 19. Team Chat ("Командный чат базы")
router.get("/chat/messages", ChatController.getMessages);
router.post("/chat/messages", ChatController.createMessage);
router.delete("/chat/messages/:id", ChatController.deleteMessage);

// 20. Team Presence & Live Online Status
router.get("/presence", PresenceController.getOnline);
router.post("/presence/heartbeat", PresenceController.heartbeat);
router.post("/presence/logout", PresenceController.logout);

// 21. Loyalty System (Система лояльности)
router.get("/loyalty/tiers", LoyaltyController.getTiers);
router.get("/loyalty/tiers/:id", LoyaltyController.getTierById);
router.post("/loyalty/tiers", LoyaltyController.createTier);
router.patch("/loyalty/tiers/:id", LoyaltyController.updateTier);
router.delete("/loyalty/tiers/:id", LoyaltyController.deleteTier);
router.patch("/loyalty/clients/:id/tier", LoyaltyController.setClientTier);
router.post("/loyalty/clients/:id/tier", LoyaltyController.setClientTier);

// 22. Shop & POS Retail Sales (Магазин / Розничный POS терминал)
router.get("/shop/catalog", ShopController.getCatalog);
router.get("/shop/orders", ShopController.getOrders);
router.get("/shop/orders/:id", ShopController.getOrderById);
router.post("/shop/orders", ShopController.createOrder);

export default router;
