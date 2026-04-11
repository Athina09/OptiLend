# Dhanvanth's Hackathon MVP Report

This report summarizes the backend modules and integrations implemented for the project. For a **6-hour hackathon**, we have focused on **Demo Accuracy** over production onboarding.

## 🚀 Accomplishments

### 1. Aadhaar eKYC Integration (Setu Bridge)
- **Status**: Integrated & Simulation-Ready.
- **Workflow**: `POST /auth/aadhaar/initiate` -> `POST /auth/aadhaar/verify`.
- **Logic**: Built to call Setu Bridge APIs. In the absence of real keys, it fails gracefully into a **Hackathon Demo Mode**.

### 2. Real-Time SMS OTP Delivery (Fast2SMS / Twilio)
- **Status**: Production-Ready.
- **Why**: Instead of a fake console log, the system now sends a **real SMS** to the judge's or your phone.
- **Logic**: Integrated Fast2SMS (recommended for India) and Twilio. Once you add your SMS API key to `.env`, the demo becomes interactive.

### 3. Social Trust Score & Footprinting
- **Status**: Logic Integrated + New **Footprinting API**.
- **Special Feature**: Added `POST /social/footprint`. It allows you to "Scrape" public metadata from any LinkedIn/Twitter/Instagram URL to generate a trust score without needing the user to login via OAuth. Perfect for a quick "Check Credit" demo.
- **Logic**: Uses a combination of OpenGraph metadata extraction and simulated "Deep Scanning" for demo realism.

### 4. Database Persistence (PostgreSQL)
- **Status**: Schema Managed.
- **Logic**: Configured to store Consent and Aadhaar verification logs in a PostgreSQL database for reporting and audit trails.

---

## 🔑 Environment Variables (.env) Guide

### ✅ MUST REPLACE (The "Real" stuff)
Keep these real to ensure the demo works on stage.

| Variable | Priority | Reason |
| :--- | :--- | :--- |
| **PG_PASSWORD** | **CRITICAL** | The server will not start or save data without a working DB connection. |
| **SMS_API_KEY** | **HIGH** | Needed to send the real OTP to your phone during the presentation. |
| **DEMO_PHONE_NUMBER** | **HIGH** | The phone number that will receive the OTP for testing. |
| **PORT** | **MEDIUM** | Should match your Frontend's API base URL (e.g., 4000). |

### 🛠️ LEAVE AS TEST (The "Simulated" stuff)
Do **NOT** try to get real keys for these in 6 hours. It is impossible.

| Group | Variables | Reason for Simulation |
| :--- | :--- | :--- |
| **UIDAI / Aadhaar** | `AUA_CODE`, `ASA_LICENSE` | Requires legal AUA license from UIDAI. Impossible for a hackathon. |
| **Social OAuth** | `LINKEDIN_CLIENT_ID`, etc. | App approval for permissions (like profile scraping) take 24-48 hours. |
| **Account Aggregator**| `AA_CLIENT_ID` | Requires FIP/FIU onboarding agreements. |
| **Payment (BBPS)** | `BBPS_API_KEY` | Requires production merchant onboarding. |

---

## 🛡️ Presentation Strategy
- **Start** with Aadhaar verification. Enter your real phone number.
- **Show** the judge the SMS arriving on your phone.
- **Explain** that for the Hackathon MVP, we are using **Simulation Layering** for social data to bypass API approval delays while maintaining a 100% realistic user experience.
