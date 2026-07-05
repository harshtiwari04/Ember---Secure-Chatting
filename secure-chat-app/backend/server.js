/**
 * server.js
 * ---------
 * Entry point. Wires together Express (REST API), Socket.io (real-time),
 * MongoDB (via config/db.js), and Passport (Google OAuth).
 *
 * Run with:  npm run dev   (nodemon, auto-restarts on file changes)
 *       or:  npm start     (plain node, for production)
 */

require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
require('./config/passport'); // registers the Google strategy as a side effect

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const messageRoutes = require('./routes/messageRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const initSocket = require('./socket/socketHandler');

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// --- Database --------------------------------------------------------------
connectDB();

// --- App / HTTP server / Socket.io ------------------------------------------
const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
    credentials: true, // allow the httpOnly cookie to be sent on the socket handshake
  },
});

// --- Core middleware ---------------------------------------------------------
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true, // allow cookies to be sent cross-origin (frontend on a different port)
  })
);
app.use(express.json({ limit: '2mb' })); // parses JSON bodies; small limit since we never carry files here
app.use(cookieParser());

// --- Health check ------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Routes -------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);

// --- Error handling (must be last) --------------------------------------------
app.use(notFound);
app.use(errorHandler);

// --- Real-time layer -----------------------------------------------------------
initSocket(io);

httpServer.listen(PORT, () => {
  console.log(`[Server] Secure Chat backend listening on http://localhost:${PORT}`);
  console.log(`[Server] Accepting requests from ${CLIENT_URL}`);
});
