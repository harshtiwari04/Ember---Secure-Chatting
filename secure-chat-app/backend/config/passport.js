/**
 * passport.js
 * -----------
 * Configures the Google OAuth2.0 strategy for Passport.js.
 *
 * Flow:
 *  1. User clicks "Continue with Google" on the frontend -> GET /api/auth/google
 *  2. Google redirects back to GET /api/auth/google/callback with a code
 *  3. Passport exchanges the code for a profile (email, name, googleId, avatar)
 *  4. We find-or-create a User document. Google-authenticated users skip the
 *     password + OTP flow because Google has already verified their email.
 *
 * NOTE ON E2EE: Google-authenticated users still need an ECDH key pair before
 * they can send/receive encrypted messages. The frontend detects a missing
 * `publicKey` after a Google login and prompts a one-time "generate my keys"
 * step (see AuthCallback.jsx), then PATCHes it to /api/users/keys.
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase();
        if (!email) {
          return done(new Error('Google account did not return an email address.'), null);
        }

        // 1) Try to find a user already linked to this Google account
        let user = await User.findOne({ googleId: profile.id });

        // 2) Otherwise, try to find a user with the same email (account linking)
        if (!user) {
          user = await User.findOne({ email });
        }

        if (user) {
          // Link the Google account if it wasn't linked yet, and trust the
          // email since Google already verified it.
          user.googleId = user.googleId || profile.id;
          user.isVerified = true;
          user.avatar = user.avatar || profile.photos?.[0]?.value;
          await user.save();
        } else {
          // Brand new user via Google. No password, no OTP needed.
          // `publicKey` stays null until the client generates & uploads an
          // ECDH key pair on first login (see /api/users/keys).
          user = await User.create({
            username: profile.displayName || email.split('@')[0],
            email,
            googleId: profile.id,
            avatar: profile.photos?.[0]?.value,
            isVerified: true,
            authProvider: 'google',
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// We use JWT cookies for session management, not passport sessions, but
// passport still requires serialize/deserialize to be defined when any
// session middleware touches it.
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
