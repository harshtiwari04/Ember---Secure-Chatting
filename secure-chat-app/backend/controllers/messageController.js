/**
 * controllers/messageController.js
 * -----------------------------------
 * REST endpoints for message HISTORY only. Real-time delivery of NEW
 * messages happens over Socket.io (see socket/socketHandler.js) - REST is
 * just used to hydrate the chat window when a user opens a conversation or
 * reloads the page.
 *
 * Every message returned here is still ciphertext. This server never
 * decrypts anything; decryption happens only in the recipient's browser.
 */

const Message = require('../models/Message');
const mongoose = require('mongoose');

/**
 * GET /api/messages/:userId
 * Returns the full ciphertext history between req.user and :userId,
 * oldest first, and marks any unread messages sent TO the current user as
 * 'read' (since they're about to be displayed).
 */
async function getConversation(req, res, next) {
  try {
    const myId = req.user._id;
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user id.' });
    }

    const messages = await Message.find({
      $or: [
        { sender: myId, recipient: userId },
        { sender: userId, recipient: myId },
      ],
    }).sort({ createdAt: 1 });

    // Mark incoming messages as read now that the recipient is viewing them.
    await Message.updateMany(
      { sender: userId, recipient: myId, status: { $ne: 'read' } },
      { $set: { status: 'read' } }
    );

    res.status(200).json({ messages });
  } catch (err) {
    next(err);
  }
}

module.exports = { getConversation };
