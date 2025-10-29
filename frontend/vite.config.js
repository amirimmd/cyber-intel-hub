// frontend/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// نیازی به 'define' برای متغیرهای import.meta.env نیست.
// Vite به طور خودکار متغیرهایی که با VITE_ شروع می‌شوند را مدیریت می‌کند.
export default defineConfig({
  plugins: [react()],
  // [FIX] اضافه کردن این بخش برای رفع خطای "import.meta"
  // این به Vite می‌گوید که کد را برای مرورگرهای مدرن‌تری (es2020) که
  // import.meta را پشتیبانی می‌کنند، کامپایل کند.
  build: {
    target: 'es2020'
  },
  // [FIX] همچنین برای سرور توسعه (dev server)
  // (این ممکن است برای esbuild در حین 'npm run dev' لازم باشد)
  esbuild: {
    target: 'es2020'
  }
});

