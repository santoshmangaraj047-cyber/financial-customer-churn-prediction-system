import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";


// Initialize express app
const app = express();


// Global Middlewares


// Enable CORS (frontend ↔ backend)
app.use(cors());

// Parse incoming JSON
app.use(express.json());

// Health Check Route

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running 🚀",
  });
});

// Routes 
app.use("/api/auth", authRoutes);


// app.use("/api/auth", authRoutes);


// 404 Handler

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

export default app;
