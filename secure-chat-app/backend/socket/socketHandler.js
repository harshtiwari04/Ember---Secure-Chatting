/**
 * socket/socketHandler.js
 * --------------------------
 * All real-time behaviour lives here:
 *   - authenticated connection (reads the same httpOnly JWT cookie as REST)
 *   - online/offline presence broadcasting
 *   - private messaging (the server only ever relays ciphertext + iv)
 *   - typing indicators
 *   - read receipts
 *   - graceful disconnect handling
 *
 * The server is intentionally "blind": it never sees plaintext, never has
 * decryption keys, and its only job with message content is to persist the
 * ciphertext blob and forward it to the right socket.
 */

const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const User = require('../models/User');
const Message = require('../models/Message');

// userId (string) -> Set of socket ids. A user can have multiple tabs/devices open.
const onlineUsers = new Map();

function addOnlineSocket(userId, socketId) {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socketId);
}

function removeOnlineSocket(userId, socketId) {
  const set = onlineUsers.get(userId);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) onlineUsers.delete(userId);
}

function isOnline(userId) {
  return onlineUsers.has(userId);
}

/**
 * Middleware-style auth check run once per new socket connection.
 * Reads the same httpOnly cookie used by the REST API, so login state is
 * shared automatically between HTTP and WebSocket without a second login step.
 */
async function authenticateSocket(socket, next) {
  try {
    const rawCookie = socket.handshake.headers.cookie;
    if (!rawCookie) return next(new Error('No auth cookie present.'));

    const parsed = cookie.parse(rawCookie);
    const cookieName = process.env.COOKIE_NAME || 'sc_token';
    const token = parsed[cookieName];
    if (!token) return next(new Error('Not authenticated.'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return next(new Error('User no longer exists.'));

    socket.userId = user._id.toString();
    socket.username = user.username;
    next();
  } catch (err) {
    next(new Error('Socket authentication failed.'));
  }
}

function initSocket(io) {
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const { userId } = socket;
    console.log(`[Socket] ${socket.username} connected (${socket.id})`);

    // --- Presence: join a personal room named after the user's id so we can
    // target them by userId without tracking raw socket ids everywhere else.
    socket.join(userId);
    addOnlineSocket(userId, socket.id);

    // Tell everyone this user just came online, and update lastSeen lazily.
    socket.broadcast.emit('user-online', { userId });

    // Let the newly-connected client know who is already online, so its
    // sidebar status dots are correct immediately without waiting for
    // individual 'user-online' events.
    socket.emit('online-users', { userIds: Array.from(onlineUsers.keys()) });

    /**
     * private-message
     * ----------------
     * payload: { to, ciphertext, iv, tempId }
     * The server persists the ciphertext blob and relays it verbatim to the
     * recipient (if online). `tempId` lets the sender's UI reconcile its
     * optimistic local message with the server-confirmed one.
     */
    socket.on('private-message', async ({ to, ciphertext, iv, tempId }, ack) => {
      try {
        if (!to || !ciphertext || !iv) {
          if (ack) ack({ ok: false, error: 'Malformed message payload.' });
          return;
        }

        const message = await Message.create({
          sender: userId,
          recipient: to,
          ciphertext,
          iv,
          status: isOnline(to) ? 'delivered' : 'sent',
        });

        const payload = {
          _id: message._id,
          sender: userId,
          recipient: to,
          ciphertext,
          iv,
          status: message.status,
          createdAt: message.createdAt,
          tempId,
        };

        // Forward to every socket/tab the recipient has open.
        io.to(to).emit('private-message', payload);

        // Acknowledge back to the sender with the persisted message id/status
        // so their optimistic UI bubble can be reconciled.
        if (ack) ack({ ok: true, message: payload });
      } catch (err) {
        console.error('[Socket] private-message error:', err.message);
        if (ack) ack({ ok: false, error: 'Message could not be delivered.' });
      }
    });

    /** typing / stop-typing: ephemeral, not persisted anywhere. */
    socket.on('typing', ({ to }) => {
      if (to) io.to(to).emit('typing', { from: userId });
    });

    socket.on('stop-typing', ({ to }) => {
      if (to) io.to(to).emit('stop-typing', { from: userId });
    });

    /**
     * read-receipt
     * ------------
     * payload: { from, messageIds }  - "from" is the OTHER user (the
     * original sender of the messages we just read).
     */
    socket.on('read-receipt', async ({ from, messageIds }) => {
      try {
        if (!from || !Array.isArray(messageIds) || messageIds.length === 0) return;

        await Message.updateMany(
          { _id: { $in: messageIds }, sender: from, recipient: userId },
          { $set: { status: 'read' } }
        );

        io.to(from).emit('read-receipt', { by: userId, messageIds });
      } catch (err) {
        console.error('[Socket] read-receipt error:', err.message);
      }
    });

    /** Graceful disconnect: update presence + lastSeen. */
    socket.on('disconnect', async () => {
      removeOnlineSocket(userId, socket.id);
      console.log(`[Socket] ${socket.username} disconnected (${socket.id})`);

      if (!isOnline(userId)) {
        try {
          await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
        } catch (err) {
          console.error('[Socket] failed to update lastSeen:', err.message);
        }
        io.emit('user-offline', { userId, lastSeen: new Date() });
      }
    });
  });
}

module.exports = initSocket;
