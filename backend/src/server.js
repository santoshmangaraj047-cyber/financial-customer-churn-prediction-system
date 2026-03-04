import express from "express";
import app from "./app.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine which env file to load based on NODE_ENV
const envFile = process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env.development';
dotenv.config({ path: path.resolve(__dirname, '..', envFile) });

console.log(`Loaded environment: ${envFile} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);

connectDB();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend is running ...");
});

const port = process.env.PORT || 2005;

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});