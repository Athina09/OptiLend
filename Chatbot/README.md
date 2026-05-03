# Optilend Chatbot server

Express API on **port 5001** (default). Uses **OpenRouter** for LLM replies; **Firebase Admin** is optional for profile + chat history in Firestore.

## Run

```bash
cd Chatbot
npm install
cp .env.example .env   # if present; set OPENROUTER_API_KEY
node server.js
```

- Health: `http://localhost:5001/health`

## Firebase (optional)

If `config/firebaseServiceKey.json` is missing, the server logs *Running without Firebase* and chat still works without Firestore.

1. In [Firebase Console](https://console.firebase.google.com/) → Project settings → Service accounts → **Generate new private key**.
2. Save the JSON file as either:

   **`Chatbot/config/firebase.json`** (preferred) or **`Chatbot/config/firebaseServiceKey.json`**

   (folder: `codHER/Chatbot/config/`)

3. Restart `node server.js`. You should see: **`Firebase connected: profile and chat history enabled.`**

This file is **gitignored** — never commit it.

If you see **`Too few bytes to read ASN.1 value`** or **`private key` / decoder errors**, the JSON is almost always **corrupted** (broken `private_key` line breaks). **Do not** paste the key through chat or reformat it by hand. Download a **new** key from Firebase and replace the file.

### Example layout

Copy `config/firebaseServiceKey.json.example` to `config/firebaseServiceKey.json` and replace placeholders with your real JSON from Firebase (or copy the downloaded file directly).

## Environment

- **`OPENROUTER_API_KEY`** — required for model calls (in `.env`).
- **`ALLOWED_ORIGIN`** — optional extra CORS origin for your Next app URL.

## Security note

If a service account key is ever exposed, **revoke it** in Google Cloud Console and generate a new key.
