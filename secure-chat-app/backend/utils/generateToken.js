/**
 * utils/generateToken.js
 * -----------------------
 * Issues a JWT for a given user id and sets it as an httpOnly cookie.
 *
 * Using httpOnly cookies (instead of localStorage) means client-side
 * JavaScript can never read the token, which closes off the most common
 * XSS-based token theft vector.
 */

const jwt = require('jsonwebtoken');

function generateToken(res, userId) {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

  res.cookie(process.env.COOKIE_NAME || 'sc_token', token, {
    httpOnly: true, // inaccessible to JavaScript (document.cookie)
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days, keep in sync with JWT_EXPIRES_IN
    path: '/',
  });

  return token;
}

module.exports = generateToken;
