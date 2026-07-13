const path = require("path");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const app = express();
connectDB();
app.use(express.json({ limit: "10mb" }));
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/budgets", require("./routes/budgetRoutes"));
app.use("/api/complaints", require("./routes/complaintRoutes"));
app.get("/", (req, res) => {
  res.send("Nagarik Aawaz API running");
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
