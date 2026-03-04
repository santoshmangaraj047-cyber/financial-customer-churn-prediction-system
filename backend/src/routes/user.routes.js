import express from "express";

const router = express.Router();

// Example test route
router.get("/test", (req, res) => {
  res.json({ message: "User route working" });
});

export default router;