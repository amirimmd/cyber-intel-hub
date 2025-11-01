// frontend/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// نیازی به 'define' برای متغیرهای import.meta.env نیست.
// Vite به طور خودکار متغیرهایی که با VITE_ شروع می‌شوند را مدیریت می‌کند.

export default defineConfig({
  plugins: [react()],
  // [FIX] اطمینان از تنظیم هدف کامپایل به ES2020 یا بالاتر برای پشتیبانی از import.meta.env
  build: {
    target: 'es2020'
  },
  esbuild: {
    target: 'es2020'
  }
});
