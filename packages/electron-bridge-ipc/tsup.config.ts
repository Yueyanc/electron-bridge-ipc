import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['electron-main/index.ts', 'electron-sandbox/index.ts', 'common/index.ts'],
  splitting: false,
  sourcemap: false,
  minify: true,
  clean: true,
  format: ['esm'],
  dts: {
    resolve: true,
    entry: ['electron-main/index.ts', 'electron-sandbox/index.ts', 'common/index.ts'],
  },
})
