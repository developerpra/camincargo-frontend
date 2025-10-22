const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

// Re-enable permissive CORS so production UI on a different port can call API
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json());

// Root route
app.get("/", (req, res) => {
  res.send("Backend is up and running");
});

// Import routes FIRST (before static files)
const productRoutes = require("./routes/product");
app.use("/products", productRoutes);

// Serve built frontend (service-workers/dist) on /app path
const path = require('path');
const distDir = path.join(__dirname, '..', 'service-workers', 'dist');
app.use('/app', express.static(distDir));

// Note: SPA fallback removed to avoid Express 5 path-to-regexp issues.

const PORT = process.env.PORT || 4000;
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("MongoDB connected successfully!");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.log(err));
