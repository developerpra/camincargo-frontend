import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'], // or any static file you want cached
      manifest: {
        name: 'Hello World App',
        short_name: 'HelloWorld',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        description: 'Simple React Hello World',
        icons: []
      }
    })
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
