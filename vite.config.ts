import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['mask-icon.svg'],
      manifest: {
        name: 'PACTO — Cumple o asume las consecuencias',
        short_name: 'PACTO',
        description: 'Apuestas sociales de cumplimiento de metas',
        theme_color: '#FF5A1F',
        background_color: '#090A0F',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'mask-icon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Nuevo pacto',
            url: '/pacto/nuevo'
          },
          {
            name: 'Subir evidencia',
            url: '/evidencia/nueva'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
