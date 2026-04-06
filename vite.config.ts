import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

/** Absolute social preview image URL for og:image / twitter:image (OG requires absolute URLs). */
function socialShareImagePlugin(): Plugin {
  return {
    name: 'social-share-image',
    transformIndexHtml(html) {
      const siteUrl =
        process.env.VITE_SITE_URL?.replace(/\/$/, '') ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
      const ogImage = siteUrl ? `${siteUrl}/og-image.png` : '/og-image.png'
      return html.replaceAll('__OG_IMAGE__', ogImage)
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    socialShareImagePlugin(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'favicon-16x16.png',
        'favicon-32x32.png',
        'apple-touch-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'og-image.png',
      ],
      manifest: {
        name: 'Incense Timer',
        short_name: 'Incense',
        description:
          'A digital incense stick you can "light" in the browser—a calm ritual without smoke or particulates. Use it instead of burning real incense to cut indoor air pollution while keeping a similar mood and pacing.',
        theme_color: '#1a1410',
        background_color: '#1a1410',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
