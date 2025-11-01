// frontend/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// نیازی به 'define' برای متغیرهای import.meta.env نیست.
// Vite به طور خودکار متغیرهایی که با VITE_ شروع می‌شوند را مدیریت می‌کند.

export default defineConfig({
  plugins: [react()],
  // [CRITICAL FIX] تنظیم target به es2020 یا esnext برای پشتیبانی از import.meta.env
  // این کار اخطار "import.meta is not available in es2015" را برطرف می‌کند.
  build: {
    target: 'es2020'
  },
  // تنظیم مشابه برای سرور توسعه (dev server)
  esbuild: {
    target: 'es2020'
  }
});
