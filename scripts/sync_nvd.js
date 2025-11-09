/**
 * NVD Data Sync Script
 *
 * This script fetches CVE data from the NVD API 2.0
 * (services.nvd.nist.gov/rest/json/cves/2.0)
 * and upserts it into a Supabase database.
 *
 * This version corrects the API endpoint, parameter names, and places
 * the NVD_API_KEY in the request HEADERS, which is required.
 *
 * *** FIX: This version also handles the 120-day range limit for 'lastModStartDate' ***
 *
 * It supports two modes:
 * 1. Default (npm run sync:nvd): Syncs new/modified data since the last run.
 * 2. Full Sync (npm run sync:nvd:all): Fetches all data, year by year.
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

// *** API FIX ***
const API_URL = 'https://services.nvd.nist.gov/rest/json/cves/2.0';

const RESULTS_PER_PAGE = 2000; // API 2.0 max is 2000
const START_YEAR = 2016;
const CURRENT_YEAR = new Date().getFullYear();
const RATE_LIMIT_DELAY_MS = 6000; // 6 seconds (API 2.0: 50 reqs/30s w/ key)
const MAX_RETRIES = 3;
const MAX_DATE_RANGE_DAYS = 120; // NVD API limit

// Tables
const NVD_TABLE = 'vulnerabilities'; // User's table name
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
 * *** FIX: This function now chunks requests to respect the 120-day limit. ***
 */
async function syncNewData() {
  console.log(`::INFO:: Starting NVD sync for new data (${CURRENT_YEAR}+)...`);

  // Get last sync timestamp, or default to 120 days ago if never synced
  const lastSync = await getLastSyncTimestamp();
  let startDate = new Date(lastSync || (Date.now() - 120 * 24 * 60 * 60 * 1000));
  const finalEndDate = new Date(); // Today

  console.log(`::INFO:: Catching up modified data from ${startDate.toISOString()} to ${finalEndDate.toISOString()}`);

  // Loop in 120-day chunks until we are caught up
  while (startDate < finalEndDate) {
    let endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + MAX_DATE_RANGE_DAYS);

    // Ensure the chunk's end date doesn't go past the final end date
    if (endDate > finalEndDate) {
      endDate = finalEndDate;
    }

    console.log(`\n::INFO:: Syncing chunk: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // API 2.0 Parameter names
    const params = {
      lastModStartDate: startDate.toISOString(),
      lastModEndDate: endDate.toISOString(),
    };

    await fetchAndProcessPages(params, `modified data chunk`);

    // Save the new timestamp *for this chunk*
    // This ensures if the script fails mid-way, it resumes from the last successful chunk
    await updateLastSyncTimestamp(endDate.toISOString());

    // Set the start for the next loop
    startDate = new Date(endDate);
  }

  console.log('::INFO:: All new/modified data chunks synced.');
}

/**
 * Fetches and backfills all historical NVD data, year by year.
 */
async function syncAllData() {
  console.log(`::INFO:: Starting FULL NVD sync from ${START_YEAR} to ${CURRENT_YEAR}...`);

  for (let year = START_YEAR; year <= CURRENT_YEAR; year++) {
    console.log(`\n::INFO:: Fetching data for year ${year}...`);

    const startDate = `${year}-01-01T00:00:00.000Z`;
    // Ensure the end date doesn't go into the future
    const endDateRaw = new Date(`${year}-12-31T23:59:59.999Z`);
    const endDate = (endDateRaw > new Date() ? new Date() : endDateRaw).toISOString();

    // API 2.0 Parameter names
    // Use pubStartDate/pubEndDate for yearly sync
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
  // API 2.0 uses startIndex
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
      // API 2.0 uses 'resultsPerPage' and 'startIndex'
      url.searchParams.append('resultsPerPage', RESULTS_PER_PAGE);
      url.searchParams.append('startIndex', startIndex);

      // Fetch data
      const data = await fetchNVDPageWithRetry(url, startIndex);

      if (!data || !data.vulnerabilities) {
        console.warn(`::WARN:: No data or vulnerabilities found for index ${startIndex}.`);
        break;
      }

      if (totalResults === 0) {
        // API 2.0 uses 'totalResults'
        totalResults = data.totalResults;
        console.log(`::INFO:: Found ${totalResults} total vulnerabilities for ${logContext}.`);
        if (totalResults === 0) break;
      }

      // The CVE structure 'data.vulnerabilities[].cve' seems unchanged
      const cves = data.vulnerabilities.map(transformCve);
      if (cves.length > 0) {
        await upsertData(cves);
        processedCount += cves.length;
        console.log(`::INFO:: Processed ${processedCount} of ${totalResults} vulnerabilities...`);
      }

      // API 2.0: Increment startIndex
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
      // *** API KEY FIX ***
      // NVD API 2.0 requires the apiKey in the HEADERS, not the URL.
      const response = await fetch(url.toString(), {
        headers: {
          'apiKey': NVD_API_KEY
        }
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
 * Parses a CVSS vector string (e.g., "CVSS:3.1/AV:N/AC:L...") into its components.
 * @param {string} vectorString - The CVSS vector string.
 * @returns {object} An object with key-value pairs (e.g., { AV: 'N', AC: 'L' }).
 */
function parseVectorString(vectorString) {
  const components = {};
  if (!vectorString) {
    return components;
  }

  // Remove the prefix (e.g., "CVSS:3.1/")
  const parts = vectorString.split('/');
  if (parts.length < 2) {
    return components; // Not a valid vector
  }

  // Iterate over components
  for (let i = 1; i < parts.length; i++) {
    const [key, value] = parts[i].split(':');
    if (key && value) {
      // Map script keys to schema keys (e.g., 'AV' -> 'av')
      const lowerKey = key.toLowerCase();
      // Only include keys that are in the user's schema
      if (['av', 'ac', 'pr', 'ui', 's', 'c', 'i', 'a'].includes(lowerKey)) {
        components[lowerKey] = value;
      }
    }
  }
  return components;
}

/**
 * Transforms the complex NVD API object into a flat structure for Supabase.
 * @param {object} cveItem - The CVE object from NVD API.
 * @returns {object} A flat object for the database.
 */
function transformCve(cveItem) {
  // API 2.0 structure is { cve: { ... } }
  const { cve } = cveItem;

  // Get description (English only)
  const description = cve.descriptions?.find(d => d.lang === 'en')?.value || 'No description provided.';

  // Get metrics (prefer v3.1, fallback to v3.0, then v2)
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

  // Parse vector components
  const vectorComponents = parseVectorString(vector_string);

  // Map to user's 'vulnerabilities' table
  return {
    ID: cve.id, // 'cve_id' -> 'ID'
    text: description, // 'description' -> 'text'
    vectorString: vector_string, // 'vector_string' -> 'vectorString'
    av: vectorComponents.av || null,
    ac: vectorComponents.ac || null,
    pr: vectorComponents.pr || null,
    ui: vectorComponents.ui || null,
    s: vectorComponents.s || null,
    c: vectorComponents.c || null,
    i: vectorComponents.i || null,
    a: vectorComponents.a || null,
    score: base_score, // 'base_score' -> 'score'
    baseSeverity: severity, // 'severity' -> 'baseSeverity'
    published_date: cve.published,
  };
}

/**
 * Upserts a batch of CVE data into the Supabase table.
 * @param {Array<object>} data - An array of transformed CVE objects.
 */
async function upsertData(data) {
  const { error } = await supabase
    .from(NVD_TABLE)
    .upsert(data, { onConflict: 'ID' }); // Use 'ID' for conflict

  if (error) {
    console.error('::ERROR:: Failed to upsert data into Supabase:', error.message);
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
  } catch (error)
{
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
