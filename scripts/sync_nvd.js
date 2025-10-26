// مسیر فایل: scripts/sync_nvd.js
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import 'dotenv/config'; // برای بارگیری متغیرها از .env در اجرای محلی
import pLimit from 'p-limit'; // برای مدیریت همزمانی درخواست‌ها
import zlib from 'zlib'; // [جدید] برای باز کردن فایل‌های .gz
import { promisify } from 'util'; // [جدید] برای تبدیل zlib.gunzip به Promise

// [جدید] تابع gunzip را به نسخه Promise تبدیل می‌کنیم
const gunzip = promisify(zlib.gunzip);

// [!!!] ویرایش: تغییر به jsDelivr CDN برای جلوگیری از خطای 404
// به جای: 'https://raw.githubusercontent.com/fkie-cad/nvd-json-data-feeds/main'
const NVD_BASE_URL = 'https://cdn.jsdelivr.net/gh/fkie-cad/nvd-json-data-feeds@main';

const NVD_RECENT_URL = `${NVD_BASE_URL}/nvdcve-1.1-recent.json.gz`;
const NVD_MODIFIED_URL = `${NVD_BASE_URL}/nvdcve-1.1-modified.json.gz`;

// [جدید] اضافه کردن تمام فایل‌های سالانه برای همگام‌سازی کامل تاریخی
const START_YEAR = 2002;
const currentYear = new Date().getFullYear();
const yearlyUrls = [];
for (let year = START_YEAR; year <= currentYear; year++) {
  yearlyUrls.push(`${NVD_BASE_URL}/nvdcve-1.1-${year}.json.gz`);
}

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
// [!!!] ویرایش: کاهش همزمانی برای جلوگیری از خطای CDN
const limit = pLimit(5);

/**
 * [جدید] تابع کمکی برای واکشی و باز کردن فایل .gz
 */
async function fetchAndDecompress(url) {
  console.log(`::INFO:: Fetching data from ${url}...`);
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Node.js-Sync-Script'
    }
  });

  if (!response.ok) {
    // اگر فایلی موجود نبود (مثلا فایل سال جاری هنوز ساخته نشده)، فقط یک هشدار میدهیم
    if (response.status === 404) {
      console.warn(`::WARN:: File not found (404): ${url}. Skipping this file.`);
      return null; // بازگشت null تا در ادامه از آن صرف نظر شود
    }
    console.error(`::ERROR:: Fetch failed for ${url}. Status: ${response.status} ${response.statusText}`);
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  
  const compressedData = await response.arrayBuffer();
  const buffer = Buffer.from(compressedData);
  const decompressedData = await gunzip(buffer);
  return JSON.parse(decompressedData.toString());
}

/**
 * داده‌های NVD JSON را واکشی و پردازش می‌کند
 */
async function syncNVD() {
  console.log('::INFO:: Starting NVD sync (Full Historical + Recent + Modified)...');
  
  try {
    // [!!!] ویرایش: تمام URL ها (سالانه + اخیر + اصلاح شده) را واکشی می‌کنیم
    const allUrlsToFetch = [
      ...yearlyUrls, // ابتدا تاریخی
      NVD_MODIFIED_URL, // سپس اصلاح شده
      NVD_RECENT_URL      // در آخر جدیدترین‌ها (تا داده‌های تکراری را بازنویسی کنند)
    ];

    console.log(`::INFO:: Fetching ${allUrlsToFetch.length} data feeds...`);

    // از Promise.allSettled استفاده می‌کنیم تا اگر یک فایل (مثلا سال جاری) 404 داد، کل فرآیند متوقف نشود
    // [!!!] ویرایش: تابع limit را به واکشی‌ها اضافه می‌کنیم تا درخواست‌های شبکه را محدود کند
    const results = await Promise.allSettled(allUrlsToFetch.map(url => limit(() => fetchAndDecompress(url))));

    const allCveItems = new Map();

    for (const result of results) {
      // فقط نتایج موفقیت آمیز و غیر null را پردازش می‌کنیم
      if (result.status === 'fulfilled' && result.value && result.value.CVE_Items) {
        const items = result.value.CVE_Items;
        console.log(`::INFO:: Processing ${items.length} items from a feed...`);
        
        for (const item of items) {
          if (item.cve?.CVE_data_meta?.ID) {
            // چون فایل‌های جدیدتر در آخر لیست هستند، به طور خودکار داده‌های قدیمی‌تر را در Map بازنویسی می‌کنند
            allCveItems.set(item.cve.CVE_data_meta.ID, item);
          }
        }
      } else if (result.status === 'rejected') {
        // خطاهایی که 404 نبودند را لاگ می‌کنیم
        console.warn(`::WARN:: Failed to process a feed: ${result.reason?.message || 'Unknown Error'}`);
      }
    }

    const cveItems = Array.from(allCveItems.values());
    console.log(`::INFO:: Total unique CVEs to process: ${cveItems.length}`);
    
    if (cveItems.length === 0) {
      console.log('::INFO:: No CVE items found. Sync complete.');
      return; 
    }

    // 2. پردازش و نگاشت داده‌ها (بدون تغییر)
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

    // 3. درج داده‌ها در Supabase (بدون تغییر)
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



