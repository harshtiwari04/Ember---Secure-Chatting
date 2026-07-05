/**
 * models/User.js
 * --------------
 * The User document.
 *
 * SECURITY NOTES:
 * - `password` is only present for email/password accounts and is always
 *   stored as a bcrypt hash (never plaintext). Google-only accounts have no password.
 * - `publicKey` stores the user's ECDH public key as an exported JWK (JSON string).
 *   This is safe to expose - it's the whole point of a *public* key.
 * - The matching PRIVATE key never touches this database. It is generated in
 *   the browser and stored client-side only (IndexedDB). See frontend/src/crypto.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      // Not required: Google-authenticated users have no local password.
      select: false, // never return password by default on queries
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    googleId: {
      type: String,
      default: null,
      index: true,
      sparse: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false, // local accounts start unverified until OTP confirms email
    },
    // --- E2EE key material -------------------------------------------------
    publicKey: {
      // JSON-stringified JWK of the user's ECDH (P-256) public key.
      type: String,
      default: null,
    },
    keyFingerprint: {
      // Short human-readable hash of the public key so users can visually
      // verify they're talking to the right person (safety-number style).
      type: String,
      default: null,
    },
    // --- presence ------------------------------------------------------------
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Hash the password automatically whenever it is set/changed.
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method to compare a candidate password against the stored hash.
userSchema.methods.comparePassword = async function comparePassword(candidate) {
  if (!this.password) return false; // Google-only accounts can't password-login
  return bcrypt.compare(candidate, this.password);
};

// Never leak the password hash even if `select` is overridden somewhere.
userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    avatar: this.avatar,
    isVerified: this.isVerified,
    authProvider: this.authProvider,
    publicKey: this.publicKey,
    keyFingerprint: this.keyFingerprint,
    lastSeen: this.lastSeen,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
