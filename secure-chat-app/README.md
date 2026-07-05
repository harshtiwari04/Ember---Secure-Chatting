# Ember — Secure, End-to-End Encrypted Chat

A MERN-stack chat app with a 3D landing page, dual (email/password + Google)
authentication, mandatory email OTP verification, and real end-to-end
encryption: the server only ever stores and relays ciphertext.

```
┌──────────────┐   ECDH public key    ┌──────────────┐
│   Browser A  │ ───────────────────▶ │   MongoDB    │
│ (private key │                      │ (public keys │
│  in IndexedDB)│ ◀─────────────────── │  + ciphertext)│
└──────────────┘   ECDH public key    └──────────────┘
        │                                     ▲
        │ AES-GCM ciphertext (Socket.io)       │
        ▼                                     │
┌──────────────┐                       ┌──────────────┐
│   Express +  │ ───── relays only ──▶ │   Browser B  │
│   Socket.io  │      ciphertext       │ (private key │
│ (blind router)│                       │  in IndexedDB)│
└──────────────┘                       └──────────────┘
```

## Folder structure

```
secure-chat-app/
├── backend/
│   ├── server.js                 Express + Socket.io entry point
│   ├── config/
│   │   ├── db.js                 MongoDB connection
│   │   └── passport.js           Google OAuth strategy
│   ├── models/
│   │   ├── User.js                username, email, password hash, publicKey, ...
│   │   ├── Otp.js                 hashed one-time codes, auto-expiring
│   │   └── Message.js             ciphertext + iv only, never plaintext
│   ├── controllers/
│   │   ├── authController.js      register / verify / login / reset / logout
│   │   └── messageController.js   conversation history (still ciphertext)
│   ├── routes/                    authRoutes.js, userRoutes.js, messageRoutes.js
│   ├── middleware/                authMiddleware.js (JWT cookie check), errorMiddleware.js
│   ├── utils/                     generateToken.js, sendEmail.js, otpGenerator.js
│   └── socket/
│       └── socketHandler.js       presence, private messaging, typing, read receipts
│
└── frontend/
    ├── src/
    │   ├── crypto/
    │   │   ├── keyManager.js      ECDH key pair generation, export/import, fingerprint
    │   │   ├── encryption.js      ECDH → HKDF → AES-GCM encrypt/decrypt
    │   │   └── indexedDb.js       private key storage (never sent over the network)
    │   ├── store/                 authStore.js, chatStore.js (Zustand)
    │   ├── api/axios.js           REST client (cookie-based auth)
    │   ├── socket/socket.js       Socket.io client
    │   ├── components/
    │   │   ├── landing/           Scene3D.jsx, Particles.jsx, LandingPage.jsx
    │   │   ├── auth/              LoginForm, SignupForm, OtpVerify, ForgotPassword
    │   │   ├── chat/              ChatLayout, Sidebar, ChatWindow, MessageBubble, TypingIndicator
    │   │   └── ui/                GlassCard, Button
    │   ├── pages/                 Home.jsx, Chat.jsx, AuthCallback.jsx
    │   └── hooks/useChatSocket.js
    └── ...config files
```

## 1. Prerequisites

- Node.js 18+
- A MongoDB database — either local (`mongod`) or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
- A Google Cloud OAuth 2.0 Client ID (for "Continue with Google")
- An SMTP account for sending OTP emails (Gmail + an **App Password** works well for development)

## 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Fill in `backend/.env`:

| Variable | Where to get it |
|---|---|
| `MONGO_URI` | Your MongoDB connection string |
| `JWT_SECRET` | Any long random string, e.g. `openssl rand -hex 32` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials) → Create OAuth Client ID → Web application. Add `http://localhost:5000/api/auth/google/callback` as an authorized redirect URI. |
| `SMTP_USER` / `SMTP_PASS` | For Gmail: enable 2-Step Verification, then create an [App Password](https://myaccount.google.com/apppasswords). Use that 16-character password, **not** your normal Gmail password. |

Then run it:

```bash
npm run dev
# Secure Chat backend listening on http://localhost:5000
```

## 3. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
# open http://localhost:5173
```

`VITE_API_URL` in `frontend/.env` should point at your backend (`http://localhost:5000` by default).

## 4. How the encryption actually works

1. **Signup**: your browser generates an ECDH (P-256) key pair with the Web
   Crypto API. The **public** key goes to MongoDB. The **private** key is
   saved only in your browser's IndexedDB and is never transmitted.
2. **Sending a message**: your browser combines *your* private key with
   *your contact's* public key via ECDH, runs the result through HKDF to get
   a proper AES-256-GCM key, and encrypts the message with a fresh random IV.
   Only `{ciphertext, iv}` is sent to the server.
3. **Receiving a message**: your contact's browser derives the *exact same*
   AES key (that's the Diffie-Hellman property: `A_private + B_public ==
   B_private + A_public`) and decrypts locally.
4. The Express server and MongoDB only ever see ciphertext, IVs, and public
   keys — structurally, they cannot recover plaintext even if compromised.
5. Each contact's chat header shows a **key fingerprint** (a short hash of
   their public key) so you can optionally read it aloud / compare it
   out-of-band to confirm you're really talking to who you think you are —
   the same idea as Signal's "safety numbers".

### Known limitation (by design, worth knowing)

This is a learning/portfolio-grade implementation, not a hardened protocol
like Signal's. In particular: there's no forward secrecy (the same derived
key is reused for a whole conversation rather than rotating per-message),
and a user's private key living in IndexedDB means switching browsers/devices
means generating a new identity (old encrypted history becomes unreadable on
the new device, which is expected — nobody else can decrypt it either).

## 5. Feature checklist

- [x] Email/password signup with mandatory OTP email verification
- [x] Google OAuth login (auto-verified, auto-generates keys on first login)
- [x] Password reset via OTP
- [x] httpOnly JWT cookies (XSS-resistant sessions)
- [x] ECDH + AES-GCM end-to-end encryption, private key never leaves the browser
- [x] Real-time messaging, typing indicators, online/offline dots, read receipts via Socket.io
- [x] 3D animated landing page (React Three Fiber) with glassmorphic auth forms
