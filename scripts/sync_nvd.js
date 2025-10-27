// مسیر فایل: scripts/sync_nvd.js

/*
 * این اسکریپت برای رفع مشکل خطای 403 Forbidden در واکشی داده‌های NVD و
 * به درخواست کاربر (مبنی بر اینکه "فقط از داده‌های آپلود شده استفاده شود")،
 * به طور کامل بازنویسی شده است.
 *
 * تمام منطق واکشی داده‌های خارجی NVD حذف شده است. این اسکریپت اکنون فقط یک پیام
 * موفقیت‌آمیز برمی‌گرداند تا فرآیند GitHub Action را مختل نکند.
 *
 * فرض می‌شود که داده‌های لازم (137000 رکورد) قبلاً توسط کاربر
 * با ستون‌های صحیح (ID, text, score, baseSeverity) در Supabase آپلود شده‌اند.
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config'; // برای بارگیری متغیرها از .env در اجرای محلی

// دریافت متغیرهای محیطی
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

/**
 * تابع همگام‌سازی خالی برای تأیید عملیات.
 * این تابع هیچ عملیات واکشی یا آپسرتی انجام نمی‌دهد.
 */
async function syncNVD() {
  console.log('::INFO:: Starting NVD sync stub...');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('::WARN:: Supabase credentials are not set. Skipping database checks.');
    // ادامه برای جلوگیری از شکست اسکریپت در محیط‌هایی که فقط متغیرهای فرانت‌اند موجود است
  } else {
     // این قسمت صرفا برای حفظ ساختار است.
     // اگر نیاز به بررسی دیتابیس بود، از اینجا می‌توان استفاده کرد.
     // const supabase = createClient(supabaseUrl, supabaseServiceKey);
     // console.log('::INFO:: Supabase client initialized, but no data fetch/upsert required.');
  }

  console.log('::SUCCESS:: NVD sync stub completed. Relying on pre-uploaded data.');
}

// اجرای اسکریپت
syncNVD();
