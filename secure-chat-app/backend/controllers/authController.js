/**
 * controllers/authController.js
 * -------------------------------
 * All email/password + OTP authentication logic lives here. Google OAuth is
 * handled separately by passport.js + routes/authRoutes.js because it uses a
 * redirect-based flow instead of JSON request/response.
 *
 * FLOW SUMMARY
 * ------------
 * register        -> create unverified user, email an OTP, wait for verifyRegisterOtp
 * verifyRegisterOtp -> confirms email, marks user verified, logs them in (sets cookie)
 * login           -> email+password check, must be verified first
 * forgotPassword  -> emails an OTP for password reset
 * resetPassword   -> verifies OTP, sets new password
 * logout          -> clears the auth cookie
 * me              -> returns the currently authenticated user
 */

const validator = require('validator');
const User = require('../models/User');
const Otp = require('../models/Otp');
const generateOtp = require('../utils/otpGenerator');
const { sendEmail, otpEmailTemplate } = require('../utils/sendEmail');
const generateToken = require('../utils/generateToken');

const OTP_LENGTH = Number(process.env.OTP_LENGTH) || 6;
const OTP_EXPIRES_MINUTES = Number(process.env.OTP_EXPIRES_MINUTES) || 10;

/**
 * POST /api/auth/register
 * Body: { username, email, password, publicKey, keyFingerprint }
 *
 * `publicKey` is the JWK-exported ECDH public key generated client-side.
 * We store it now so the account is immediately ready to receive encrypted
 * messages once verified - no separate "upload my key" step for local signups.
 */
async function register(req, res, next) {
  try {
    const { username, email, password, publicKey, keyFingerprint } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required.' });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing && existing.isVerified) {
      return res.status(409).json({ message: 'An account with that email already exists.' });
    }

    let user;
    if (existing && !existing.isVerified) {
      // Re-registration attempt on an unverified account: update details and resend OTP.
      existing.username = username;
      existing.password = password; // pre-save hook re-hashes
      existing.publicKey = publicKey || existing.publicKey;
      existing.keyFingerprint = keyFingerprint || existing.keyFingerprint;
      user = await existing.save();
    } else {
      user = await User.create({
        username,
        email: email.toLowerCase(),
        password,
        publicKey: publicKey || null,
        keyFingerprint: keyFingerprint || null,
        authProvider: 'local',
        isVerified: false,
      });
    }

    const code = generateOtp(OTP_LENGTH);
    await Otp.createOtp(user.email, code, 'register', OTP_EXPIRES_MINUTES);

    await sendEmail({
      to: user.email,
      subject: 'Verify your Secure Chat account',
      html: otpEmailTemplate({ code, purpose: 'register', minutes: OTP_EXPIRES_MINUTES }),
    });

    res.status(201).json({
      message: 'Account created. Check your email for a verification code.',
      email: user.email,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/verify-otp
 * Body: { email, code }
 * Confirms the registration OTP, marks the user verified, and logs them in.
 */
async function verifyRegisterOtp(req, res, next) {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ message: 'Email and code are required.' });
    }

    const result = await Otp.verifyOtp(email.toLowerCase(), code, 'register');
    if (!result.valid) {
      return res.status(400).json({ message: result.reason });
    }

    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { isVerified: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'Account not found.' });
    }

    generateToken(res, user._id);
    res.status(200).json({ message: 'Email verified.', user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/resend-otp
 * Body: { email, purpose }  purpose: 'register' | 'reset-password'
 */
async function resendOtp(req, res, next) {
  try {
    const { email, purpose } = req.body;
    if (!email || !purpose) {
      return res.status(400).json({ message: 'Email and purpose are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal whether the email exists - generic response.
      return res.status(200).json({ message: 'If that account exists, a new code has been sent.' });
    }

    const code = generateOtp(OTP_LENGTH);
    await Otp.createOtp(user.email, code, purpose, OTP_EXPIRES_MINUTES);

    await sendEmail({
      to: user.email,
      subject: purpose === 'register' ? 'Your new verification code' : 'Your password reset code',
      html: otpEmailTemplate({ code, purpose, minutes: OTP_EXPIRES_MINUTES }),
    });

    res.status(200).json({ message: 'If that account exists, a new code has been sent.' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // .select('+password') because the schema hides it by default.
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      // Same message for "no user" and "wrong password" - don't leak which one.
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: 'Please verify your email before logging in.',
        needsVerification: true,
        email: user.email,
      });
    }

    generateToken(res, user._id);
    res.status(200).json({ message: 'Logged in.', user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 */
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required.' });

    const user = await User.findOne({ email: email.toLowerCase() });

    // Always respond the same way whether or not the account exists, so an
    // attacker can't use this endpoint to enumerate registered emails.
    if (!user || user.authProvider === 'google') {
      return res.status(200).json({
        message: 'If that account exists and uses a password, a reset code has been sent.',
      });
    }

    const code = generateOtp(OTP_LENGTH);
    await Otp.createOtp(user.email, code, 'reset-password', OTP_EXPIRES_MINUTES);

    await sendEmail({
      to: user.email,
      subject: 'Reset your Secure Chat password',
      html: otpEmailTemplate({ code, purpose: 'reset-password', minutes: OTP_EXPIRES_MINUTES }),
    });

    res.status(200).json({
      message: 'If that account exists and uses a password, a reset code has been sent.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/reset-password
 * Body: { email, code, newPassword }
 */
async function resetPassword(req, res, next) {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: 'Email, code, and new password are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    const result = await Otp.verifyOtp(email.toLowerCase(), code, 'reset-password');
    if (!result.valid) {
      return res.status(400).json({ message: result.reason });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'Account not found.' });

    user.password = newPassword; // pre-save hook re-hashes
    await user.save();

    res.status(200).json({ message: 'Password updated. You can now log in.' });
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/logout */
function logout(req, res) {
  res.clearCookie(process.env.COOKIE_NAME || 'sc_token', { path: '/' });
  res.status(200).json({ message: 'Logged out.' });
}

/** GET /api/auth/me  (protected) */
function me(req, res) {
  res.status(200).json({ user: req.user.toSafeJSON() });
}

module.exports = {
  register,
  verifyRegisterOtp,
  resendOtp,
  login,
  forgotPassword,
  resetPassword,
  logout,
  me,
};
