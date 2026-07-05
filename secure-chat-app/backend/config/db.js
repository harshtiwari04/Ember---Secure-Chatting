/**
 * db.js
 * -----
 * Establishes the connection to MongoDB using Mongoose.
 * Kept separate from server.js so it can be imported/tested independently.
 */

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`[MongoDB] Connected: ${conn.connection.host}/${conn.connection.name}`);

    // Helpful runtime visibility into connection health
    mongoose.connection.on('error', (err) => {
      console.error('[MongoDB] Connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB] Disconnected.');
    });
  } catch (error) {
    console.error(`[MongoDB] Initial connection failed: ${error.message}`);
    // Fail fast: without a DB there is nothing useful the server can do.
    process.exit(1);
  }
};

module.exports = connectDB;
