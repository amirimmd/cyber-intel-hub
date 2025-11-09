import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path' // <-- 1. ایمپورت کردن ماژول path

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // --- 2. اضافه کردن بلاک resolve ---
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // --- پایان بلاک ---
  build: {
    target: 'es2020' // (این خط از قبل وجود داشت، فقط برای کامل بودن)
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020' // (این خط از قبل وجود داشت)
    }
  }
})