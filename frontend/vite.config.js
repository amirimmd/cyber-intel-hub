// frontend/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // [FIX] افزودن تارگت es2020 برای پشتیبانی از 'import.meta.env'
  // این کار خطای مربوط به 'es2015' را برطرف می‌کند.
  build: {
    target: 'es2020'
  },
  esbuild: {
    target: 'es2020'
  }
});
