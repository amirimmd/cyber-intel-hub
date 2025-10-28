// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// اضافه کردن این بخش برای تعریف دستی متغیرهای محیطی
const define = {
  'process.env.VITE_HF_API_TOKEN': JSON.stringify(process.env.VITE_HF_API_TOKEN),
};

export default defineConfig({
  plugins: [react()],
  define: define, // اینجا متغیر را تزریق می‌کند
});

