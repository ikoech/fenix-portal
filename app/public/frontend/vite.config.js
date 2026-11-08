import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    proxy: {
      '/wp-json': {
        target: loadEnv(mode, process.cwd(), '').WORDPRESS_PROXY_TARGET || 'http://fenix-portal.local',
        changeOrigin: true,
      }
    }
  }
}))