/**
 * middleware/authMiddleware.js
 * -----------------------------
 * Reads the httpOnly JWT cookie, verifies it, and attaches the authenticated
 * user (minus password) to req.user. Any route that needs a logged-in user
 * should be wrapped with `protect`.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function protect(req, res, next) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'sc_token';
    const token = req.cookies?.[cookieName];

    if (!token) {
      return res.status(401).json({ message: 'Not authenticated. Please log in.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: 'User no longer exists.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired session. Please log in again.' });
  }
}

module.exports = { protect };
