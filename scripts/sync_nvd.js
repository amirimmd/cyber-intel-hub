/**
   * NVD Data Sync Script
   *
   * This script fetches CVE data from the NVD 2.0 API and upserts it into a Supabase database.
   *
   * It supports two modes:
   * 1. Default (npm run sync:nvd): Syncs new/modified data since the last run (or past 120 days).
   * 2. Full Sync (npm run sync:nvd:all): Fetches all data, year by year, from START_YEAR.
   *
   * Note: This script is updated to use the 'api.nvd.nist.gov' endpoint, as the legacy
   * 'services.nvd.nist.gov' (v2.0) and 'nvd.nist.gov/feeds' (v1.1) are deprecated.
   */
  
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import fetch from 'node-fetch';

// --- Configuration ---

// Supabase config
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // FIX: Changed from SUPABASE_KEY
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

// *** VITAL FIX ***
// The old 'services.nvd.nist.gov' endpoint is deprecated and returns 404.
// Using the new, correct NVD API 2.0 endpoint.
const API_URL = 'https://api.nvd.nist.gov/cves/2.0';

const RESULTS_PER_PAGE = 2000; // Max allowed by NVD API
const START_YEAR = 2016; // NVD data is extensive; starting from 2016 is reasonable
const CURRENT_YEAR = new Date().getFullYear();
const RATE_LIMIT_DELAY_MS = 6000; // 6 seconds delay (NVD API w/ key allows 50 reqs/30s)
const MAX_RETRIES = 3;

// Tables
const NVD_TABLE = 'nvd';
const METADATA_TABLE = 'metadata';
const LAST_SYNC_KEY = 'nvdLastSyncTimestamp';

// --- Main Execution ---

/**
 * Main function to run the sync process.
 */
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

/**
 * Fetches all new NVD data since the last sync.
 */
async function syncNewData() {
  console.log(`::INFO:: Starting NVD sync for new data (${CURRENT_YEAR}+)...`);

  // Get last sync timestamp, or default to 120 days ago
  const lastSync = await getLastSyncTimestamp();
  const startDate = new Date(lastSync || (Date.now() - 120 * 24 * 60 * 60 * 1000));
  const endDate = new Date();

  console.log(`::INFO:: Syncing modified data from ${startDate.toISOString()} to ${endDate.toISOString()}`);

  const params = {
    lastModStartDate: startDate.toISOString(),
    lastModEndDate: endDate.toISOString(),
  };

  await fetchAndProcessPages(params, `new/modified data`);

  // Save the new timestamp
  await updateLastSyncTimestamp(endDate.toISOString());
}

/**
 * Fetches and backfills all historical NVD data, year by year.
 * This is rewritten to use the NVD 2.0 API instead of the deprecated 1.1 feeds.
 */
async function syncAllData() {
  console.log(`::INFO:: Starting FULL NVD sync from ${START_YEAR} to ${CURRENT_YEAR}...`);

  for (let year = START_YEAR; year <= CURRENT_YEAR; year++) {
    console.log(`\n::INFO:: Fetching data for year ${year}...`);

    const startDate = `${year}-01-01T00:00:00.000Z`;
    // Ensure the end date doesn't go into the future
    const endDateRaw = new Date(`${year}-12-31T23:59:59.999Z`);
    const endDate = (endDateRaw > new Date() ? new Date() : endDateRaw).toISOString();

    const params = {
      pubStartDate: startDate,
      pubEndDate: endDate,
    };

    await fetchAndProcessPages(params, `year ${year}`);

    // If syncing the current year, update the last sync timestamp
    if (year === CURRENT_YEAR) {
      await updateLastSyncTimestamp(endDate);
    }
  }
  console.log('\n::INFO:: Full NVD sync complete.');
}

/**
 * Generic function to handle fetching and paginating data for a given set of parameters.
 * @param {object} baseParams - The query parameters for the NVD API (e.g., date range).
 * @param {string} logContext - A string for logging (e.g., "year 2024").
 */
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

      // Fetch data
      const data = await fetchNVDPageWithRetry(url, startIndex);

      if (!data || !data.vulnerabilities) {
        console.warn(`::WARN:: No data or vulnerabilities found for index ${startIndex}.`);
        break;
      }

      if (totalResults === 0) {
        totalResults = data.totalResults;
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

      // Respect rate limiting
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));

    } while (startIndex < totalResults);

    console.log(`::INFO:: Successfully processed all ${totalResults} vulnerabilities for ${logContext}.`);

  } catch (error) {
    console.error(`::ERROR:: Failed processing page for ${logContext} at index ${startIndex}: ${error.message}`);
    throw error; // Propagate error up
  }
}

/**
 * Fetches a single page of NVD data with retry logic.
 * @param {URL} url - The URL object to fetch.
 * @param {number} index - The startIndex for logging.
 * @returns {object} The JSON response data.
 */
async function fetchNVDPageWithRetry(url, index) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url.toString(), {
        headers: { 'apiKey': NVD_API_KEY }
      });

      if (response.ok) {
        return await response.json();
      }

      // Handle specific API errors
      if (response.status === 403 || response.status === 503) {
        console.warn(`::WARN:: NVD API rate limiting (Status ${response.status}). Retrying in ${RATE_LIMIT_DELAY_MS * attempt}ms...`);
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS * attempt));
      } else {
        throw new Error(`Failed to fetch NVD data: ${response.status} ${response.statusText}`);
      }

    } catch (error) {
      console.error(`::ERROR:: Network/Fetch error for index ${index} (Attempt ${attempt}/${MAX_RETRIES}): ${error.message}`);
      if (attempt === MAX_RETRIES) {
        throw error; // Re-throw after max retries
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS * attempt));
    }
  }
}

/**
 * Transforms the complex NVD API object into a flat structure for Supabase.
 * @param {object} cveItem - The CVE object from NVD API.
 * @returns {object} A flat object for the database.
 */
function transformCve(cveItem) {
  const { cve } = cveItem;
  const cveId = cve.id;

  // Get description (English only)
  const description = cve.descriptions?.find(d => d.lang === 'en')?.value || 'No description provided.';

  // Get metrics (prefer v3.1, fallback to v3.0, then v2)
  const metricsV31 = cve.metrics?.cvssMetricV31?.[0];
  const metricsV30 = cve.metrics?.cvssMetricV30?.[0];
  const metricsV2 = cve.metrics?.cvssMetricV2?.[0];

  let base_score = null;
  let severity = null;
  let vector_string = null;
  let exploitability_score = null;

  if (metricsV31) {
    base_score = metricsV31.cvssData?.baseScore;
    severity = metricsV31.cvssData?.baseSeverity;
    vector_string = metricsV31.cvssData?.vectorString;
    exploitability_score = metricsV31.exploitabilityScore;
  } else if (metricsV30) {
    base_score = metricsV30.cvssData?.baseScore;
    severity = metricsV30.cvssData?.baseSeverity;
    vector_string = metricsV30.cvssData?.vectorString;
    exploitability_score = metricsV30.exploitabilityScore;
  } else if (metricsV2) {
    base_score = metricsV2.cvssData?.baseScore;
    severity = metricsV2.baseSeverity;
    vector_string = metricsV2.cvssData?.vectorString;
    exploitability_score = metricsV2.exploitabilityScore;
  }

  return {
    cve_id: cveId,
    description: description,
    published_date: cve.published,
    last_modified_date: cve.lastModified,
    base_score: base_score,
    severity: severity,
    vector_string: vector_string,
    exploitability_score: exploitability_score,
    // Store the full JSON for potential future use or detailed view
    full_cve_json: cve,
  };
}

/**
 * Upserts a batch of CVE data into the Supabase table.
 * @param {Array<object>} data - An array of transformed CVE objects.
 */
async function upsertData(data) {
  const { error } = await supabase
    .from(NVD_TABLE)
    .upsert(data, { onConflict: 'cve_id' });

  if (error) {
    console.error('::ERROR:: Failed to upsert data into Supabase:', error.message);
    // Don't throw, just log, to allow the process to continue if possible
  }
}

// --- Metadata Helpers ---

/**
 * Retrieves the last sync timestamp from the metadata table.
 * @returns {string | null} ISO 8601 string of the last sync, or null.
 */
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

/**
 * Updates the last sync timestamp in the metadata table.
 * @param {string} timestamp - ISO 8601 string of the current sync time.
 */
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
