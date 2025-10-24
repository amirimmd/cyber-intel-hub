// scripts/sync_nvd.js
import { createClient } from '@supabase/supabase-js';
    import fetch from 'node-fetch';
    import pLimit from 'p-limit';
    import 'dotenv/config'; // Load .env file (for local testing)

// --- Config ---
// GitHub API URL for the NVD JSON feeds repo
// [FIX]: The path was wrong. Removed '/cve' from the end.
const NVD_REPO_API_URL = 'https://api.github.com/repos/fkie-cad/nvd-json-data-feeds/contents/data';
// Use environment variables from GitHub Secrets (or .env for local)
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error('::ERROR:: SUPABASE_URL or SUPABASE_SERVICE_KEY is not defined.');
      console.error('::INFO:: Make sure to set them in your GitHub Actions secrets.');
      process.exit(1);
    }
    
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: {
            persistSession: false
        }
    });
    
    // Concurrency limit to avoid rate-limiting
    const limit = pLimit(10); 
    
    /**
     * Fetches the content of a JSON file from the NVD GitHub repo
     * @param {string} fileName - e.g., "nvdcve-1.1-modified.json"
     */
    async function fetchNVDFile(fileName) {
  const url = `${NVD_REPO_API_URL}/${fileName}`; // This will now correctly point to .../data/nvdcve-1.1-modified.json
  console.log(`::FETCH:: Attempting to fetch: ${url}`);
  
// ... (Rest of the file is correct) ...
        const response = await fetch(url, {
          headers: { 'Accept': 'application/vnd.github.v3.raw' } // Get raw content
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch ${fileName}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`::SUCCESS:: Fetched and parsed ${fileName}.`);
        return data;
      } catch (error) {
        console.error(`::ERROR:: while fetching ${fileName}:`, error.message);
        return null;
      }
    }
    
    /**
     * Transforms raw NVD data into our flat table structure
     * @param {object} cveItem - A single CVE item from the NVD JSON
     */
    function transformCveData(cveItem) {
  const cve = cveItem.cve;
      if (!cve) return null;
    
      const id = cve.CVE_data_meta?.ID;
  if (!id) return null; // Added check for valid ID

  const description = cve.description?.description_data?.[0]?.value || 'No description provided.';
  
  // [FIX] Updated published date logic to be more robust
  let published;
  try {
    published = new Date(cveItem.publishedDate).toISOString();
  } catch (e) {
    published = new Date().toISOString(); // Fallback
  }

  // Get CVSS v3.1 data, fallback to v3.0, then v2
      const metricsV31 = cveItem.impact?.baseMetricV3;
      const metricsV2 = cveItem.impact?.baseMetricV2;
    
      let base_score = 0;
  let severity = 'UNKNOWN';
      let vector_string = 'N/A';
    
      if (metricsV31?.cvssV3) {
    base_score = metricsV31.cvssV3.baseScore;
        severity = metricsV31.cvssV3.baseSeverity;
        vector_string = metricsV31.cvssV3.vectorString;
      } else if (metricsV2?.cvssV2) {
    base_score = metricsV2.cvssV2.baseScore;
        severity = metricsV2.severity;
        vector_string = metricsV2.cvssV2.vectorString;
      }

  // Get CWE ID
      const cwe = cve.problemtype?.problemtype_data?.[0]?.description?.[0]?.value || 'N/A';
    
      return {
    id,
    description,
    published_date: published,
    last_modified: new Date(cveItem.lastModifiedDate).toISOString(),
    base_score,
        severity,
        vector_string,
        cwe
      };
}

/**
// ... (Rest of the file is correct) ...
     * @param {Array<object>} dataToUpsert - Array of transformed CVE objects
     */
    async function upsertToSupabase(dataToUpsert) {
      if (!dataToUpsert || dataToUpsert.length === 0) {
        console.log('::INFO:: No data to upsert.');
        return;
      }
    
      console.log(`::DB_SYNC:: Attempting to upsert ${dataToUpsert.length} records...`);
      
      const { data, error } = await supabase
        .from('vulnerabilities')
        .upsert(dataToUpsert, {
          onConflict: 'id', // If 'id' (CVE ID) exists, update the row
          ignoreDuplicates: false,
        });
    
      if (error) {
        console.error('::DB_ERROR:: Failed to upsert data:', error.message);
      } else {
        console.log(`::DB_SUCCESS:: Successfully upserted/updated ${dataToUpsert.length} records.`);
      }
    }
    
    /**
     * Main sync function
     */
    async function main() {
  console.log('::JOB_START:: Starting NVD sync process...');
      
      // 1. Fetch the 'modified' feed first
      const modifiedData = await fetchNVDFile('nvdcve-1.1-modified.json');
  let allCves = [];

  if (modifiedData && modifiedData.CVE_Items) {
        allCves.push(...modifiedData.CVE_Items);
      }

  // 2. OPTIONAL: Fetch recent years if you need a fuller sync
      // For this example, we'll just sync the 'modified' file.
      // To sync a full year, uncomment below:
      // const currentYear = new Date().getFullYear();
      // const yearData = await fetchNVDFile(`nvdcve-1.1-${currentYear}.json`);
      // if (yearData && yearData.CVE_Items) {
      //   allCves.push(...yearData.CVE_Items);
  // }

  if (allCves.length === 0) {
        console.log('::INFO:: No CVEs found to process. Exiting.');
        return;
  }

  console.log(`::PROCESS:: Found ${allCves.length} total CVEs to process...`);
    
      // 3. Transform data in parallel
      const transformedData = (await Promise.all(
    allCves.map(cve => limit(() => transformCveData(cve)))
  )).filter(Boolean); // Filter out any null/failed transformations
    
      // 4. Upsert to Supabase
      await upsertToSupabase(transformedData);

  console.log('::JOB_END:: NVD sync process finished.');
    }
    
    main().catch(err => {
      console.error('::FATAL_ERROR::', err);
      process.exit(1);
    });
    

