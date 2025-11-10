import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path' // [FIX] وارد کردن ماژول path

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // [FIX] اضافه کردن resolve.alias برای پشتیبانی از '@'
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // [FIX] اضافه کردن build.target برای پشتیبانی از import.meta.env
  build: {
    target: 'es2020',
  },
  
  // [FIX] اضافه کردن optimizeDeps.esbuildOptions.target
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020',
    },
  },
})
