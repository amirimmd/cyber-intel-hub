import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path' // [FIX] Import path module

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // [FIX] Add build target for import.meta.env
  build: {
    target: 'es2020',
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020',
    },
  },

  // [FIX] Add alias for '@' pointing to 'src'
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

