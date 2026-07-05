/**
 * models/Otp.js
 * -------------
 * One-Time-Password records used for:
 *   - "register"        : verifying a new account's email address
 *   - "reset-password"  : verifying identity before allowing a password reset
 *
 * We store a HASH of the OTP (never the plaintext code) so that a database
 * leak alone can't be used to take over accounts. Documents auto-expire via
 * a MongoDB TTL index, so stale codes clean themselves up.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  codeHash: {
    type: String,
    required: true,
  },
  purpose: {
    type: String,
    enum: ['register', 'reset-password'],
    required: true,
  },
  attempts: {
    type: Number,
    default: 0, // used to rate-limit brute-force guesses per code
  },
  expiresAt: {
    type: Date,
    required: true,
    // TTL index: MongoDB automatically deletes the document once this time passes.
    index: { expires: 0 },
  },
});

// Hash the raw code before saving.
otpSchema.statics.createOtp = async function createOtp(email, rawCode, purpose, expiresMinutes) {
  const codeHash = await bcrypt.hash(rawCode, 10);
  const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);

  // Remove any previous unused OTPs for this email+purpose so only the
  // latest code is valid.
  await this.deleteMany({ email, purpose });

  return this.create({ email, codeHash, purpose, expiresAt });
};

// Verify a raw code against the most recent stored hash for email+purpose.
otpSchema.statics.verifyOtp = async function verifyOtp(email, rawCode, purpose) {
  const record = await this.findOne({ email, purpose }).sort({ expiresAt: -1 });
  if (!record) return { valid: false, reason: 'No active code for this email. Request a new one.' };

  if (record.attempts >= 5) {
    await record.deleteOne();
    return { valid: false, reason: 'Too many incorrect attempts. Request a new code.' };
  }

  const matches = await bcrypt.compare(rawCode, record.codeHash);
  if (!matches) {
    record.attempts += 1;
    await record.save();
    return { valid: false, reason: 'Incorrect code.' };
  }

  await record.deleteOne(); // one-time use only
  return { valid: true };
};

module.exports = mongoose.model('Otp', otpSchema);
