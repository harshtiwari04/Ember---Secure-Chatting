/**
 * vite.config.js
 * ---------------
 * Standard Vite + React setup. The dev server proxy is NOT used for the API
 * (we call the backend directly via VITE_API_URL, see src/api/axios.js) so
 * that cookies + CORS behave exactly like they will in production.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
