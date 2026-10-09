import { defineConfig } from 'vitest/config'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@sub-engine/core/v2': path.resolve(__dirname, 'packages/core/src/v2/index.ts'),
      '@sub-engine/core': path.resolve(__dirname, 'packages/core/src/index.ts'),
      '@sub-engine/pixi': path.resolve(__dirname, 'packages/pixi/src/index.ts'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/benchmarks/**'],
    globals: false,
  },
})
