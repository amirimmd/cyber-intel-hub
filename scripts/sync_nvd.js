/**
 * NVD Data Sync Script
 *
 * This script fetches CVE data from the NVD API 2.0
 * (services.nvd.nist.gov/rest/json/cves/2.0)
 * and upserts it into a Supabase database.
 *
 * *** FIX: Date formatting, User-Agent, and improved Retry Logic for NVD 404/WAF issues ***
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import fetch from 'node-fetch';

// --- Configuration ---

// Supabase config
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('::FATAL:: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables.');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// NVD API configuration
const NVD_API_KEY = process.env.NVD_API_KEY;
if (!NVD_API_KEY) {
  console.error('::FATAL:: Missing NVD_API_KEY environment variable.');
  process.exit(1);
}

const API_URL = 'https://services.nvd.nist.gov/rest/json/cves/2.0';

const RESULTS_PER_PAGE = 2000; // API 2.0 max is 2000
const START_YEAR = 2016;
const CURRENT_YEAR = new Date().getFullYear();
const RATE_LIMIT_DELAY_MS = 6000; // 6 seconds (API 2.0: 50 reqs/30s w/ key)
const MAX_RETRIES = 5; // Increased retries for stability
const MAX_DATE_RANGE_DAYS = 120; // NVD API limit

// Tables
const NVD_TABLE = 'vulnerabilities'; // User's table name
const METADATA_TABLE = 'metadata';
const LAST_SYNC_KEY = 'nvdLastSyncTimestamp';

// --- Helpers ---

/**
 * NVD API backend is notoriously strict and sometimes returns 404 for valid ISO dates
 * if the milliseconds format triggers a regex fail in their gateway.
 * This function forces a perfectly safe ISO format ending in .000Z
 */
function formatNvdDate(dateObj) {
  return dateObj.toISOString().replace(/\.\d{3}Z$/, '.000Z');
}

// --- Main Execution ---

async function main() {
  try {
    const runAll = process.argv.includes('--all');
    if (runAll) {
      await syncAllData();
    } else {
      await syncNewData();
    }
    console.log('::INFO:: NVD Sync process completed successfully.');
  } catch (error) {
    console.error(`::FATAL:: An error occurred during NVD sync: ${error.message}`);
    process.exit(1);
  }
}

async function syncNewData() {
  console.log(`::INFO:: Starting NVD sync for new data (${CURRENT_YEAR}+)...`);

  const lastSyncStr = await getLastSyncTimestamp();
  let startDate = new Date(lastSyncStr || (Date.now() - 120 * 24 * 60 * 60 * 1000));
  const finalEndDate = new Date(); // Today

  console.log(`::INFO:: Catching up modified data from ${formatNvdDate(startDate)} to ${formatNvdDate(finalEndDate)}`);

  while (startDate < finalEndDate) {
    let endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + MAX_DATE_RANGE_DAYS);

    if (endDate > finalEndDate) {
      endDate = finalEndDate;
    }

    const safeStartDate = formatNvdDate(startDate);
    const safeEndDate = formatNvdDate(endDate);

    console.log(`\n::INFO:: Syncing chunk: ${safeStartDate} to ${safeEndDate}`);

    const params = {
      lastModStartDate: safeStartDate,
      lastModEndDate: safeEndDate,
    };

    await fetchAndProcessPages(params, `modified data chunk`);

    // Save timestamp to resume safely if interrupted
    await updateLastSyncTimestamp(safeEndDate);

    startDate = new Date(endDate);
  }

  console.log('::INFO:: All new/modified data chunks synced.');
}

async function syncAllData() {
  console.log(`::INFO:: Starting FULL NVD sync from ${START_YEAR} to ${CURRENT_YEAR}...`);

  for (let year = START_YEAR; year <= CURRENT_YEAR; year++) {
    console.log(`\n::INFO:: Fetching data for year ${year}...`);

    const startDate = `${year}-01-01T00:00:00.000Z`;
    const endDateRaw = new Date(`${year}-12-31T23:59:59.000Z`);
    const endDate = formatNvdDate(endDateRaw > new Date() ? new Date() : endDateRaw);

    const params = {
      pubStartDate: startDate,
      pubEndDate: endDate,
    };

    await fetchAndProcessPages(params, `year ${year}`);

    if (year === CURRENT_YEAR) {
      await updateLastSyncTimestamp(endDate);
    }
  }
  console.log('\n::INFO:: Full NVD sync complete.');
}

async function fetchAndProcessPages(baseParams, logContext) {
  let startIndex = 0;
  let totalResults = 0;
  let processedCount = 0;

  try {
    do {
      console.log(`::INFO:: Fetching NVD page (start index: ${startIndex}) for ${logContext}...`);

      const url = new URL(API_URL);
      Object.entries(baseParams).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
      
      url.searchParams.append('resultsPerPage', RESULTS_PER_PAGE);
      url.searchParams.append('startIndex', startIndex);

      const data = await fetchNVDPageWithRetry(url, startIndex);

      if (!data || !data.vulnerabilities) {
        console.warn(`::WARN:: No data or vulnerabilities found for index ${startIndex}.`);
        break;
      }

      if (totalResults === 0) {
        totalResults = data.totalResults || 0;
        console.log(`::INFO:: Found ${totalResults} total vulnerabilities for ${logContext}.`);
        if (totalResults === 0) break;
      }

      const cves = data.vulnerabilities.map(transformCve);
      if (cves.length > 0) {
        await upsertData(cves);
        processedCount += cves.length;
        console.log(`::INFO:: Processed ${processedCount} of ${totalResults} vulnerabilities...`);
      }

      startIndex += RESULTS_PER_PAGE;

      // Rate limiting safeguard
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));

    } while (startIndex < totalResults);

    console.log(`::INFO:: Successfully processed all ${totalResults} vulnerabilities for ${logContext}.`);

  } catch (error) {
    console.error(`::ERROR:: Failed processing page for ${logContext} at index ${startIndex}: ${error.message}`);
    throw error; 
  }
}

async function fetchNVDPageWithRetry(url, index) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url.toString(), {
        headers: {
          'apiKey': NVD_API_KEY,
          'User-Agent': 'VulnSight-AutoSync/2.1' // Crucial to prevent WAF blocks
        }
      });

      if (response.ok) {
        return await response.json();
      }

      // Handle common NVD gateway errors (403, 404, 50x)
      if ([403, 404, 502, 503, 504].includes(response.status)) {
        console.warn(`::WARN:: NVD API Gateway Issue (Status ${response.status}). Retrying in ${RATE_LIMIT_DELAY_MS * attempt}ms...`);
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS * attempt));
      } else {
        throw new Error(`Failed to fetch NVD data: ${response.status} ${response.statusText}`);
      }

    } catch (error) {
      console.error(`::ERROR:: Network/Fetch error for index ${index} (Attempt ${attempt}/${MAX_RETRIES}): ${error.message}`);
      if (attempt === MAX_RETRIES) {
        throw error; 
      }
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS * attempt));
    }
  }
}

function parseVectorString(vectorString) {
  const components = {};
  if (!vectorString) return components;

  const parts = vectorString.split('/');
  if (parts.length < 2) return components; 

  for (let i = 1; i < parts.length; i++) {
    const [key, value] = parts[i].split(':');
    if (key && value) {
      const lowerKey = key.toLowerCase();
      if (['av', 'ac', 'pr', 'ui', 's', 'c', 'i', 'a'].includes(lowerKey)) {
        components[lowerKey] = value;
      }
    }
  }
  return components;
}

function transformCve(cveItem) {
  const { cve } = cveItem;
  const description = cve.descriptions?.find(d => d.lang === 'en')?.value || 'No description provided.';

  const metricsV31 = cve.metrics?.cvssMetricV31?.[0];
  const metricsV30 = cve.metrics?.cvssMetricV30?.[0];
  const metricsV2 = cve.metrics?.cvssMetricV2?.[0];

  let base_score = null;
  let severity = null;
  let vector_string = null;

  if (metricsV31) {
    base_score = metricsV31.cvssData?.baseScore;
    severity = metricsV31.cvssData?.baseSeverity;
    vector_string = metricsV31.cvssData?.vectorString;
  } else if (metricsV30) {
    base_score = metricsV30.cvssData?.baseScore;
    severity = metricsV30.cvssData?.baseSeverity;
    vector_string = metricsV30.cvssData?.vectorString;
  } else if (metricsV2) {
    base_score = metricsV2.cvssData?.baseScore;
    severity = metricsV2.baseSeverity;
    vector_string = metricsV2.cvssData?.vectorString;
  }

  const vectorComponents = parseVectorString(vector_string);

  return {
    ID: cve.id, 
    text: description, 
    vectorString: vector_string,
    av: vectorComponents.av || null,
    ac: vectorComponents.ac || null,
    pr: vectorComponents.pr || null,
    ui: vectorComponents.ui || null,
    s: vectorComponents.s || null,
    c: vectorComponents.c || null,
    i: vectorComponents.i || null,
    a: vectorComponents.a || null,
    score: base_score, 
    baseSeverity: severity, 
    published_date: cve.published,
  };
}

async function upsertData(data) {
  const { error } = await supabase
    .from(NVD_TABLE)
    .upsert(data, { onConflict: 'ID' }); 

  if (error) {
    console.error('::ERROR:: Failed to upsert data into Supabase:', error.message);
  }
}

async function getLastSyncTimestamp() {
  try {
    const { data, error } = await supabase
      .from(METADATA_TABLE)
      .select('value')
      .eq('key', LAST_SYNC_KEY)
      .limit(1);

    if (error) {
      console.error('::ERROR:: Error fetching last sync timestamp:', error.message);
      return null;
    }
    return data?.[0]?.value || null;
  } catch (error) {
    console.error('::ERROR:: Exception in getLastSyncTimestamp:', error.message);
    return null;
  }
}

async function updateLastSyncTimestamp(timestamp) {
  try {
    const { error } = await supabase
      .from(METADATA_TABLE)
      .upsert({ key: LAST_SYNC_KEY, value: timestamp }, { onConflict: 'key' });

    if (error) {
      console.error('::ERROR:: Error updating last sync timestamp:', error.message);
    } else {
      console.log(`::INFO:: Updated last sync timestamp to ${timestamp}`);
    }
  } catch (error) {
    console.error('::ERROR:: Exception in updateLastSyncTimestamp:', error.message);
  }
}

// --- Start the script ---
main();
