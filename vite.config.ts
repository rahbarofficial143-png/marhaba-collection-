import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['rz-icon.svg', 'rz-apple-touch-icon.png', 'rz-icon-192.png', 'rz-icon-512.png', 'rz-icon-maskable-512.png'],
        manifest: {
          id: '/?app=razvi-shop',
          name: 'RAZVI SHOP',
          short_name: 'RAZVI SHOP',
          description:
            'RAZVI SHOP - Authentic ethnic and contemporary fashion direct from master weavers. Kishanganj, Bihar, 855108.',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait-primary',
          theme_color: '#9F2089',
          background_color: '#FAF8F5',
          categories: ['shopping', 'lifestyle', 'fashion'],
          icons: [
            {
              src: '/rz-icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/rz-icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/rz-icon-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          skipWaiting: true,
          clientsClaim: true,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api\//],
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              urlPattern: /\/api\/.*/i,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /\/rest\/v1\/.*/i,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
