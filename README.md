# 🔥 Ember — Secure, End-to-End Encrypted Chat Application

Ember is a production-grade, enterprise-ready MERN-stack chat platform engineered with absolute privacy at its core. It leverages a modern cryptosystem to guarantee that the server acts as a strictly **blind router**, storing and relaying only cryptographically unreadable ciphertext. 

The application marries cutting-edge Web Crypto security with an immersive, high-performance UI featuring interactive 3D elements and robust session lifecycle controls.

🔗 **Live Production Deployment:** [ember-secure-chatting-2.onrender.com](https://ember-secure-chatting-2.onrender.com/)



## 🏗️ Architecture & Data Flow

Ember enforces true End-to-End Encryption (E2EE). The backend layer (Express/Socket.io) and database tier (MongoDB) are zero-knowledge entities; they lack the cryptographic primitives required to decrypt user messages.


## 🚀 Core Feature Matrix

* **Zero-Knowledge Backend Architecture:** Engineered so that the Express server and MongoDB database function strictly as blind routers. The system has structural assurance that raw message payloads, unencrypted attachments, and private keys can never be intercepted or leaked during a server breach.
* **Dual-Track Authentication Engine:** Features seamless identity orchestration allowing traditional native email/password onboarding alongside a streamlined, auto-verified Google OAuth 2.0 single-sign-on (SSO) gateway.
* **XSS & CSRF Hardened Sessions:** Session integrity is maintained using cryptographically signed JSON Web Tokens (JWT) dispatched via `HttpOnly`, `Secure`, and `SameSite=Strict` browser cookies, establishing robust defenses against client-side script token theft.
* **Automated Two-Factor Verification:** Includes an integrated email OTP pipeline for account registration and password recovery. The server enforces automatic token expiration using high-performance MongoDB Time-To-Live (TTL) indices.
* **Reactive & Fluid UX UI:** Employs a low-latency, bi-directional communication layer powered by Socket.io to manage real-time user presence, active typing signals, and accurate read receipts. The UI combines a modern glassmorphic theme with smooth, declarative 3D canvas visuals implemented using React Three Fiber.
