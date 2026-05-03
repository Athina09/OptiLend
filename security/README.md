# codHER security

AES-256-CBC encryption helpers for **Node.js** backends using the built-in **`crypto`** module (no extra dependencies). Intended for demos where you want to show **encrypting sensitive payloads** before storage or transit.

## Concepts

- **AES-256-CBC**: symmetric encryption with a **256-bit key** and a **128-bit IV** per encryption.
- **Key**: read from environment variable **`ENCRYPTION_KEY`** (never hardcode in source). Supports **64 hex characters** (32 bytes) or **base64** that decodes to exactly **32 bytes**.
- **IV**: **new random IV on every `encrypt()`** — same plaintext encrypts to different ciphertext each time; you must store **`iv`** next to **`encryptedData`** for decryption.

> CBC does not authenticate ciphertext by itself. For new production systems, **AES-256-GCM** is often preferred. This module matches a common demo pattern (CBC + hex).

## Configuration

Copy **`.env.example`** into the app that loads `dotenv` (e.g. `server/.env`) and set:

```env
ENCRYPTION_KEY=<64-char-hex-or-base64-32-bytes>
```

Generate a random hex key (run once, store in secrets manager for production):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## API (`utils/encryption.js`)

| Export | Description |
|--------|-------------|
| `encrypt(plaintext)` | Returns `{ encryptedData, iv }` (hex strings). |
| `decrypt(encryptedData, ivHex)` | Returns UTF-8 string. Throws on bad input / wrong key. |
| `encryptJson(value)` | `JSON.stringify` then `encrypt`. |
| `decryptJson(encryptedData, ivHex)` | `decrypt` then `JSON.parse`. |
| `isEncryptionConfigured()` | `true` if `ENCRYPTION_KEY` loads without error. |

`require` from another package in the monorepo:

```js
const {
  encrypt,
  decrypt,
  encryptJson,
  decryptJson,
  isEncryptionConfigured,
} = require('../security/utils/encryption');
```

## Quick demo: encrypt twice

Same plaintext → two different ciphertexts (different IVs).

**Important:** Run these commands from the **`codHER/security`** directory. `./utils/encryption` is relative to your shell’s current folder. If you run `node -e` from **`CodHER`** (the workspace root only), Node looks for `CodHER/utils/encryption.js`, which does not exist → **`Cannot find module './utils/encryption'`**.

**Copy-paste (all three lines — includes `cd`):**

```bash
cd /Users/apple/CodHER/codHER/security
export ENCRYPTION_KEY="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
node -e "
const { encrypt } = require('./utils/encryption');
for (let i = 1; i <= 2; i++) {
  const { encryptedData, iv } = encrypt('hello');
  console.log('Run', i);
  console.log('  iv (hex):            ', iv);
  console.log('  encryptedData (hex):', encryptedData);
  console.log('');
}
"
```

(Adjust the `cd` path if your repo lives somewhere other than `/Users/apple/CodHER`.)

**One-liner** (key only for that process) — prints **IV + ciphertext hex**, then decrypted plaintext:

```bash
cd ~/CodHER/codHER/security
ENCRYPTION_KEY="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" node -e "
const { encrypt, decrypt } = require('./utils/encryption');
const a = encrypt('hello');
console.log('iv (hex):            ', a.iv);
console.log('encryptedData (hex):', a.encryptedData);
console.log('decrypted (utf8):   ', decrypt(a.encryptedData, a.iv));
"
```

Do **not** merge `export ...` and `node -e` on one line incorrectly; use two commands or the `ENCRYPTION_KEY=... node -e` form above.

## Using in an Express route (pattern)

```js
const { encryptJson } = require('../security/utils/encryption');

app.post('/store-financials', (req, res) => {
  const { encryptedData, iv } = encryptJson(req.body);
  // persist encryptedData + iv (and never log the key)
  res.json({ ok: true });
});
```

## Package entry

**`package.json`** sets `"main": "utils/encryption.js"` for tooling; most apps use the relative path above.

## Disclaimer

Demo / educational use. Production systems need key rotation, access control, audited crypto choices, and compliance review.
