import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Backend proxy: the browser calls /api/..., Vite forwards to Express in dev.
  // In production the same relative URLs hit the same origin (Vercel rewrites).
  server: {
    proxy: { '/api': 'http://localhost:3001' },
  },
})
