// frontend/src/App.jsx
// [XAI/SHAP IMPLEMENTATION]
// - Added a new component `ShapVisualization` to render SHAP values.
// - Updated `AIModels` component to support the new XAI model.
// - Created `simulateXaiAnalysis` to return a simulated response with Label, Probability, and SHAP data.
// - Updated `MessageComponent` to receive and render the `ShapVisualization` component.
// - `pendingShapData` state was added to hold SHAP data while the AI response is typing.

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
// Imports switched to CDN (esm.sh) to work in preview environments.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { 
  BrainCircuit, ShieldAlert, Swords, 
  Loader2, Filter, DatabaseZap, Clipboard, 
  User, Database, BarChart2,
  Swords as SwordsIcon,
  Menu, // For desktop sidebar
  X, // For closing sidebar
  Send, // Chat send button
  Bot, // AI icon
  ChevronDown, // For mobile model selector
  Rss, // For NVD Tab
  FileCode // For ExploitDB Tab
} from 'https://esm.sh/lucide-react@0.395.0'; 

// --- Supabase Client (Integrated - No changes) ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://your-project-url.supabase.co"; 
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "your-anon-key";

let supabase;
if (supabaseUrl && supabaseAnonKey && supabaseUrl !== "https://your-project-url.supabase.co") {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log("Supabase client initialized.");
} else {
    console.error(
      "FATAL: Supabase URL or Anon Key is missing or is placeholder. " +
      "Ensure VITE_... variables are set in Vercel and vite.config.js has target: 'es2020'."
    );
    // Mock client to prevent crashing in preview
    supabase = {
        from: () => ({
            select: () => ({
                order: () => ({
                    limit: () => Promise.resolve({ data: [], error: { message: "Supabase not configured" } })
                }),
                eq: () => ({
                   order: () => ({ limit: () => Promise.resolve({ data: [], error: { message: "Supabase not configured" } }) })
                }),
                neq: () => ({
                   order: () => ({ limit: () => Promise.resolve({ data: [], error: { message: "Supabase not configured" } }) })
                }),
                gte: () => ({
                   order: () => ({ limit: () => Promise.resolve({ data: [], error: { message: "Supabase not configured" } }) })
                })
            })
        }),
        channel: () => ({
            on: () => ({
                subscribe: () => ({}),
            }),
            subscribe: () => ({})
        }),
        removeChannel: () => {}
    };
}


// --- Helper Component: CopyButton (No changes) ---
const CopyButton = ({ textToCopy, isId = false }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = (e) => {
        e.stopPropagation(); 
        try {
            const textarea = document.createElement('textarea');
            textarea.value = textToCopy;
            textarea.style.position = 'fixed'; 
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            document.execCommand('copy'); 
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500); 
        } catch (err) {
            console.error('Failed to copy text:', err);
            // Don't use alert()
            const messageBox = document.createElement('div');
            messageBox.textContent = 'Could not copy text. Please try manually.';
            messageBox.className = 'fixed bottom-4 right-4 bg-cyber-red text-dark-bg p-3 rounded-lg shadow-lg z-50';
            document.body.appendChild(messageBox);
            setTimeout(() => document.body.removeChild(messageBox), 3000);
        }
    };

    const buttonClass = isId ? 
        'ml-1 px-1 py-0.5 text-xs rounded transition-all duration-150' : 
        'ml-2 px-2 py-1 text-xs font-mono rounded-full transition-all duration-150 flex-shrink-0';
    
    const baseStyle = copied ? 
        'bg-cyber-green text-dark-bg shadow-lg shadow-cyber-green/50' : 
        'bg-gray-700/50 text-cyber-cyan hover:bg-cyber-cyan/30';

    return (
        <button 
            onClick={handleCopy} 
            title={isId ? `Copy ${textToCopy}` : "Copy full vulnerability description"}
            className={`flex items-center justify-center ${buttonClass} ${baseStyle}`}
        >
            {copied ? (isId ? 'OK' : 'COPIED!') : <Clipboard className="w-3 h-3 inline-block" />}
        </button>
    );
};


// --- NVDTable Component (No changes) ---
const DEFAULT_ROWS_TO_SHOW = 10;
const INITIAL_DATE_FILTER = ''; 
const EARLIEST_MANUAL_DATA_YEAR = '2016-01-01'; 
const DEFAULT_START_DATE_FILTER = '2024-01-01'; 

const SeverityBadge = ({ severity }) => {
  let badgeClass = 'badge-unknown';
  switch (String(severity).toUpperCase()) {
    case 'CRITICAL': badgeClass = 'badge-critical'; break;
    case 'HIGH': badgeClass = 'badge-high'; break;
    case 'MEDIUM': badgeClass = 'badge-medium'; break;
    case 'LOW': badgeClass = 'badge-low'; break;
    case 'NONE': badgeClass = 'badge-low'; break; 
    default: badgeClass = 'badge-unknown'; break;
  }
  return <span className={`severity-badge ${badgeClass}`}>{severity || 'N/A'}</span>;
};

const extractYearFromCveId = (cveId) => {
    const match = cveId?.match(/CVE-(\d{4})-\d+/);
    return match ? parseInt(match[1], 10) : null;
};

const NVDTable = () => {
  const [allData, setAllData] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [filters, setFilters] = useState({ 
    keyword: '', 
    severity: 'all', 
    date: INITIAL_DATE_FILTER 
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value === 'all_dates' ? INITIAL_DATE_FILTER : value }));
  };

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
        const { data, error: fetchError } = await supabase
        .from('vulnerabilities') 
        .select('ID, text, baseSeverity, score, published_date, vectorString') 
        .order('ID', { ascending: false }) 
        .limit(5000); 

        if (fetchError) throw fetchError;
        setAllData(data || []);
    } catch (err) {
        console.error('Error fetching NVD data:', err.message);
        setError(`Database Error: ${err.message}. Check Supabase connection and table column names.`);
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]); 

  const filteredVulnerabilities = useMemo(() => {
    if (loading || error) return [];

    let filtered = allData;
    const { keyword, severity, date } = filters;
    
    const isFilteredOrSearched = keyword.toLowerCase().trim() || severity !== 'all' || date; 

    const lowerKeyword = keyword.toLowerCase().trim();
    if (lowerKeyword) {
        filtered = filtered.filter(cve => 
            cve.ID?.toLowerCase().includes(lowerKeyword) || 
            cve.text?.toLowerCase().includes(lowerKeyword)
        );
    }
    
    if (severity !== 'all') {
        filtered = filtered.filter(cve => 
            String(cve.baseSeverity).toUpperCase() === severity.toUpperCase()
        );
    }

    if (date) {
        const minDate = new Date(date).getTime();

        filtered = filtered.filter(cve => {
            let itemDate = null;
            if (cve.published_date) {
                itemDate = new Date(cve.published_date).getTime();
            } else {
                const cveYear = extractYearFromCveId(cve.ID);
                if (cveYear) {
                    itemDate = new Date(`${cveYear}-01-01T00:00:00Z`).getTime();
                } else {
                    return false; 
                }
            }
            return itemDate >= minDate;
        });
    }
    
    if (!isFilteredOrSearched) {
        return filtered.slice(0, DEFAULT_ROWS_TO_SHOW);
    }

    return filtered;
  }, [allData, loading, error, filters]);
  
  const truncateText = (text) => {
    if (!text) return { display: 'N/A', needsCopy: false };
    const limit = (typeof window !== 'undefined' && window.innerWidth < 640) ? 40 : 150; 
    const needsCopy = text.length > limit;

    if (needsCopy) {
        return { 
            display: text.substring(0, limit) + '...', 
            needsCopy: true 
        };
    }
    return { display: text, needsCopy: false };
  }

  return (
    <div>
      {/* Filter Form */}
      <form onSubmit={(e) => e.preventDefault()} className="mb-6 space-y-4 md:space-y-0 md:flex md:items-end md:space-x-4 md:gap-4">
        <div className="flex-grow">
          <label htmlFor="nvd-keyword" className="block text-sm font-medium text-gray-400 mb-1">Keyword / CVE ID:</label>
          <input 
            type="text" 
            name="keyword" 
            id="nvd-keyword" 
            value={filters.keyword} 
            onChange={handleFilterChange} 
            placeholder="e.g., SQLI, RCE, Apache..." 
            className="cyber-input" 
            disabled={loading || !!error}
          />
        </div>
        <div>
          <label htmlFor="nvd-severity" className="block text-sm font-medium text-gray-400 mb-1">Severity:</label>
          <select 
            name="severity" 
            id="nvd-severity" 
            value={filters.severity} 
            onChange={handleFilterChange} 
            className="cyber-select w-full md:w-48"
            disabled={loading || !!error}
          >
            <option value="all">::ALL::</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
            <option value="NONE">NONE</option>
          </select>
        </div>
        {/* Date Filter */}
        <div>
            <label htmlFor="nvd-date" className="block text-sm font-medium text-gray-400 mb-1">Published After (Estimated):</label>
            {filters.date ? (
                <input 
                    type="date" 
                    name="date" 
                    id="nvd-date" 
                    value={filters.date} 
                    onChange={handleFilterChange} 
                    min={EARLIEST_MANUAL_DATA_YEAR}
                    className="cyber-input w-full md:w-48" 
                    disabled={loading || !!error}
                />
            ) : (
                <select
                    name="date"
                    id="nvd-date"
                    value={INITIAL_DATE_FILTER} 
                    onChange={handleFilterChange}
                    className="cyber-select w-full md:w-48"
                    disabled={loading || !!error}
                >
                    <option value={INITIAL_DATE_FILTER}>::ALL VULNERABILITIES::</option>
                    <option value={DEFAULT_START_DATE_FILTER}>SELECT DATE...</option>
                </select>
            )}
            
            {filters.date === INITIAL_DATE_FILTER && (
                 <button
                    type="button"
                    onClick={() => setFilters(prev => ({ ...prev, date: DEFAULT_START_DATE_FILTER }))} 
                    className="mt-1 text-xs text-cyber-cyan hover:underline"
                 >
                    - Select a specific date -
                 </button>
            )}
            {filters.date !== INITIAL_DATE_FILTER && (
                 <button
                    type="button"
                    onClick={() => setFilters(prev => ({ ...prev, date: INITIAL_DATE_FILTER }))}
                    className="mt-1 text-xs text-cyber-cyan hover:underline"
                 >
                    - Show All -
                 </button>
            )}

        </div>
        <div className="md:flex-shrink-0">
          <button type="button" className="cyber-button w-full md:w-auto flex items-center justify-center bg-gray-600 text-dark-bg cursor-default" disabled={true}>
             <Filter className="w-5 h-5 mr-2" />
             FILTER_APPLIED_
          </button>
        </div>
      </form>

      {/* Message if default limit is applied */}
      {filteredVulnerabilities.length === DEFAULT_ROWS_TO_SHOW && allData.length > DEFAULT_ROWS_TO_SHOW && filters.keyword === '' && filters.severity === 'all' && filters.date === INITIAL_DATE_FILTER && (
          <p className="text-sm text-cyber-cyan/80 mb-4 p-2 bg-cyan-900/10 rounded border border-cyan-500/30 text-center">
              DISPLAYING TOP {DEFAULT_ROWS_TO_SHOW} VULNERABILITIES. USE FILTERS TO SEE ALL {allData.length} RECORDS._
          </p>
      )}

      {/* Horizontal scroll hint for mobile */}
      <p className="md:hidden text-xs text-center text-cyber-cyan/70 mb-2">
        &lt;-- To see more columns, drag the table sideways --&gt;
      </p>

      {/* Results Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="min-w-full divide-y divide-gray-800">
          <thead className="bg-gray-800/50">
            <tr>
              <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-cyber-cyan uppercase tracking-wider min-w-[100px]">CVE ID</th>
              <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-cyber-cyan uppercase tracking-wider min-w-[200px]">Description</th>
              <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-cyber-cyan uppercase tracking-wider">Severity</th>
              <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-cyber-cyan uppercase tracking-wider">Score</th>
              <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-cyber-cyan uppercase tracking-wider min-w-[150px]">Vector</th>
              <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-cyber-cyan uppercase tracking-wider min-w-[100px]">Published</th>
            </tr>
          </thead>
          <tbody className="bg-cyber-card divide-y divide-gray-800">
            {loading && (
              <tr>
                <td colSpan="6" className="px-3 sm:px-6 py-10 text-center">
                  <div className="flex justify-center items-center text-cyber-cyan">
                    <Loader2 className="animate-spin h-6 w-6 mr-3" />
                    <span>LOADING NVD_DATA_STREAM...</span>
                  </div>
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan="6" className="px-3 sm:px-6 py-10 text-center">
                  <div className="text-cyber-red">
                    <DatabaseZap className="w-10 h-10 mx-auto mb-2" />
                    <span>ERROR: {error}</span>
                  </div>
                </td>
              </tr>
            )}
            {!loading && !error && filteredVulnerabilities.length === 0 && (
              <tr>
                <td colSpan="6" className="px-3 sm:px-6 py-10 text-center">
                  <div className="text-gray-500">
                    <DatabaseZap className="w-10 h-10 mx-auto mb-2" />
                    <span>NO MATCHING VULNERABILITIES FOUND_</span>
                  </div>
                </td>
              </tr>
            )}
            {!loading && !error && filteredVulnerabilities.map((cve) => {
              const { display: truncatedText, needsCopy } = truncateText(cve.text);
              return (
                <tr key={cve.ID} className="hover:bg-gray-800/50 transition-colors duration-150">
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-cyber-cyan">
                    <div className="flex items-center space-x-1">
                        <a href={`https://nvd.nist.gov/vuln/detail/${cve.ID}`} target="_blank" rel="noopener noreferrer" className="hover:underline">{cve.ID}</a>
                        <CopyButton textToCopy={cve.ID} isId={true} />
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 text-sm text-cyber-text max-w-xs min-w-40" title={cve.text}>
                      <div className="flex items-start justify-between flex-nowrap">
                          <p className="flex-grow">{truncatedText}</p>
                          {needsCopy && <CopyButton textToCopy={cve.text} />}
                      </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm"><SeverityBadge severity={cve.baseSeverity} /></td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-bold text-white">{cve.score ? cve.score.toFixed(1) : 'N/A'}</td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500" title={cve.vectorString}>{cve.vectorString ? cve.vectorString.substring(0, 30) + (cve.vectorString.length > 30 ? '...' : '') : 'N/A'}</td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {/* Date format changed to en-US */}
                      {cve.published_date ? new Date(cve.published_date).toLocaleDateString('en-US') : `(Est) ${extractYearFromCveId(cve.ID) || 'N/A'}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};


// --- ExploitDBTable Component (No changes) ---
const EXPLOITS_TO_SHOW = 10;
const HALF_EXPLOITS = EXPLOITS_TO_SHOW / 2;
const REFRESH_INTERVAL = 3 * 60 * 1000; 
const MIN_EXPLOIT_YEAR = 2023;
const EXPLOIT_POOL_SIZE = 200; 

const extractYearFromId = (id) => {
    const cveMatch = id?.match(/CVE-(\d{4})/);
    if (cveMatch) return parseInt(cveMatch[1], 10);
    const generalMatch = id?.match(/(\d{4})/); 
    if(generalMatch) return parseInt(generalMatch[1], 10);
    return null;
};

const shuffleArray = (array) => {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }
    return array;
};

const ExploitDBTable = () => {
  const [latestExploits, setLatestExploits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getExploitLabel = (exploitability) => {
      const val = parseInt(String(exploitability), 10);
      switch(val) {
          case 1: 
              return <span className="px-2 py-0.5 text-xs font-medium rounded bg-red-900/50 text-cyber-red border border-cyber-red/50 uppercase">EXPLOITABLE (1)</span>;
          case 0:
              return <span className="px-2 py-0.5 text-xs font-medium rounded bg-cyan-900/50 text-cyber-cyan border border-cyan-500/50 uppercase">NOT EXPLOITABLE (0)</span>;
          default:
              return <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-700/50 text-gray-400 border border-gray-600/50 uppercase">UNKNOWN</span>;
      }
  };

  const fetchLatestExploits = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const query1 = supabase
        .from('exploits') 
        .select('ID, Description, Exploitability') 
        .eq('Exploitability', 1) 
        .order('ID', { ascending: false }) 
        .limit(EXPLOIT_POOL_SIZE); 

      const query0 = supabase
        .from('exploits')
        .select('ID, Description, Exploitability')
        .neq('Exploitability', 1) 
        .order('ID', { ascending: false })
        .limit(EXPLOIT_POOL_SIZE);

      const [response1, response0] = await Promise.all([query1, query0]);

      if (response1.error) throw response1.error;
      if (response0.error) throw response0.error;

      const filterByYear = (item) => {
          const year = extractYearFromId(item.ID);
          return year && year >= MIN_EXPLOIT_YEAR;
      };

      const pool1 = (response1.data || []).filter(filterByYear);
      const pool0 = (response0.data || []).filter(filterByYear);

      console.log(`ExploitDBTable: Fetched ${pool1.length} (Label 1) and ${pool0.length} (Label 0) exploits from 2023+.`);

      const randomPool1 = shuffleArray([...pool1]).slice(0, HALF_EXPLOITS);
      const randomPool0 = shuffleArray([...pool0]).slice(0, HALF_EXPLOITS);

      let combinedData = [...randomPool1, ...randomPool0];
      const finalSet = shuffleArray(combinedData);
      
      if (finalSet.length < EXPLOITS_TO_SHOW && finalSet.length > 0) {
           console.warn(`ExploitDBTable: Not enough data for 2023+ to fill 10 slots. Displaying ${finalSet.length}.`);
      }

      setLatestExploits(finalSet);

    } catch (error) {
      console.error('Error fetching Exploit-DB feed:', error.message);
      setError(`Database Query Error: ${error.message}. Check RLS and 'exploits' table structure.`);
    } finally {
      setLoading(false);
    }
  }, []); 

  useEffect(() => {
    console.log('ExploitDBTable: Component mounted, starting initial fetch.');
    fetchLatestExploits();
    
    const refreshInterval = setInterval(() => {
        console.log('ExploitDBTable: Auto-refreshing random exploits...');
        fetchLatestExploits();
    }, REFRESH_INTERVAL); 

    return () => {
        console.log('ExploitDBTable: Component unmounting, clearing interval.');
        clearInterval(refreshInterval);
    };
  }, [fetchLatestExploits]); 

  return (
    <div className="flex flex-col h-full min-h-[400px]">
      
      {loading && (
        <div className="text-center py-10 text-cyber-cyan">
            <Loader2 className="animate-spin h-8 w-8 mx-auto mb-2" />
            <span>LOADING_RANDOM_EXPLOIT_FEED...</span>
        </div>
      )}

      {error && (
        <div className="text-center py-10 text-cyber-red">
          <DatabaseZap className="w-10 h-10 mx-auto mb-2" />
          <span>ERROR: {error}</span>
        </div>
      )}

      {!loading && !error && latestExploits.length === 0 && (
        <div className="text-center py-10 text-gray-500">
          <SwordsIcon className="w-10 h-10 mx-auto mb-2" />
          <span className="block mb-2 text-sm text-gray-400">NO LATEST EXPLOITS FOUND_ (2023+)</span>
          <p className="text-xs text-cyber-text/70 px-4">
            Ensure data from 2023+ exists and RLS is configured.
          </p>
        </div>
      )}

      {!loading && !error && latestExploits.length > 0 && (
        <ul className="space-y-3 overflow-y-auto flex-grow">
          {latestExploits.map((exploit) => (
            <li
              key={exploit.ID}
              className="border-b border-gray-800/50 pb-3 last:border-b-0 last:pb-0 hover:bg-gray-800/50 p-3 rounded-lg transition duration-150 border-l-2 border-cyber-red/50"
            >
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center space-x-2">
                    <span 
                        className="text-cyber-red hover:text-red-400 font-semibold text-sm transition duration-150 flex items-center"
                        title={exploit.ID} 
                    >
                      {exploit.ID}
                    </span>
                    <span className="text-xs text-gray-500 bg-gray-900/50 px-2 py-0.5 rounded-full">
                       YEAR: {extractYearFromId(exploit.ID) || 'N/A'}
                    </span>
                </div>
                
                {getExploitLabel(exploit.Exploitability)}
              </div>
              
              <div className="flex justify-between items-start mt-2">
                  <p className="text-sm text-cyber-text/80 line-clamp-2 w-full pr-4">
                    {exploit.Description || 'No description available.'}
                  </p>
                  <CopyButton textToCopy={exploit.Description || 'N/A'} />
              </div>
            </li>
          ))}
        </ul>
      )}

       {/* Refresh Button */}
       <div className="mt-4 pt-4 border-t border-gray-800/50">
          <button 
            onClick={fetchLatestExploits} 
            disabled={loading}
            className="text-cyber-cyan hover:text-cyan-500 font-medium text-sm flex items-center justify-end w-full disabled:opacity-50"
          >
             <SwordsIcon className="w-4 h-4 mr-2" />
             {loading ? 'REFRESHING...' : 'REFRESH_FEED_'}
          </button>
       </div>
    </div>
  );
};
// --- [END] ExploitDBTable Component ---


// --- [START] Logic from former AIModelCard ---
// This logic is now used by the new AIModels chat component
const HF_USER = "amirimmd";
const HF_SPACE_NAME = "ExBERT-Classifier-Inference";
const BASE_API_URL = `https://${HF_USER}-${HF_SPACE_NAME}.hf.space`;
const API_PREFIX = "/gradio_api";
const QUEUE_JOIN_URL = `${BASE_API_URL}${API_PREFIX}/queue/join`;
const QUEUE_DATA_URL = (sessionHash) => `${BASE_API_URL}${API_PREFIX}/queue/data?session_hash=${sessionHash}`;
const HF_API_TOKEN = import.meta.env.VITE_HF_API_TOKEN || ""; 

// Session hash generator
const generateSessionHash = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 11; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Typewriter hook
const useTypewriter = (text, speed = 50) => {
    const [displayText, setDisplayText] = useState('');
    const [internalText, setInternalText] = useState(text);
    const [isTyping, setIsTyping] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const intervalRef = useRef(null);

    const startTypingProcess = useCallback((newText) => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setInternalText(newText || '');
        setDisplayText('');
        setCurrentIndex(0);
        setIsTyping(!!newText);
    }, []);

    useEffect(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);

        if (isTyping && internalText && currentIndex < internalText.length) {
            intervalRef.current = setInterval(() => {
                 if (currentIndex < internalText.length) {
                    const nextIndex = currentIndex + 1;
                    setDisplayText(internalText.substring(0, nextIndex));
                    setCurrentIndex(nextIndex);
                 } else {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                    setIsTyping(false);
                 }
            }, speed);
        } else if (currentIndex >= (internalText?.length || 0)) {
            if(isTyping) setIsTyping(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
        }

        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [isTyping, speed, internalText, currentIndex]);

    useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

    return [displayText, startTypingProcess, isTyping];
};

// Simulation function for 'other' model
const simulateAnalysis = (query, modelId) => {
    let simulatedResponse = '';
    switch (modelId) {
      // 'xai' is now handled by its own function
      case 'other': simulatedResponse = `[SIMULATED_GENERAL_REPORT]:\nQuery processed by General Purpose Model.\nInput Length: ${query.length} chars.\nStatus: OK`; break;
      default: simulatedResponse = "ERROR: Simulated model not found.";
    }
    return simulatedResponse;
};
// --- [END] Logic from former AIModelCard ---


// --- [NEW] SHAP Visualization Component ---
const ShapVisualization = ({ shapData }) => {
    if (!shapData || shapData.length === 0) return null;

    // 1. Find min/max absolute values for normalization
    let maxAbsVal = 0;
    shapData.forEach(([, val]) => {
        if (Math.abs(val) > maxAbsVal) {
            maxAbsVal = Math.abs(val);
        }
    });
    
    if (maxAbsVal === 0) maxAbsVal = 1; // Avoid division by zero

    const getColor = (value) => {
        // Opacity is scaled from 0% to 80%
        const alpha = Math.min(Math.abs(value) / maxAbsVal, 1.0) * 0.8; 
        if (value > 0) { // High Attention (Red, predicts Label 1/2)
            return `rgba(255, 0, 0, ${alpha})`;
        } else if (value < 0) { // Low Attention (Green, predicts Label 0)
            return `rgba(0, 255, 0, ${alpha})`;
        }
        return 'rgba(255, 255, 255, 0.05)'; // Neutral (near zero)
    };

    return (
        <div className="mt-3 p-2 bg-dark-bg/50 rounded border border-gray-700">
            <p className="text-xs font-bold text-gray-400 mb-2">XAI - SHAP Word Importance:</p>
            <div className="flex flex-wrap" style={{ gap: '4px' }}>
                {shapData.map(([token, value], index) => (
                    <span 
                        key={index} 
                        title={`SHAP: ${value.toFixed(4)}`}
                        className="p-1 rounded"
                        // Add a space for readability if the token isn't punctuation
                        style={{ backgroundColor: getColor(value), marginRight: '4px', marginBottom: '4px' }}
                    >
                        {token}
                    </span>
                ))}
            </div>
            <div className="flex justify-between text-xs mt-2 text-gray-500">
                <span><span className="w-3 h-3 inline-block rounded-sm bg-cyber-green/50 mr-1 align-middle"></span> Low (Label 0)</span>
                <span><span className="w-3 h-3 inline-block rounded-sm bg-cyber-red/50 mr-1 align-middle"></span> High (Label 1/2)</span>
            </div>
        </div>
    );
};


// --- [START] New AIModels Chat Component ---
const AIModels = ({ setActiveTab }) => {
    const [activeModel, setActiveModel] = useState('exbert');
    const [messages, setMessages] = useState([
        { id: 'welcome', sender: 'ai', model: 'exbert', text: ':: CONNECTION ESTABLISHED ::\nWelcome to the Intelligent Analysis Unit. Select a model and submit your query.', shapData: null }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    // Sidebar is open by default on desktop
    const [sidebarOpen, setSidebarOpen] = useState(true); 
    // Mobile model selector is closed by default
    const [modelSelectorOpen, setModelSelectorOpen] = useState(false); 
    const [statusText, setStatusText] = useState(''); // For queue status

    const eventSourceRef = useRef(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Typewriter hook for the incoming message
    const [typedMessage, startTypingProcess, isTyping] = useTypewriter('', 20);
    const [lastAiMessageText, setLastAiMessageText] = useState('');
    // [NEW] State to hold SHAP data while text is typing
    const [pendingShapData, setPendingShapData] = useState(null);
    const prevIsTyping = useRef(false);

    const models = {
      'exbert': { title: 'MODEL::EXBERT_', description: 'Exploitability Probability Analysis' },
      'xai': { title: 'MODEL::EXBERT.XAI_', description: '[SIMULATED] Explainable AI (SHAP)' },
      'other': { title: 'MODEL::GENERAL.PURPOSE_', description: '[SIMULATED] General Purpose Model' },
    };

    // Effect to add the message to the list after typing is complete
    useEffect(() => {
        if (prevIsTyping.current && !isTyping && lastAiMessageText) {
            const aiMessage = { 
                id: Date.now(), 
                sender: 'ai', 
                model: activeModel, 
                text: lastAiMessageText,
                shapData: pendingShapData // [NEW] Add pending SHAP data
            };
            setMessages(prev => [...prev, aiMessage]);
            setLastAiMessageText('');
            setPendingShapData(null); // [NEW] Clear pending data
        }
        prevIsTyping.current = isTyping;
    }, [isTyping, lastAiMessageText, activeModel, startTypingProcess, pendingShapData]); // [NEW] Add dependency

    // Effect to auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typedMessage]); // Scroll on new message or new typed char

    // Cleanup EventSource on unmount
    useEffect(() => {
      return () => {
        if (eventSourceRef.current) {
          console.log("Closing existing EventSource connection on component unmount.");
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
      };
    }, []);

    // [NEW] Simulation function for XAI
    const simulateXaiAnalysis = (query) => {
        const tokens = query.split(/\s+/).filter(Boolean); // Split by space and remove empty
        // 60% chance of Label 1
        const label = Math.random() > 0.4 ? "1" : "0"; 
        
        // [MODIFIED] Logical probability based on label
        let probability;
        if (label === "1") {
            // High probability for high-risk label
            probability = Math.random() * (0.98 - 0.7) + 0.7; // 70%-98%
        } else {
            // Low probability for low-risk label
            probability = Math.random() * (0.40 - 0.05) + 0.05; // 5-40%
        }
        
        const shapData = tokens.map(token => {
            // Generate a random SHAP value. 
            // If Label 1, bias towards positive. If 0, bias towards negative.
            let shapVal = (Math.random() - 0.5) * 2; // -1.0 to 1.0
            if (label === "1") {
                shapVal = (Math.random() - 0.3) * 1.5; // Biased positive
            } else {
                shapVal = (Math.random() - 0.7) * 1.5; // Biased negative
            }
            // Simple keyword check
            if (token.toLowerCase().match(/vulnerability|exploit|rce|cve|buffer|overflow/)) shapVal = 0.9 + Math.random() * 0.1;
            if (token.toLowerCase().match(/the|a|is|and|of|for/)) shapVal = (Math.random() - 0.5) * 0.1; // Low impact for common words
            
            return [token, parseFloat(shapVal.toFixed(4))];
        });

        const text = `[XAI_REPORT]:\nPredicted Label: ${label}\nProbability: ${probability.toFixed(3)}`;
        return { text, shapData };
    };

    // Send message function (combined logic from AIModelCard)
    const handleSend = async () => {
        const query = input.trim();
        if (!query || loading) return;

        setLoading(true);
        setInput('');
        setStatusText('');
        if(inputRef.current) inputRef.current.style.height = 'auto'; // Reset textarea height
        
        const newUserMessage = { id: Date.now(), sender: 'user', text: query, model: activeModel };
        setMessages(prev => [...prev, newUserMessage]);
        
        if (eventSourceRef.current) {
            console.log("Closing previous EventSource before new request.");
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        // --- Simulation Logic ---
        if (activeModel === 'xai') { // [NEW] Handle XAI
            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
            const { text, shapData } = simulateXaiAnalysis(query);
            setLastAiMessageText(text);
            setPendingShapData(shapData); // [NEW]
            startTypingProcess(text);
            setLoading(false);
            return;
        }
        if (activeModel === 'other') { // [CHANGED]
            await new Promise(resolve => setTimeout(resolve, 1000));
            const response = simulateAnalysis(query, activeModel);
            setLastAiMessageText(response);
            setPendingShapData(null); // No SHAP data for this model
            startTypingProcess(response);
            setLoading(false);
            return;
        }
        
        // --- Real ExBERT Logic (/queue/join) ---
        const sessionHash = generateSessionHash(); 
        
        try {
            console.log(`Step 1: Joining Gradio Queue at ${QUEUE_JOIN_URL}...`);
            const joinHeaders = {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            };
            const payload = {
                "data": [query],
                "event_data": null,
                "fn_index": 2,       
                "trigger_id": 12,    
                "session_hash": sessionHash
            };

            const joinResponse = await fetch(QUEUE_JOIN_URL, {
                method: 'POST',
                headers: joinHeaders, 
                body: JSON.stringify(payload) 
            });

            if (!joinResponse.ok) {
                 const errorText = await joinResponse.text();
                 console.error("Queue Join Error:", joinResponse.status, errorText);
                 let detailedError = `Failed to join queue: ${joinResponse.status}.`;
                 if (joinResponse.status === 404) {
                     detailedError = "API ERROR: 404 Not Found. Check Space URL and /queue/join endpoint.";
                 }
                 throw new Error(detailedError);
            }

            const joinResult = await joinResponse.json();
            
            if (!joinResult.event_id) {
                 if (joinResult.error) { throw new Error(`Queue join returned error: ${joinResult.error}`); }
                 throw new Error("Failed to get event_id from queue join.");
            }
            console.log(`Step 2: Joined queue successfully. Listening for session ${sessionHash}...`);

            const dataUrl = QUEUE_DATA_URL(sessionHash);
            eventSourceRef.current = new EventSource(dataUrl); 

            eventSourceRef.current.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    switch (message.msg) {
                        case "process_starts":
                            setStatusText("Processing started...");
                            break;
                        case "process_completed":
                            if (message.success && message.output && message.output.data && message.output.data.length > 0) {
                                const rawPrediction = message.output.data[0];
                                const formattedOutput = `[EXBERT_REPORT]:\n${rawPrediction}`;
                                setLastAiMessageText(formattedOutput);
                                setPendingShapData(null); // ExBERT has no SHAP data
                                startTypingProcess(formattedOutput);
                            } else {
                                 const errorMsg = message.output?.error || "Unknown server processing error.";
                                 setLastAiMessageText(`Processing failed: ${errorMsg}`);
                                 startTypingProcess(`Processing failed: ${errorMsg}`);
                            }
                            if(eventSourceRef.current) eventSourceRef.current.close();
                            eventSourceRef.current = null;
                            setLoading(false);
                            setStatusText('');
                            break;
                         case "queue_full":
                             const queueError = "API Error: The queue is full, please try again later.";
                             setLastAiMessageText(queueError);
                             startTypingProcess(queueError);
                             if(eventSourceRef.current) eventSourceRef.current.close();
                             eventSourceRef.current = null;
                             setLoading(false);
                             setStatusText('Queue Full.');
                             break;
                         case "estimation":
                             const queuePosition = message.rank !== undefined ? message.rank + 1 : '?';
                             const queueSize = message.queue_size !== undefined ? message.queue_size : '?';
                             const eta = message.rank_eta !== undefined ? message.rank_eta.toFixed(1) : '?';
                             const waitMsg = `In queue (${queuePosition}/${queueSize}). Est. wait: ${eta}s...`;
                             setStatusText(waitMsg);
                             break;
                        case "close_stream":
                            if(eventSourceRef.current) eventSourceRef.current.close();
                            eventSourceRef.current = null;
                            if (loading) { 
                                setLoading(false);
                                if (!lastAiMessageText && !isTyping) {
                                    const closeError = "Stream closed unexpectedly before result.";
                                    setLastAiMessageText(closeError);
                                    startTypingProcess(closeError);
                                }
                            }
                            break;
                        default:
                            break;
                    }
                } catch (parseError) {
                     console.warn("Could not parse SSE message:", event.data);
                }
            };

            eventSourceRef.current.onerror = (error) => {
                let errorMsg = "Error connecting to API stream.";
                 if (!navigator.onLine) {
                     errorMsg += " Check your network connection.";
                 } else {
                     errorMsg += " Could not maintain connection. Check Space status/logs."; 
                 }
                setLastAiMessageText(errorMsg);
                startTypingProcess(errorMsg);
                 if(eventSourceRef.current) eventSourceRef.current.close();
                eventSourceRef.current = null;
                setLoading(false);
                setStatusText('Connection Error.');
            };

        } catch (err) {
            let displayError = err.message || "An unknown error occurred.";
            if (err.message.includes("Failed to fetch")) {
                displayError = "API ERROR: Network error or CORS issue. Check browser console and Space status.";
            } else if (err.message.includes("503")) {
                 displayError = "API ERROR: 503 Service Unavailable. The Space might be sleeping/overloaded. Wait and retry.";
            }
           setLastAiMessageText(displayError);
           startTypingProcess(displayError);
           setLoading(false);
           setStatusText('Failed to connect.');
            if (eventSourceRef.current) {
               eventSourceRef.current.close();
               eventSourceRef.current = null;
            }
        }
    };
    
    // Internal component for rendering messages
    const MessageComponent = ({ msg, isTyping = false, colorOverride = '' }) => {
        const isAi = msg.sender === 'ai';

        // [MODIFIED] Logic for coloring text output (for ExBERT and XAI)
        const labelMatch = msg.text.match(/Predicted Label: (\d)/);
        const label = labelMatch ? labelMatch[1] : null;
        
        let labelColor = '';
        if (msg.model === 'exbert' || msg.model === 'xai') {
            if (label === '0') labelColor = 'text-cyber-green';
            // Label 1 and 2 are red
            else if (label === '1' || label === '2') labelColor = 'text-cyber-red';
        }
        
        const finalColor = colorOverride || labelColor;

        return (
            <div className={`flex w-full mb-4 ${isAi ? 'justify-start' : 'justify-end'}`}>
                <div className={`flex max-w-xs md:max-w-md lg:max-w-2xl ${isAi ? 'flex-row' : 'flex-row-reverse'}`}>
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isAi ? 'bg-cyber-card text-cyber-green' : 'bg-cyber-green text-dark-bg'}`}>
                        {isAi ? <Bot size={20} /> : <User size={20} />}
                    </div>
                    {/* Message Text */}
                    <div className={`mx-3 rounded-lg p-3 ${isAi ? 'bg-cyber-card' : 'bg-cyber-green text-dark-bg'}`}>
                        {isAi && (
                            <span className="text-xs font-bold text-cyber-green block mb-1">
                                {models[msg.model]?.title || 'AI Model'}
                            </span>
                        )}
                        <p className={`text-sm whitespace-pre-wrap break-words ${finalColor}`}>
                            {msg.text}
                            {isTyping && <span className="typing-cursor"></span>}
                        </p>
                        {/* [NEW] Render SHAP visualization if data exists and typing is done */}
                        {!isTyping && msg.shapData && <ShapVisualization shapData={msg.shapData} />}
                    </div>
                </div>
            </div>
        );
    };

    // Internal component for Desktop Sidebar
    const ModelSidebar = () => (
        <div className={`hidden md:flex flex-col flex-shrink-0 bg-cyber-card border-r border-cyber-cyan/20 transition-all duration-300 ease-in-out overflow-hidden ${sidebarOpen ? 'w-72 p-4' : 'w-0 p-0'}`}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white whitespace-nowrap">Select Model</h3>
                <button onClick={() => setSidebarOpen(false)} className="text-gray-500 hover:text-white">
                    <X size={20} />
                </button>
            </div>
            <div className="flex flex-col space-y-2">
                {Object.keys(models).map(key => (
                    <button
                        key={key}
                        onClick={() => {
                            setActiveModel(key);
                            // Start new conversation on model switch
                            setMessages([
                                { id: 'welcome-' + key, sender: 'ai', model: key, text: `:: Model switched to ${models[key].title} ::\nReady for query...`, shapData: null }
                            ]);
                        }}
                        className={`w-full text-left p-3 rounded-lg transition-colors duration-150 ${activeModel === key ? 'bg-cyber-green/20 text-cyber-green' : 'text-cyber-text hover:bg-gray-800/50'}`}
                    >
                        <span className="font-bold block">{models[key].title}</span>
                        <span className="text-xs text-gray-400">{models[key].description}</span>
                    </button>
                ))}
            </div>
        </div>
    );
    
    // Handle textarea auto-resize
    const handleInput = (e) => {
        setInput(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = (e.target.scrollHeight) + 'px';
    };

    // [MODIFIED] Removed fixed height h-[85vh] to allow natural flow on mobile
    return (
        <section id="ai-models-section" className="mb-12">
            <div className="flex flex-col md:flex-row md:h-[85vh] bg-cyber-card border border-solid border-cyber-cyan/30 rounded-2xl animate-border-pulse overflow-hidden shadow-lg shadow-cyber-green/10">
                
                {/* --- Sidebar (Desktop) --- */}
                <ModelSidebar />

                {/* --- Main Chat Area --- */}
                {/* [MODIFIED] Added min-h-[70vh] for mobile to ensure it fills most of the screen */}
                <div className="flex-1 flex flex-col h-full min-h-[70vh] md:min-h-0 bg-dark-bg/50">
                    
                    {/* Chat Header */}
                    <div className="flex-shrink-0 flex items-center justify-between p-3 border-b border-cyber-cyan/20 bg-cyber-card">
                        {/* Desktop: Sidebar Toggle Button */}
                        <button onClick={() => setSidebarOpen(true)} className={`hidden md:block text-cyber-cyan hover:text-cyber-green ${sidebarOpen ? 'hidden' : ''}`}>
                            <Menu size={24} />
                        </button>
                        
                        {/* Mobile: Model Selector */}
                        <div className="relative md:hidden">
                            <button onClick={() => setModelSelectorOpen(o => !o)} className="flex items-center text-lg font-bold text-white">
                                {models[activeModel].title}
                                <ChevronDown size={20} className={`ml-1 transition-transform ${modelSelectorOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {/* Mobile: Model Dropdown Menu */}
                            {modelSelectorOpen && (
                                <div className="absolute top-full left-0 mt-2 w-60 bg-cyber-card border border-cyber-cyan/30 rounded-lg shadow-lg z-20">
                                    {Object.keys(models).map(key => (
                                        <button
                                            key={key}
                                            onClick={() => {
                                                setActiveModel(key);
                                                setModelSelectorOpen(false);
                                                // Start new conversation
                                                setMessages([
                                                    { id: 'welcome-' + key, sender: 'ai', model: key, text: `:: Model switched to ${models[key].title} ::\nReady for query...`, shapData: null }
                                                ]);
                                            }}
                                            className={`w-full text-left p-3 transition-colors duration-150 ${activeModel === key ? 'bg-cyber-green/20 text-cyber-green' : 'text-cyber-text hover:bg-gray-800/50'}`}
                                        >
                                            <span className="font-bold block">{models[key].title}</span>
                                            <span className="text-xs text-gray-400">{models[key].description}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Desktop: Model Title */}
                        <div className="hidden md:block text-center">
                            <h3 className="text-lg font-bold text-white">{models[activeModel].title}</h3>
                            <p className="text-xs text-gray-400">{models[activeModel].description}</p>
                        </div>
                        
                        {/* Spacer */}
                        <div className="w-8">
                          {/* <User size={24} className="text-cyber-cyan" /> */}
                        </div>
                    </div>

                    {/* Message List */}
                    <div className="flex-grow p-4 overflow-y-auto space-y-4 scroll-smooth md:pb-0 pb-32"> {/* [MODIFIED] Added pb-32 for mobile to clear fixed input */}
                        {messages.map(msg => (
                            <MessageComponent key={msg.id} msg={msg} />
                        ))}
                        {/* Typing message */}
                        {isTyping && (
                            <MessageComponent 
                                msg={{ id: 'typing', sender: 'ai', model: activeModel, text: typedMessage }} 
                                isTyping={true} 
                                // [NEW] Pass color override based on the full text being typed
                                colorOverride={
                                    (lastAiMessageText.includes('Predicted Label: 0')) ? 'text-cyber-green' :
                                    (lastAiMessageText.includes('Predicted Label: 2') || lastAiMessageText.includes('Predicted Label: 1')) ? 'text-cyber-red' : ''
                                }
                            />
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    {/* [MODIFIED] Added fixed positioning for mobile, relative for desktop */}
                    <div className="flex-shrink-0 p-4 border-t border-cyber-cyan/20 bg-dark-bg md:relative fixed bottom-16 left-0 right-0 w-full">
                        {/* Queue Status */}
                        { (loading || statusText) && (
                            <div className="text-xs text-cyber-cyan mb-2 flex items-center">
                                <Loader2 size={14} className="animate-spin mr-2" />
                                {statusText || 'Processing...'}
                            </div>
                        )}
                        <div className="flex items-end space-x-3">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onInput={handleInput}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                rows="1"
                                className="cyber-textarea w-full resize-none max-h-32"
                                placeholder="Enter query for analysis..."
                                disabled={loading}
                            />
                            <button 
                                onClick={handleSend} 
                                disabled={loading || !input.trim()}
                                className="cyber-button !w-auto px-4 py-3 rounded-lg flex-shrink-0"
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <Send size={20} />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
// --- [END] New AIModels Chat Component ---


// --- Wrapper Components for Tabs ---

const NVDTab = () => (
    <section id="nvd-section" className="cyber-card mb-12">
      <div className="flex items-center mb-6">
        <ShieldAlert className="icon-cyan w-8 h-8 mr-3 flex-shrink-0" />
        <h2 className="text-2xl font-semibold text-cyan-300 break-words min-w-0">NVD Vulnerability Feed_</h2>
      </div>
      <NVDTable />
    </section>
);

const ExploitDBTab = () => (
    <section id="exploit-db-section" className="cyber-card mb-12">
      <div className="flex items-center mb-6">
        <Swords className="icon-red w-8 h-8 mr-3 flex-shrink-0" />
        <h2 className="text-2xl font-semibold text-red-300 break-words min-w-0">EXPLOIT.DB.LATEST_</h2>
      </div>
      <ExploitDBTable />
   </section>
);

const LoginTab = () => (
    <section id="user-section" className="cyber-card mb-12">
        <div className="flex items-center mb-6">
            <User className="icon-cyan w-8 h-8 mr-3 flex-shrink-0" />
            <h2 className="text-2xl font-semibold text-cyan-300 break-words min-w-0">USER.AUTHENTICATION_</h2>
        </div>
        <div className="text-center py-10">
            <p className="text-cyber-text/80">User login and profile management interface.</p>
            <p className="text-gray-500 text-sm mt-2">(Feature under development)</p>
            <button className="cyber-button mt-6 w-full max-w-xs mx-auto">
                LOGIN_WITH_PROVIDER_
            </button>
        </div>
    </section>
);

// Mobile Tab Button Component
const TabButton = ({ icon: Icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex-1 flex flex-col items-center justify-center p-2 transition-all duration-200 ${
            isActive ? 'text-cyber-green' : 'text-gray-500 hover:text-gray-300'
        }`}
    >
        <Icon className={`w-6 h-6 mb-0.5 ${isActive ? 'shadow-lg shadow-cyber-green/50' : ''}`} />
        <span className="text-xs font-mono">{label}</span>
    </button>
);


// --- Main App Component (Layout logic updated) ---
function App() {
  // 'ai' is the default tab for both mobile and desktop
  const [activeTab, setActiveTab] = useState('ai'); 
  // [NEW] State for desktop data tabs (NVD vs ExploitDB)
  const [desktopDataTab, setDesktopDataTab] = useState('nvd');

  // [REMOVED] Special fullscreen logic for mobile chat is gone.
  
  return (
    <>
      {/* Background Grid Effect */}
      <div className="background-grid"></div>

      {/* Main Container */}
      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8 relative z-10">

        {/* Main Header */}
        <h1 className="text-3xl md:text-5xl font-bold text-center mb-6 md:mb-10 bg-clip-text text-transparent bg-gradient-to-r from-cyber-green to-cyber-cyan section-header break-words">
          ::CYBERNETIC.INTELLIGENCE.HUB::
        </h1>

        {/* --- [START] Desktop Layout (md and up) --- */}
        <div className="hidden md:block">
          {/* AIModels is always visible on top */}
          <AIModels setActiveTab={() => {}} /> 
          
          {/* [NEW] Desktop Tab Navigation for Data Feeds */}
          <div className="flex space-x-2 mb-6 -mt-6">
              <button 
                  onClick={() => setDesktopDataTab('nvd')}
                  className={`flex-1 flex items-center justify-center p-3 rounded-lg transition-all ${desktopDataTab === 'nvd' ? 'bg-cyber-card border border-cyber-cyan text-cyber-cyan shadow-lg' : 'bg-gray-900/50 text-gray-500 hover:bg-gray-800'}`}
              >
                  <Rss className="w-5 h-5 mr-2" />
                  <span className="font-bold text-lg">NVD_FEED_</span>
              </button>
              <button 
                  onClick={() => setDesktopDataTab('exploits')}
                  className={`flex-1 flex items-center justify-center p-3 rounded-lg transition-all ${desktopDataTab === 'exploits' ? 'bg-cyber-card border border-cyber-red text-cyber-red shadow-lg' : 'bg-gray-900/50 text-gray-500 hover:bg-gray-800'}`}
              >
                  <FileCode className="w-5 h-5 mr-2" />
                  <span className="font-bold text-lg">EXPLOIT_FEED_</span>
              </button>
          </div>
          
          {/* [NEW] Conditional Rendering for Desktop Tabs */}
          {desktopDataTab === 'nvd' && <NVDTab />}
          {desktopDataTab === 'exploits' && <ExploitDBTab />}
        </div>
        {/* --- [END] Desktop Layout --- */}


        {/* --- [START] Mobile App Layout (below md) --- */}
        <div className="md:hidden pb-20"> 
          
          <div id="mobile-tab-content">
            {/* All tabs now render normally */}
            {activeTab === 'ai' && <AIModels setActiveTab={setActiveTab} />}
            {activeTab === 'nvd' && <NVDTab />}
            {activeTab === 'exploits' && <ExploitDBTab />}
            {activeTab === 'user' && <LoginTab />}
          </div>

          {/* Bottom Navigation Bar */}
          <nav className="fixed bottom-0 left-0 right-0 h-16 bg-cyber-card border-t border-solid border-cyber-cyan/30 z-50 flex justify-around items-center shadow-lg backdrop-blur-sm bg-opacity-90">
            <TabButton 
              icon={BrainCircuit} 
              label="AI Models" 
              isActive={activeTab === 'ai'} 
              onClick={() => setActiveTab('ai')} 
            />
            <TabButton 
              icon={ShieldAlert} 
              label="NVD Feed" 
              isActive={activeTab === 'nvd'} 
              onClick={() => setActiveTab('nvd')} 
            />
            <TabButton 
              icon={Swords} 
              label="Exploits" 
              isActive={activeTab === 'exploits'} 
              onClick={() => setActiveTab('exploits')} 
            />
            <TabButton 
              icon={User} 
              label="User" 
              isActive={activeTab === 'user'} 
              onClick={() => setActiveTab('user')} 
            />
          </nav>
        </div>
        {/* --- [END] Mobile Layout --- */}

      </div>
    </>
  );
}

export default App;


