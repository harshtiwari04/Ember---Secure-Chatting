/**
 * api/axios.js
 * --------------
 * Preconfigured axios instance for talking to the backend REST API.
 *
 * `withCredentials: true` is essential: it tells the browser to send our
 * httpOnly JWT cookie along with every request, which is how the backend
 * knows who's making the call. Without this flag, the cookie set by
 * /api/auth/login would never actually be attached to later requests.
 */

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
export { API_URL };
