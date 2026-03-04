import express from 'express';
import { 
  predictSingleChurn, 
  getChurnDistribution 
} from '../controllers/prediction.controller.js';

import verifyToken from '../middleware/auth.middleware.js';
import isAdmin from "../middleware/admin.middleware.js";

const router = express.Router();


// BANK + ADMIN ROUTE
// POST /api/predictions/single
// Predict churn for one customer
router.post(
  '/single',
  verifyToken,        // must be logged in
  predictSingleChurn  // controller
);



// ADMIN ONLY ROUTE
// GET /api/predictions/churn-distribution
// Used in Admin Dashboard analytics
router.get(
  '/churn-distribution',
  verifyToken,  // must be logged in
  isAdmin,      // must be admin role
  getChurnDistribution
);

export default router;