/**
 * Aadhaar OTP Auth + AA Consent + FI Request Server
 *
 * Entry point for the Express application.
 * Mounts Aadhaar auth, AA consent, and FI request routes.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const aadhaarRoutes = require('./routes/aadhaarRoutes');
const consentRoutes = require('./routes/consentRoutes');
const fiRequestRoutes = require('./routes/fiRequestRoutes');
const upiAnalyticsRoutes = require('./routes/upiAnalyticsRoutes');
const bbpsRoutes = require('./routes/bbpsRoutes');
const gstRoutes = require('./routes/gstRoutes');
const behaviourRoutes = require('./routes/behaviourRoutes');
const socialRoutes = require('./routes/socialRoutes');
const footprintRoutes = require('./routes/footprintRoutes');
const businessVerificationRoutes = require('./routes/businessVerificationRoutes');
const mastersIndiaGstRoutes = require('./routes/mastersIndiaGstRoutes');
const consentService = require('./services/consentService');
const behaviourService = require('./services/behaviourService');
const socialService = require('./services/socialService');

const app = express();

// ─── Security Middleware ───────────────────────────────────────────
app.use(helmet());                       // Sets security-related HTTP headers
app.use(cors());                         // Enable CORS for all origins (tighten in production)
app.use(express.json({ limit: '5mb' })); // Parse JSON (GST GSTR-3B payloads can be large)

// ─── Health Check ──────────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'aadhaar-otp-auth',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
});

// ─── Routes ────────────────────────────────────────────────────────
app.use('/', aadhaarRoutes);
app.use('/', consentRoutes);
app.use('/', fiRequestRoutes);
app.use('/', upiAnalyticsRoutes);
app.use('/', bbpsRoutes);
app.use('/', gstRoutes);
app.use('/', behaviourRoutes);
app.use('/', socialRoutes);
app.use('/', footprintRoutes);
app.use('/', businessVerificationRoutes);
app.use('/', mastersIndiaGstRoutes);

// ─── 404 Handler ───────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found.`,
    });
});

// ─── Global Error Handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('[Server] Unhandled error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error.',
    });
});

// ─── Start Server ──────────────────────────────────────────────────
async function start() {
    // Initialize consent service (connects to PostgreSQL or falls back to memory)
    await consentService.init();
    await behaviourService.init();
    await socialService.init();

    app.listen(config.port, () => {
        console.log(`
╔══════════════════════════════════════════════════╗
║   Aadhaar OTP + AA Consent Server                ║
║   Running on: http://localhost:${config.port}             ║
║   Environment: ${process.env.NODE_ENV || 'development'}                    ║
╚══════════════════════════════════════════════════╝
    `);
        console.log('Available endpoints:');
        console.log('  POST /auth/aadhaar/initiate      — Start OTP flow');
        console.log('  POST /auth/aadhaar/verify        — Verify OTP & get JWT');
        console.log('  POST /consent/create             — Create consent artefact');
        console.log('  GET  /consent/:consentId         — Get consent by ID');
        console.log('  GET  /consent/user/:userId       — Get user consents');
        console.log('  POST /consent/:consentId/revoke  — Revoke consent');
        console.log('  POST /fi/request                 — Initiate FI data request');
        console.log('  POST /fi/fetch                   — Fetch + decrypt + parse FI data');
        console.log('  GET  /fi/session/:txnid          — Get FI session');
        console.log('  GET  /fi/sessions                — List all FI sessions');
        console.log('  GET  /fi/fetch/:sessionId        — Fetch FI data (GET)');
        console.log('  POST /analytics/upi              — UPI analytics from transactions');
        console.log('  POST /analytics/upi/session      — UPI analytics from session');
        console.log('  POST /utility/bbps/fetch          — Fetch bills + reliability score');
        console.log('  POST /gst/fetch                   — GST filings + compliance score');
        console.log('  GET  /gst/masters-india/data       — Masters India: GSTR data (gstin, month, year)');
        console.log('  POST /gst/masters-india/upload-gstr3b — Masters India: GSTR-3B JSON upload');
        console.log('  POST /gst/masters-india/upload-gstr1  — Masters India: GSTR-1 JSON upload');
        console.log('  GET  /gst/masters-india/period-default — Suggested month + FY for API');
        console.log('  GET  /behaviour/questions          — Get 5 random quiz questions');
        console.log('  POST /behaviour/quiz               — Submit quiz + get risk score');
        console.log('  POST /send-otp                     — Business ID → mock OTP (demo: 123456)');
        console.log('  POST /verify-otp                   — Verify OTP + business checks + JWT');
        console.log('  POST /social/connect               — Social trust score from OAuth');
        console.log('  GET  /social/oauth/:platform/cb    — OAuth callback handler');
        console.log('  POST /social/footprint             — Scrape public social metadata');
        console.log('  GET  /health                     — Health check');
        console.log('');
    });
}

start().catch((err) => {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
});

module.exports = app;
