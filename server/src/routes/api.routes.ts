import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { DashboardController } from "../controllers/dashboard.controller.js";
import { BikeController } from "../controllers/bike.controller.js";
import { ClientController } from "../controllers/client.controller.js";
import { RentalController } from "../controllers/rental.controller.js";
import { OutfitController } from "../controllers/outfit.controller.js";
import { RepairController } from "../controllers/repair.controller.js";
import { PartController } from "../controllers/part.controller.js";
import { FinanceController } from "../controllers/finance.controller.js";
import { ReviewController } from "../controllers/review.controller.js";
import { ArticleController } from "../controllers/article.controller.js";
import { UploadController, uploadMiddleware } from "../controllers/upload.controller.js";
import { SystemController } from "../controllers/system.controller.js";
import { EmployeeController } from "../controllers/employee.controller.js";
import { ShopController } from "../controllers/shop.controller.js";
import { BatteryController } from "../controllers/battery.controller.js";

const router = Router();

// 1. Auth
router.post("/auth/login", AuthController.login);
router.get("/auth/me", AuthController.getMe);

// 2. Dashboard
router.get("/dashboard/stats", DashboardController.getStats);

// 3. Batteries (АКБ)
router.get("/batteries/stats", BatteryController.getStats);
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
router.get("/rentals", RentalController.getAll);
router.get("/rentals/:id", RentalController.getById);
router.post("/rentals", RentalController.create);
router.post("/rentals/:id/renew", RentalController.renew);
router.post("/rentals/:id/close", RentalController.close);

// 6. Outfits
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
router.get("/parts", PartController.getAll);
router.get("/parts/:id", PartController.getById);
router.post("/parts", PartController.create);
router.patch("/parts/:id", PartController.update);
router.patch("/parts/:id/restock", PartController.restock);
router.delete("/parts/:id", PartController.delete);

// 9. Payments & Finance
router.get("/payments/summary", FinanceController.getSummary);
router.get("/payments", FinanceController.getAll);
router.post("/payments", FinanceController.create);

// 10. Reviews
router.get("/reviews", ReviewController.getAll);
router.post("/reviews", ReviewController.create);

// 11. Articles (Knowledge Base / FAQ)
router.get("/articles", ArticleController.getAll);
router.get("/articles/:id", ArticleController.getById);
router.post("/articles", ArticleController.create);
router.put("/articles/:id", ArticleController.update);
router.patch("/articles/:id", ArticleController.update);

// 12. Uploads
router.post("/upload", uploadMiddleware.single("file"), UploadController.handleUpload);

// 13. System Simulation & Templates (Time Machine & Template Controls)
router.get("/system/state", SystemController.getState);
router.post("/system/time", SystemController.setTime);
router.post("/system/reset", SystemController.resetTemplates);
router.post("/system/clear", SystemController.clearTemplates);

// 14. Employees & Payroll
router.get("/employees", EmployeeController.getEmployees);
router.get("/employees/:id", EmployeeController.getEmployeeById);
router.post("/employees", EmployeeController.createEmployee);
router.patch("/employees/:id", EmployeeController.updateEmployee);
router.delete("/employees/:id", EmployeeController.deleteEmployee);
router.post("/employees/:id/payout", EmployeeController.payoutSalary);

// 15. Shop & POS Retail Sales
router.get("/shop/catalog", ShopController.getCatalog);
router.get("/shop/orders", ShopController.getOrders);
router.get("/shop/orders/:id", ShopController.getOrderById);
router.post("/shop/orders", ShopController.createOrder);

export default router;
