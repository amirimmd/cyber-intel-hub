// مسیر فایل: scripts/sync_nvd.js
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import 'dotenv/config'; // برای بارگیری متغیرها از .env در اجرای محلی
import pLimit from 'p-limit'; // برای مدیریت همزمانی درخواست‌ها
import zlib from 'zlib'; // [جدید] برای باز کردن فایل‌های .gz
import { promisify } from 'util'; // [جدید] برای تبدیل zlib.gunzip به Promise

// [جدید] تابع gunzip را به نسخه Promise تبدیل می‌کنیم
const gunzip = promisify(zlib.gunzip);

// [جدید] اکنون هر دو فایل فشرده شده را هدف قرار می‌دهیم
const NVD_RECENT_URL = 'https://raw.githubusercontent.com/fkie-cad/nvd-json-data-feeds/main/data/nvdcve-1.1-recent.json.gz';
const NVD_MODIFIED_URL = 'https://raw.githubusercontent.com/fkie-cad/nvd-json-data-feeds/main/data/nvdcve-1.1-modified.json.gz';

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
 * [جدید] تابع کمکی برای واکشی و باز کردن فایل .gz
 */
async function fetchAndDecompress(url) {
  console.log(`::INFO:: Fetching data from ${url}...`);
  
  // [!!!] ویرایش: یک User-Agent اضافه می‌کنیم.
  // گاهی اوقات سرورها (مانند گیت‌هاب) درخواست‌های بدون User-Agent را مسدود می‌کنند.
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Node.js-Sync-Script'
    }
  });

  if (!response.ok) {
    // [!!!] ویرایش: لاگ خطای بهتری اضافه می‌کنیم
    console.error(`::ERROR:: Fetch failed for ${url}. Status: ${response.status} ${response.statusText}`);
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  
  // داده‌های فشرده را به صورت ArrayBuffer دریافت می‌کنیم
  const compressedData = await response.arrayBuffer();
  // آن را به یک Buffer نود تبدیل می‌کنیم
  const buffer = Buffer.from(compressedData);
  
  // داده‌ها را از حالت فشرده خارج می‌کنیم
  const decompressedData = await gunzip(buffer);
  
  // به JSON پارس کرده و برمی‌گردانیم
  return JSON.parse(decompressedData.toString());
}

/**
 * داده‌های NVD JSON را واکشی و پردازش می‌کند
 */
async function syncNVD() {
  console.log('::INFO:: Starting NVD sync...');
  
  try {
    // 1. [جدید] واکشی و پردازش هر دو فایل
    const nvdRecentData = await fetchAndDecompress(NVD_RECENT_URL);
    const nvdModifiedData = await fetchAndDecompress(NVD_MODIFIED_URL);

    const recentItems = nvdRecentData.CVE_Items || [];
    const modifiedItems = nvdModifiedData.CVE_Items || [];
    console.log(`::INFO:: Found ${recentItems.length} recent CVEs and ${modifiedItems.length} modified CVEs.`);

    // [جدید] از یک Map برای ادغام و حذف موارد تکراری بر اساس ID استفاده می‌کنیم
    const allCveItems = new Map();
    for (const item of recentItems) {
      if (item.cve?.CVE_data_meta?.ID) {
        allCveItems.set(item.cve.CVE_data_meta.ID, item);
      }
    }
    for (const item of modifiedItems) {
        if (item.cve?.CVE_data_meta?.ID) {
            allCveItems.set(item.cve.CVE_data_meta.ID, item);
        }
    }

    const cveItems = Array.from(allCveItems.values());
    console.log(`::INFO:: Total unique CVEs to process: ${cveItems.length}`);
    
    if (cveItems.length === 0) {
      console.log('::INFO:: No CVE items found in recent or modified feeds. Sync complete.');
      return; // خروج از تابع چون داده‌ای برای پردازش نیست
    }

    // 2. پردازش و نگاشت داده‌ها (این بخش بدون تغییر باقی می‌ماند)
    const vulnerabilitiesToInsert = cveItems.map(item => {
      const cveId = item.cve?.CVE_data_meta?.ID || 'N/A';
      const description = item.cve?.description?.description_data?.[0]?.value || 'No description available.';
      const publishedDate = item.publishedDate || new Date().toISOString();
      
      let baseScore = 0;
      let severity = 'UNKNOWN';
      if (item.impact?.baseMetricV3) {
        baseScore = item.impact.baseMetricV3.cvssV3?.baseScore || 0;
        severity = item.impact.baseMetricV3.cvssV3?.baseSeverity || 'UNKNOWN';
      } else if (item.impact?.baseMetricV2) {
        baseScore = item.impact.baseMetricV2.cvssV2?.baseScore || 0;
        severity = item.impact.baseMetricV2.severity || 'UNKNOWN';
      }
      
      const cwe = item.cve?.problemtype?.problemtype_data?.[0]?.description?.[0]?.value || 'N/A';

      return {
        id: cveId,
        description: description,
        severity: severity,
        base_score: baseScore,
        published_date: publishedDate,
        cwe: cwe
      };
    });

    // 3. درج داده‌ها در Supabase (این بخش بدون تغییر باقی می‌ماند)
    const chunkSize = 500;
    console.log(`::INFO:: Upserting ${vulnerabilitiesToInsert.length} vulnerabilities in chunks of ${chunkSize}...`);
    
    let allPromises = [];

    for (let i = 0; i < vulnerabilitiesToInsert.length; i += chunkSize) {
      const chunk = vulnerabilitiesToInsert.slice(i, i + chunkSize);
      
      allPromises.push(limit(async () => {
        console.log(`::INFO:: Upserting chunk ${Math.floor(i / chunkSize) + 1}...`);
        
        const { error } = await supabase
          .from('vulnerabilities') // نام جدول شما
          .upsert(chunk, { onConflict: 'id' }); // 'id' باید کلید اصلی باشد

        if (error) {
          console.error(`::ERROR:: Supabase upsert failed for chunk ${Math.floor(i / chunkSize) + 1}:`, error);
        }
      }));
    }

    await Promise.all(allPromises);

    console.log('::SUCCESS:: NVD sync completed.');
    
  } catch (error) {
    console.error('::FATAL:: An error occurred during NVD sync:', error.message);
    process.exit(1);
  }
}

// اجرای اسکریپت
syncNVD();


