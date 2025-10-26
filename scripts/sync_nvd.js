// مسیر فایل: scripts/sync_nvd.js
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import 'dotenv/config'; // برای بارگیری متغیرها از .env در اجرای محلی
import pLimit from 'p-limit'; // برای مدیریت همزمانی درخواست‌ها

// URL منبع داده NVD
const NVD_JSON_URL = 'https://raw.githubusercontent.com/fkie-cad/nvd-json-data-feeds/main/data/nvdcve-1.1-modified.json';

// دریافت متغیرهای محیطی
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('::ERROR:: SUPABASE_URL or SUPABASE_SERVICE_KEY is not set.');
  process.exit(1);
}

// مقداردهی اولیه Supabase Client با Service Key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// محدود کردن تعداد درخواست‌های همزمان به Supabase
const limit = pLimit(10); 

/**
 * داده‌های NVD JSON را واکشی و پردازش می‌کند
 */
async function syncNVD() {
  console.log('::INFO:: Starting NVD sync...');
  
  try {
    // 1. واکشی داده‌های JSON
    console.log(`::INFO:: Fetching data from ${NVD_JSON_URL}...`);
    const response = await fetch(NVD_JSON_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch JSON: ${response.statusText}`);
    }
    const nvdData = await response.json();
    
    if (!nvdData.CVE_Items || nvdData.CVE_Items.length === 0) {
      throw new Error('::ERROR:: NVD data format is invalid or empty. CVE_Items not found.');
    }

    const cveItems = nvdData.CVE_Items;
    console.log(`::INFO:: Found ${cveItems.length} CVEs. Processing...`);

    // 2. پردازش و نگاشت داده‌ها
    // بر اساس کامپوننت React، شما به: id, description, severity, base_score, published_date, cwe نیاز دارید
    
    const vulnerabilitiesToInsert = cveItems.map(item => {
      const cveId = item.cve?.CVE_data_meta?.ID || 'N/A';
      const description = item.cve?.description?.description_data?.[0]?.value || 'No description available.';
      const publishedDate = item.publishedDate || new Date().toISOString();
      
      // استخراج داده‌های CVSS V3 (یا V2 به عنوان جایگزین)
      let baseScore = 0;
      let severity = 'UNKNOWN';
      if (item.impact?.baseMetricV3) {
        baseScore = item.impact.baseMetricV3.cvssV3?.baseScore || 0;
        severity = item.impact.baseMetricV3.cvssV3?.baseSeverity || 'UNKNOWN';
      } else if (item.impact?.baseMetricV2) {
        baseScore = item.impact.baseMetricV2.cvssV2?.baseScore || 0;
        severity = item.impact.baseMetricV2.severity || 'UNKNOWN';
      }
      
      // استخراج CWE
      const cwe = item.cve?.problemtype?.problemtype_data?.[0]?.description?.[0]?.value || 'N/A';

      return {
        id: cveId, // فرض می‌کنیم ستون 'id' شما از نوع متنی (TEXT) و کلید اصلی (Primary Key) است
        description: description,
        severity: severity,
        base_score: baseScore,
        published_date: publishedDate,
        cwe: cwe
      };
    });

    // 3. درج داده‌ها در Supabase
    // داده‌ها را به دسته‌های (chunks) 500 تایی تقسیم می‌کنیم تا Supabase دچار مشکل نشود
    const chunkSize = 500;
    console.log(`::INFO:: Upserting ${vulnerabilitiesToInsert.length} vulnerabilities in chunks of ${chunkSize}...`);
    
    let allPromises = [];

    for (let i = 0; i < vulnerabilitiesToInsert.length; i += chunkSize) {
      const chunk = vulnerabilitiesToInsert.slice(i, i + chunkSize);
      
      // هر دسته را به عنوان یک Promise به pLimit اضافه می‌کنیم
      allPromises.push(limit(async () => {
        console.log(`::INFO:: Upserting chunk ${i / chunkSize + 1}...`);
        
        // از 'upsert' استفاده می‌کنیم تا رکوردهای موجود بر اساس 'id' به‌روزرسانی شوند
        const { error } = await supabase
          .from('vulnerabilities') // نام جدول شما
          .upsert(chunk, { onConflict: 'id' }); // 'id' باید کلید اصلی باشد

        if (error) {
          console.error(`::ERROR:: Supabase upsert failed for chunk ${i / chunkSize + 1}:`, error);
          // در صورت خطا، آن را لاگ می‌کنیم اما ادامه می‌دهیم
        }
      }));
    }

    // منتظر می‌مانیم تا تمام دسته‌ها پردازش شوند
    await Promise.all(allPromises);

    console.log('::SUCCESS:: NVD sync completed.');
    
  } catch (error) {
    console.error('::FATAL:: An error occurred during NVD sync:', error.message);
    process.exit(1);
  }
}

// اجرای اسکریپت
syncNVD();


