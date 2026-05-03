require("dotenv").config();
const express = require("express");
const axios = require("axios");
const path = require("path");
const fs = require("fs");

const app = express();

// CORS: allow MSME portal (Next.js client) to call this backend
const allowedOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001"
];
if (process.env.ALLOWED_ORIGIN) {
    allowedOrigins.push(process.env.ALLOWED_ORIGIN);
}
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
    } else if (!origin) {
        res.setHeader("Access-Control-Allow-Origin", allowedOrigins[0]);
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
});

// Health check (so client can verify server is up)
app.get("/health", (req, res) => {
    res.json({ ok: true, service: "Optilend chat" });
});

app.use(express.json());

// Firebase optional: if config missing or invalid, chat still works without profile/history
let db = null;
let admin = null;
function resolveFirebaseConfigPath() {
    const dir = path.join(__dirname, "config");
    const candidates = [
        path.join(dir, "firebase.json"),
        path.join(dir, "firebaseServiceKey.json"),
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    return null;
}
const configPath = resolveFirebaseConfigPath();
if (configPath) {
    try {
        admin = require("firebase-admin");
        const serviceAccount = JSON.parse(fs.readFileSync(configPath, "utf8"));
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        db = admin.firestore();
        console.log("Firebase connected: profile and chat history enabled.");
        console.log("  (using", path.basename(configPath) + ")");
    } catch (err) {
        console.warn("Firebase config invalid or key unreadable:", err.message);
        const hint =
            /private key|ASN|Too few bytes|DECODER/i.test(String(err.message));
        if (hint) {
            console.warn(
                "  → Your Firebase JSON is likely corrupted (e.g. copy-paste broke PEM line breaks). " +
                    "In Firebase Console: Project settings → Service accounts → Generate new private key. " +
                    "Save as config/firebase.json or config/firebaseServiceKey.json without editing private_key."
            );
        }
        console.warn("Running without Firebase: chat works, no profile/history.");
    }
} else {
    console.warn(
        "No Firebase credentials found. Add config/firebase.json or config/firebaseServiceKey.json (service account JSON)."
    );
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "meta-llama/llama-3-8b-instruct";

async function askLlama(systemPrompt, userMessage) {
    try {
        const response = await axios.post(
            OPENROUTER_URL,
            {
                model: MODEL,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userMessage }
                ],
                temperature: 0.1, // Lower temperature for higher financial accuracy
                max_tokens: 700
            },
            {
                headers: {
                    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error("LLaMA API Error:", error.message);
        return "I encountered an error while processing your financial data.";
    }
}

function sanitize(text) {
    const gstRegex = /\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}\b/g;
    const accountRegex = /\b\d{10,16}\b/g;
    return text.replace(gstRegex, "[HIDDEN_GST]").replace(accountRegex, "[HIDDEN_ACCOUNT]");
}

// --- Main Chat Logic ---
app.post("/chat", async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "No message provided" });

    try {
        let profileData = "No profile data found.";
        let chatContext = "";

        if (db) {
            // SECTION 1: Fetch Permanent Profile Data
            const profileDoc = await db.collection("profile_context").doc("user_profile").get();
            profileData = profileDoc.exists ? profileDoc.data() : profileData;

            // SECTION 2: Fetch Recent Chat History
            const historySnapshot = await db.collection("chat_history")
                .orderBy("timestamp", "desc")
                .limit(5)
                .get();
            const historyDocs = [];
            historySnapshot.forEach(doc => historyDocs.unshift(doc.data()));
            historyDocs.forEach(data => {
                chatContext += `User: ${data.cleaned_user_msg}\nAI: ${data.ai_reply}\n`;
            });
        }

        // SECTION 3: Construct High-Context System Prompt
        const scrubbedMessage = sanitize(message);
        
        const systemInstruction = `
You are Optilend AI — an elite MSME financial underwriting intelligence engine.

You combine:
• Institutional-grade credit risk analytics  
• Alternative data intelligence  
• Modern, sharp conversational clarity  

You speak like a confident financial analyst — clear, structured, insightful — but when highlighting critical findings, you communicate with sharp emphasis and clarity (like modern ChatGPT).

━━━━━━━━━━━━━━━━━━
### CORE BUSINESS DATA (Long-term Profile):
${JSON.stringify(profileData)}

### RECENT ACTIVITY & TRENDS (Chat History):
${chatContext}

━━━━━━━━━━━━━━━━━━
### ANALYTICAL FRAMEWORK:

1. Use Business Data for:
   - Industry benchmarking
   - Entity validation
   - Compliance verification
   - Historical performance

2. Use Chat History for:
   - Trend detection
   - Recent liquidity shifts
   - Revenue volatility
   - Behavioral financial signals

3. If data is missing in one section, intelligently cross-reference the other.

4. Always reason using:
   - DSCR (Debt Service Coverage Ratio)
   - Net Cash Flow
   - Revenue Stability
   - Compliance Behavior
   - Risk Scoring Logic

━━━━━━━━━━━━━━━━━━
### RESPONSE STYLE:

• Professional but sharp.
• Structured with headings.
• Use clean bullet points.
• Highlight critical insights clearly.
• No casual jokes.
• No fluff.
• No generic disclaimers.
• Do NOT start with:
  - "Based on your Data"
  - "Based on your Profile"
  - "Based on your Chat History"

━━━━━━━━━━━━━━━━━━
### IMPORTANT:
When something materially affects credit risk, explicitly label it:

🔴 Risk Signal:
🟡 Watchlist Indicator:
🟢 Strength Factor:
⚠️ Immediate Concern:
📈 Positive Momentum:

Be decisive. Be analytical. Be precise.
`;

        const reply = await askLlama(systemInstruction, `Current User Query: ${scrubbedMessage}`);

        // Save new interaction (only if Firebase is connected)
        if (db && admin) {
            db.collection("chat_history").add({
                raw_user_msg: message,
                cleaned_user_msg: scrubbedMessage,
                ai_reply: reply,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        res.json({ reply });

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: "Failed to process financial request." });
    }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Optilend chat server running on http://localhost:${PORT}`);
    console.log(`  Health check: http://localhost:${PORT}/health`);
});