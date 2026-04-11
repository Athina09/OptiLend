require("dotenv").config();
const express = require("express");
const cors = require("cors");
const sendWeeklyReport = require("./routes/email");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check route
app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "Optilend Server", timestamp: new Date().toISOString() });
});

// Start the server
app.listen(PORT, async () => {
    console.log(`\n🚀 Optilend Server running on http://localhost:${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health\n`);

    // Auto-send the weekly MSME report on startup
    console.log("📨 Generating and sending Weekly MSME Credit Report...\n");
    await sendWeeklyReport();
});
