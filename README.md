# 🔥 Ember — Secure, End-to-End Encrypted Chat Application

Ember is a production-grade, enterprise-ready MERN-stack chat platform engineered with absolute privacy at its core. It leverages a modern cryptosystem to guarantee that the server acts as a strictly **blind router**, storing and relaying only cryptographically unreadable ciphertext. 

The application marries cutting-edge Web Crypto security with an immersive, high-performance UI featuring interactive 3D elements and robust session lifecycle controls.

🔗 **Live Production Deployment:** [ember-secure-chatting-2.onrender.com](https://ember-secure-chatting-2.onrender.com/)

---

## 🏗️ Architecture & Data Flow

Ember enforces true End-to-End Encryption (E2EE). The backend layer (Express/Socket.io) and database tier (MongoDB) are zero-knowledge entities; they lack the cryptographic primitives required to decrypt user messages.
