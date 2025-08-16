import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@apps': resolve(__dirname, 'apps')
    }
  },
  base: './lamp/',
  build: {
    outDir: 'docs'
  }
})
