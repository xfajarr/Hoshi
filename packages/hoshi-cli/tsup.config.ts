import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: true,
  target: 'es2022',
  external: ['@solana/web3.js', '@solana/spl-token', '@hoshi/sdk', '@hoshi/engine'],
  banner: {
    js: '#!/usr/bin/env node'
  }
})
