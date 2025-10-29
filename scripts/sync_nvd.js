// مسیر فایل: scripts/sync_nvd.js

/*
 * این اسکریپت برای همگام‌سازی داده‌های NVD با Supabase استفاده می‌شود.
 * بر اساس درخواست کاربر، فقط آسیب‌پذیری‌هایی که از ابتدای سال 2025 منتشر شده‌اند،
 * واکشی و در دیتابیس (vulnerabilities) ذخیره می‌شوند تا داده‌های دستی (2016-2024) دستکاری نشوند.
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import 'dotenv/config'; 
import pLimit from 'p-limit'; // برای محدود کردن درخواست‌های همزمان

// --- Configuration ---
const NVD_API_URL = 'https://services.nvd.nist.gov/rest/json/cves/2.0';
// فقط آسیب‌پذیری‌های منتشر شده از 2025/01/01T00:00:00.000Z را واکشی کن
const START_DATE_FILTER = '2025-01-01T00:00:00.000Z'; 
const MAX_RESULTS_PER_PAGE = 2000; // حداکثر مجاز NVD API

// --- Environment Variables & Supabase Client ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('::ERROR:: SUPABASE_URL or SUPABASE_SERVICE_KEY is not set.');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// --- Helper Functions ---

/**
 * داده‌های CVSS v3.1 را از یک ورودی آسیب‌پذیری استخراج می‌کند.
 * @param {object} cveItem - آبجکت یک آسیب‌پذیری NVD
 * @returns {object|null} آبجکتی شامل فیلدهای CVSS مورد نیاز یا null
 */
function extractCvssV31Metrics(cveItem) {
    // 1. یافتن توضیحات انگلیسی
    const description = cveItem.descriptions.find(desc => desc.lang === 'en')?.value || 'No English description available.';

    // 2. یافتن CVSS v3.1 Metric
    if (!cveItem.metrics || !cveItem.metrics.cvssMetricV31) {
        // اگر CVSS v3.1 موجود نبود، ردیف را نادیده بگیر 
        // در غیر این صورت ممکن است در فرانت اند، فیلدهای مورد نیاز را نداشته باشیم
        // console.warn(`::WARN:: Skipping CVE ${cveItem.id}: No CVSS V3.1 data found.`);
        return null; 
    }

    const metric = cveItem.metrics.cvssMetricV31[0]; // همیشه اولین متریک v3.1 را انتخاب کنید
    const data = metric.cvssData;

    // استخراج Impact Score و Base Severity از CVSS
    const score = data.baseScore;
    const baseSeverity = metric.baseSeverity; 

    // استخراج بردارها از رشته بردار CVSS برای پر کردن ستون‌های جداگانه (av, ac, pr, ...)
    const vectorParts = data.vectorString.match(/([A-Z]{1}):([A-Z]{1,3})/g);
    const vectorMap = {};
    if (vectorParts) {
        vectorParts.forEach(part => {
            const [key, value] = part.split(':');
            vectorMap[key.toLowerCase()] = value;
        });
    }

    return {
        ID: cveItem.id,
        text: description,
        published_date: cveItem.published, // ISO 8601 format
        score: score,
        baseSeverity: baseSeverity,
        vectorString: data.vectorString,
        
        // استخراج فیلدهای CVSS از روی رشته بردار (بر اساس schema جدول vulnerabilities)
        av: vectorMap.av || null, // Attack Vector
        ac: vectorMap.ac || null, // Attack Complexity
        pr: vectorMap.pr || null, // Privileges Required
        ui: vectorMap.ui || null, // User Interaction
        s: vectorMap.s || null, // Scope
        c: vectorMap.c || null, // Confidentiality Impact
        i: vectorMap.i || null, // Integrity Impact
        a: vectorMap.a || null, // Availability Impact
    };
}


/**
 * واکشی داده‌ها از NVD API با پشتیبانی از صفحه‌بندی
 * @param {number} startIndex - اندیس شروع برای صفحه‌بندی
 * @returns {object} آبجکت نتیجه NVD API شامل totalResults و vulnerabilities
 */
async function fetchNvdPage(startIndex) {
    // pubStartDate فقط تاریخ انتشار را فیلتر می‌کند، نه آخرین به‌روزرسانی را.
    const url = `${NVD_API_URL}?resultsPerPage=${MAX_RESULTS_PER_PAGE}&startIndex=${startIndex}&pubStartDate=${START_DATE_FILTER}`;
    
    // NVD API بدون کلید، محدودیت نرخ بسیار سختگیرانه دارد.
    try {
        console.log(`::INFO:: Fetching NVD page (start index: ${startIndex})...`);
        const response = await fetch(url, {
            headers: { 'Accept': 'application/json' }
        });

        if (response.status === 403) {
             throw new Error("NVD API returned 403 Forbidden. This is often due to rate limiting or missing API key.");
        }
        if (!response.ok) {
            throw new Error(`Failed to fetch NVD data: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`::ERROR:: Network/Fetch error for index ${startIndex}:`, error.message);
        throw error;
    }
}

/**
 * تابع اصلی همگام‌سازی NVD
 */
async function syncNVD() {
  console.log('::INFO:: Starting NVD sync for new data (2025+)...');
  
  let allVulnerabilities = [];
  let totalResults = 0;
  let currentIndex = 0;
  let totalPages = 1;
  let pageCount = 0;
  
  try {
    // 1. واکشی اولین صفحه برای به دست آوردن تعداد کل نتایج
    const firstPage = await fetchNvdPage(0);
    totalResults = firstPage.totalResults || 0;
    
    console.log(`::INFO:: Total vulnerabilities published since ${START_DATE_FILTER}: ${totalResults}`);

    if (totalResults === 0) {
      console.log('::SUCCESS:: No new NVD vulnerabilities (2025+) found to sync.');
      return;
    }

    // 2. پردازش اولین صفحه
    if (firstPage.vulnerabilities) {
        // فیلتر و نگاشت داده‌های صفحه اول
        const processedPage = firstPage.vulnerabilities
            .map(item => extractCvssV31Metrics(item.cve))
            .filter(item => item !== null); // اطمینان از حذف آیتم‌های بدون CVSS معتبر
            
        allVulnerabilities.push(...processedPage);
    }

    // 3. محاسبه تعداد صفحات باقی‌مانده و واکشی همزمان (با احتیاط)
    totalPages = Math.ceil(totalResults / MAX_RESULTS_PER_PAGE);
    console.log(`::INFO:: Total pages to fetch: ${totalPages}.`);
    
    // اگر فقط یک صفحه وجود دارد، نیازی به حلقه‌زنی نیست.
    if (totalPages > 1) {
        pageCount = 1; // صفحه اول را قبلا گرفتیم
        currentIndex = MAX_RESULTS_PER_PAGE;
        const fetchPromises = [];
        
        // محدود کردن درخواست‌های همزمان (برای احترام به محدودیت نرخ NVD - بسیار مهم)
        // از p-limit(1) و تأخیر برای جلوگیری از مسدود شدن IP در GitHub Actions استفاده می‌کنیم.
        const limit = pLimit(1); 
        
        while (currentIndex < totalResults) {
            const pageIndex = currentIndex;
            
            // تأخیر عمدی 5 ثانیه‌ای بین درخواست‌ها
            await new Promise(resolve => setTimeout(resolve, 5000)); 

            fetchPromises.push(limit(async () => {
                console.log(`::INFO:: Fetching page ${pageCount + 1}/${totalPages} (Index: ${pageIndex})...`);
                const pageData = await fetchNvdPage(pageIndex);
                
                if (pageData.vulnerabilities) {
                    return pageData.vulnerabilities
                        .map(item => extractCvssV31Metrics(item.cve))
                        .filter(item => item !== null);
                }
                return [];
            }));

            currentIndex += MAX_RESULTS_PER_PAGE;
            pageCount++;
        }
        
        const remainingResults = await Promise.all(fetchPromises);
        remainingResults.forEach(resultArray => {
            allVulnerabilities.push(...resultArray);
        });
    }

    // 4. درج/به‌روزرسانی داده‌ها در Supabase
    const vulnerabilitiesToUpsert = allVulnerabilities;
    
    console.log(`::INFO:: Upserting ${vulnerabilitiesToUpsert.length} processed vulnerabilities into Supabase...`);
    
    // از upsert استفاده می‌کنیم تا رکوردهای موجود (که ID آنها با 2025 شروع می‌شود) به روز شوند و رکوردهای جدید اضافه شوند.
    // این کار تضمین می‌کند که داده‌های 2016-2024 دستکاری نمی‌شوند.
    const { error } = await supabase
      .from('vulnerabilities') 
      .upsert(vulnerabilitiesToUpsert, { 
          onConflict: 'ID', // 'ID' کلید اصلی برای جلوگیری از تکرار است
          ignoreDuplicates: false // به روز رسانی رکورد موجود در صورت تغییر
      }); 

    if (error) {
      console.error('::ERROR:: Supabase upsert failed:', error);
      throw error;
    }

    console.log('::SUCCESS:: NVD sync completed successfully. Total records upserted:', vulnerabilitiesToUpsert.length);
    
  } catch (error) {
    console.error('::FATAL:: An error occurred during NVD sync:', error.message);
    process.exit(1);
  }
}

// اجرای اسکریپت
syncNVD();
