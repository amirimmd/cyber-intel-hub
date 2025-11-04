// frontend/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // [CRITICAL FIX] تنظیم target به es2020 یا esnext برای پشتیبانی از import.meta.env
  // این کار اخطار "import.meta is not available" را برطرف می‌کند.
  build: {
    target: 'es2020'
  },
  // تنظیم مشابه برای سرور توسعه (dev server)
  esbuild: {
    target: 'es2020'
  }
});
