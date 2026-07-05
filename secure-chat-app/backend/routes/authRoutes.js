/**
 * routes/authRoutes.js
 * ----------------------
 * All authentication-related endpoints:
 *   - local email/password + OTP
 *   - Google OAuth (redirect-based)
 */

const express = require('express');
const passport = require('passport');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

const {
  register,
  verifyRegisterOtp,
  resendOtp,
  login,
  forgotPassword,
  resetPassword,
  logout,
  me,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const generateToken = require('../utils/generateToken');

const router = express.Router();

// Rate limit sensitive endpoints to slow down brute-force / spam attempts.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { message: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: { message: 'Too many code requests. Please wait before trying again.' },
});

// ---- Local email/password + OTP -----------------------------------------
router.post('/register', authLimiter, register);
router.post('/verify-otp', authLimiter, verifyRegisterOtp);
router.post('/resend-otp', otpLimiter, resendOtp);
router.post('/login', authLimiter, login);
router.post('/forgot-password', otpLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.post('/logout', logout);
router.get('/me', protect, me);

// ---- Google OAuth 2.0 -----------------------------------------------------
// Step 1: kick off the OAuth dance. `session: false` because we use JWT
// cookies, not passport sessions.
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// Step 2: Google redirects here with the result. On success we issue our
// own JWT cookie and redirect the browser back to the frontend app.
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL}/login?error=google` }),
  (req, res) => {
    generateToken(res, req.user._id);
    // needsKeys tells the frontend whether this user still needs to
    // generate & upload an E2EE key pair (true for brand-new Google sign-ups).
    const needsKeys = !req.user.publicKey;
    res.redirect(`${process.env.CLIENT_URL}/auth/callback?needsKeys=${needsKeys}`);
  }
);

module.exports = router;
