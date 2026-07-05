/**
 * utils/otpGenerator.js
 * ---------------------
 * Generates a numeric one-time code using Node's cryptographically secure
 * random number generator (NOT Math.random, which is predictable).
 */

const crypto = require('crypto');

function generateOtp(length = 6) {
  // Build a code like "042917" - fixed length, zero-padded, digits only.
  const max = 10 ** length;
  const num = crypto.randomInt(0, max);
  return String(num).padStart(length, '0');
}

module.exports = generateOtp;
