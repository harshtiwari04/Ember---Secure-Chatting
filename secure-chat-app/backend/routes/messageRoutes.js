/**
 * routes/messageRoutes.js
 * --------------------------
 * REST endpoint for conversation history. New message delivery happens via
 * Socket.io - see backend/socket/socketHandler.js.
 */

const express = require('express');
const { getConversation } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/:userId', protect, getConversation);

module.exports = router;
