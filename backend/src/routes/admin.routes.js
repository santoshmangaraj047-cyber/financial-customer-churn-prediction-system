import express from "express";
import { approveUser } from "../controllers/admin.controller.js";
import verifyToken from "../middleware/auth.middleware.js";
import isAdmin from "../middleware/admin.middleware.js";

// ✅ 1. Create router instance
const router = express.Router();

// ✅ 2. Define routes
router.patch("/approve/:userId", verifyToken, isAdmin, approveUser);

// Add any other admin routes here
// router.get("/dashboard", verifyToken, isAdmin, adminDashboard);

// ✅ 3. Export router
export default router;