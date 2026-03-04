import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import predictionRoutes from "./routes/prediction.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import userRoutes from "./routes/user.routes.js";
import errorMiddleware from "./middleware/error.middleware.js";
import { generalLimiter, authLimiter } from './middleware/rateLimiter.js';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rate limiting
app.use(generalLimiter);          
app.use('/api/auth', authLimiter); 

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/prediction", predictionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/user", userRoutes);

// Error handler
app.use(errorMiddleware);

export default app;