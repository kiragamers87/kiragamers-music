import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// VITE_BASE=/nombre-repo/ solo para GitHub Pages (proyecto en subruta). Netlify/Vercel: no definir.
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  server: {
    // Permite abrir la app desde el móvil en la misma WiFi (http://TU_IP:5173)
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
})
