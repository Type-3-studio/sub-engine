import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  server: {
    fs: {
      allow: [
        '..',
        path.resolve(__dirname, 'charchter-spritesheets'),
        path.resolve(__dirname, 'PNG Sequences'),
        path.resolve(__dirname, 'PNG Tiles'),
      ],
    },
  },
})
