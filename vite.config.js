import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// On GitHub Pages the app is served from /<repo>/, so use that base for
// production builds while keeping local dev at the root.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/bet-advisor/' : '/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    open: true,
  },
}))
