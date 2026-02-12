import express from "express";
import app from "./app.js";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

dotenv.config(); 
connectDB();



app.use(express.json());

// console.log("PORT from env:", process.env.PORT); 

app.get("/", (req, res) => {
  res.send("Backend is running ...");
});

const port = process.env.PORT || 2005;

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});


 