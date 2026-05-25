import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/proxy/vatard': {
        target: 'https://limitacions.vatard.com',
        changeOrigin: true,
        rewrite: () => '/api/data',
      },
    },
  },
})
