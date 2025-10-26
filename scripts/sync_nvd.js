// مسیر فایل: scripts/sync_nvd.js
// این اسکریپت برای مپ کردن داده‌های NVD به Schema سفارشی شما ویرایش شده است

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import 'dotenv/config'; 
import pLimit from 'p-limit'; 
import zlib from 'zlib'; 
import { promisify } from 'util'; 

const gunzip = promisify(zlib.gunzip);

// مسیر پوشه‌ای که در فایل YML کلون می‌شود
const NVD_BASE_PATH = path.join(process.cwd(), '../nvd-data-repo');

const NVD_RECENT_PATH = path.join(NVD_BASE_PATH, 'nvdcve-1.1-recent.json.gz');
const NVD_MODIFIED_PATH = path.join(NVD_BASE_PATH, 'nvdcve-1.1-modified.json.gz');

const START_YEAR = 2002;
const currentYear = new Date().getFullYear();
const yearlyPaths = [];
for (let year = START_YEAR; year <= currentYear; year++) {
  yearlyPaths.push(path.join(NVD_BASE_PATH, `nvdcve-1.1-${year}.json.gz`));
}

// دریافت متغیرهای محیطی
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('::ERROR:: SUPABASE_URL or SUPABASE_SERVICE_KEY is not set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const limit = pLimit(5);

/**
 * تابع خواندن و باز کردن فایل از دیسک (بدون تغییر)
 */
async function readAndDecompress(filePath) {
  console.log(`::INFO:: Reading data from ${filePath}...`);
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`::WARN:: File not found: ${filePath}. Skipping this file.`);
      return null;
    }
    const compressedData = fs.readFileSync(filePath);
    const decompressedData = await gunzip(compressedData);
    return JSON.parse(decompressedData.toString());
  } catch (err) {
    console.error(`::ERROR:: Failed to read or decompress ${filePath}:`, err.message);
    throw new Error(`Failed to process ${filePath}: ${err.message}`);
  }
}

/**
 * داده‌های NVD JSON را واکشی و پردازش می‌کند
 */
async function syncNVD() {
  console.log('::INFO:: Starting NVD sync (Full Historical + Recent + Modified)...');
  
  try {
    const allPathsToRead = [
      ...yearlyPaths,
      NVD_MODIFIED_PATH,
      NVD_RECENT_PATH
    ];

    console.log(`::INFO:: Reading ${allPathsToRead.length} data feeds sequentially from local clone...`);

    const allCveItems = new Map();

    for (const filePath of allPathsToRead) {
      try {
        const data = await readAndDecompress(filePath);
        if (data && data.CVE_Items) {
          console.log(`::INFO:: Processing ${items.length} items from ${filePath}...`);
          for (const item of items) {
            if (item.cve?.CVE_data_meta?.ID) {
              allCveItems.set(item.cve.CVE_data_meta.ID, item);
            }
          }
        }
      } catch (readError) {
         console.warn(`::WARN:: Failed to process feed ${filePath}: ${readError.message || 'Unknown Error'}`);
      }
    }

    const cveItems = Array.from(allCveItems.values());
    console.log(`::INFO:: Total unique CVEs to process: ${cveItems.length}`);
    
    if (cveItems.length === 0) {
       console.error('::FATAL:: No data could be read from the cloned NVD repository. Halting sync.');
       process.exit(1); 
    }

    // [!!!] ویرایش: نگاشت داده‌ها به Schema سفارشی شما
    const vulnerabilitiesToInsert = cveItems.map(item => {
      const cveId = item.cve?.CVE_data_meta?.ID || 'N/A';
      const description = item.cve?.description?.description_data?.[0]?.value || 'No description available.';
      
      // استخراج تاریخ از داده‌های JSON (قابل اعتمادتر از نام CVE)
      const publishedDate = item.publishedDate || new Date().toISOString();

      const cvssV3 = item.impact?.baseMetricV3?.cvssV3;
      const cvssV2 = item.impact?.baseMetricV2?.cvssV2;

      let vectorString = 'N/A';
      let av = 'N/A';
      let ac = 'N/A';
      let pr = 'N/A';
      let ui = 'N/A';
      let s = 'N/A';
      let c = 'N/A';
      let i = 'N/A';
      let a = 'N/A';
      let score = 0;
      let baseSeverity = 'UNKNOWN';

      if (cvssV3) {
          vectorString = cvssV3.vectorString || 'N/A';
          av = cvssV3.attackVector || 'N/A';
          ac = cvssV3.attackComplexity || 'N/A';
          pr = cvssV3.privilegesRequired || 'N/A';
          ui = cvssV3.userInteraction || 'N/A';
          s = cvssV3.scope || 'N/A';
          c = cvssV3.confidentialityImpact || 'N/A';
          i = cvssV3.integrityImpact || 'N/A';
          a = cvssV3.availabilityImpact || 'N/A';
          score = cvssV3.baseScore || 0;
          baseSeverity = cvssV3.baseSeverity || 'UNKNOWN';
      } else if (cvssV2) {
          // Fallback برای داده‌های V2
          vectorString = cvssV2.vectorString || 'N/A';
          av = cvssV2.accessVector || 'N/A';
          ac = cvssV2.accessComplexity || 'N/A';
          pr = cvssV2.authentication || 'N/A'; 
          ui = cvssV2.userInteraction || 'N/A'; // V2 userInteraction ندارد، اما NVD JSON ممکن است آن را مپ کند
          s = 'N/A'; // V2 scope ندارد
          c = cvssV2.confidentialityImpact || 'N/A';
          i = cvssV2.integrityImpact || 'N/A';
          a = cvssV2.availabilityImpact || 'N/A';
          score = cvssV2.baseScore || 0;
          baseSeverity = item.impact?.baseMetricV2?.severity || 'UNKNOWN';
      }

      return {
          "ID": cveId, // مپ به ستون "ID"
          "text": description, // مپ به ستون "text"
          "vectorString": vectorString,
          "av": av,
          "ac": ac,
          "pr": pr,
          "ui": ui,
          "s": s,
          "c": c,
          "i": i,
          "a": a,
          "score": score,
          "baseSeverity": baseSeverity,
          "published_date": publishedDate // ستون تاریخ برای مرتب‌سازی
      };
    });
    // [!!!] پایان ویرایش

    // 3. درج داده‌ها در Supabase
    const chunkSize = 500;
    console.log(`::INFO:: Upserting ${vulnerabilitiesToInsert.length} vulnerabilities in chunks of ${chunkSize}...`);
    
    let allPromises = [];

    for (let i = 0; i < vulnerabilitiesToInsert.length; i += chunkSize) {
      const chunk = vulnerabilitiesToInsert.slice(i, i + chunkSize);
      
      allPromises.push(limit(async () => {
        console.log(`::INFO:: Upserting chunk ${Math.floor(i / chunkSize) + 1}...`);
        
        const { error } = await supabase
          .from('vulnerabilities') // نام جدول شما
          .upsert(chunk, { onConflict: '"ID"' }); // [!!!] ویرایش: استفاده از ستون "ID" شما برای onConflict

        if (error) {
          // خطاهای رایج:
          // 400 Bad Request: احتمالاً به این دلیل که ستون‌ها در Supabase (فایل SQL) با ستون‌های map شده در اینجا (return {...}) مطابقت ندارند
          console.error(`::ERROR:: Supabase upsert failed for chunk ${Math.floor(i / chunkSize) + 1}:`, error.message);
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

