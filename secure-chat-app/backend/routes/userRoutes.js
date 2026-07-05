/**
 * routes/userRoutes.js
 * ----------------------
 * User directory + public key management.
 */

const express = require('express');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * GET /api/users
 * Returns every other user (for the chat sidebar / "start a conversation"
 * list), including their public key so the client can encrypt to them.
 */
router.get('/', protect, async (req, res, next) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } }).select(
      'username email avatar publicKey keyFingerprint lastSeen'
    );
    res.status(200).json({ users });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/users/keys
 * Body: { publicKey, keyFingerprint }
 * Used once, right after a brand-new Google OAuth signup, to upload the
 * client-generated ECDH public key (local signups upload theirs during
 * /register instead).
 */
router.patch('/keys', protect, async (req, res, next) => {
  try {
    const { publicKey, keyFingerprint } = req.body;
    if (!publicKey) {
      return res.status(400).json({ message: 'publicKey is required.' });
    }

    req.user.publicKey = publicKey;
    req.user.keyFingerprint = keyFingerprint || req.user.keyFingerprint;
    await req.user.save();

    res.status(200).json({ message: 'Public key saved.', user: req.user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
