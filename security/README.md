# codHER security

Small **AES-256-CBC** helpers for demo backends (`utils/encryption.js`). The key comes from **`ENCRYPTION_KEY`** (32 bytes: 64 hex chars or base64). Each `encrypt()` call uses a **new random IV**, so encrypting the same text twice yields two different ciphertexts.

---

## Quick demo: encrypt twice

**Step 1 — go to this folder and set a one-off key (32-byte hex):**

```bash
cd /Users/apple/CodHER/codHER/security
export ENCRYPTION_KEY="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
```

**Step 2 — run two encryptions (same plaintext, two different outputs):**

```bash
node -e "
const { encrypt } = require('./utils/encryption');
console.log(encrypt('hello'));
console.log(encrypt('hello'));
"
```

You should see two objects like `{ encryptedData: '...', iv: '...' }` with different `iv` and `encryptedData`.

---

## One-liner alternative (no `export`)

Runs Node with `ENCRYPTION_KEY` set only for that process:

```bash
cd /Users/apple/CodHER/codHER/security
ENCRYPTION_KEY="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" node -e "
const { encrypt } = require('./utils/encryption');
console.log(encrypt('hello'));
console.log(encrypt('hello'));
"
```

---

## Env file

Copy `.env.example` to `.env` in the app that loads `dotenv`, or paste a generated hex key into your shell profile for local dev. See `.env.example` for the variable name.
