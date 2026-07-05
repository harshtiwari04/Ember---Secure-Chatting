/**
 * models/Message.js
 * ------------------
 * A single chat message. CRITICALLY: this document never contains plaintext.
 *
 * `ciphertext` + `iv` are Base64 strings produced by AES-GCM on the SENDER's
 * device (see frontend/src/crypto/encryption.js). The Express server and
 * MongoDB only ever see opaque bytes - they cannot read message content.
 *
 * Because AES-GCM is symmetric and the shared key is derived independently
 * by both sides via ECDH (Diffie-Hellman), we do not need to store a
 * separate encrypted copy per-recipient the way multi-party E2EE systems do -
 * this is a 1:1 chat app, so one ciphertext per message is sufficient.
 */

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    ciphertext: {
      type: String, // Base64-encoded AES-GCM ciphertext
      required: true,
    },
    iv: {
      type: String, // Base64-encoded 96-bit initialization vector (unique per message)
      required: true,
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent',
    },
  },
  { timestamps: true }
);

// Fast lookup of a conversation between two users, ordered by time.
messageSchema.index({ sender: 1, recipient: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
