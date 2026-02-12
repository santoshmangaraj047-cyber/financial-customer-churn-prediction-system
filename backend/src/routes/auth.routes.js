import express from "express";
import { registerUser, loginUser } from "../controllers/auth.controller.js";
import verifyToken from "../middleware/auth.middleware.js";  //  Import middleware
import verifyAdmin from '../middleware/admin.middleware.js';
import User from '../models/User.model.js';

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);

// PROTECTED ROUTE – only accessible with valid token
router.get("/profile", verifyToken, (req, res) => {
  res.json({
    success: true,
    message: "Protected route accessed successfully",
     // user info from token
    user: req.user  
  });
});

// GET all users – admin only
router.get('/users', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;