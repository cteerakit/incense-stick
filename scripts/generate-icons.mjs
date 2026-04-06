/**
 * Rasterizes public/favicon.svg into PNG assets for favicon fallbacks, Apple touch, and PWA.
 * Run: npm run generate-icons
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')
const svg = readFileSync(join(publicDir, 'favicon.svg'))

const outputs = [
  ['favicon-16x16.png', 16],
  ['favicon-32x32.png', 32],
  ['apple-touch-icon.png', 180],
  ['pwa-192x192.png', 192],
  ['pwa-512x512.png', 512],
]

for (const [filename, size] of outputs) {
  await sharp(svg).resize(size, size).png().toFile(join(publicDir, filename))
  console.log(`wrote ${filename}`)
}
