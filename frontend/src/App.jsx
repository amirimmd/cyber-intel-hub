// frontend/src/App.jsx
// [بازطراحی کامل تب AI]
// - کامپوننت AIModels به یک رابط چت تمام صفحه تبدیل شد.
// - کامپوننت AIModelCard حذف شد و منطق API آن (useTypewriter, API calls) مستقیماً در AIModels جدید ادغام شد.
// - رابط چت در دسکتاپ دارای سایدبار جمع‌شونده در سمت چپ برای انتخاب مدل است.
// - رابط چت در موبایل دارای انتخاب‌گر مدل جمع‌شونده در هدر است.
// - سایر تب‌ها (NVD, ExploitDB) بدون تغییر باقی ماندند.

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
// [اصلاح شد] ایمپورت‌ها به CDN (esm.sh) تغییر یافتند تا در محیط پیش‌نمایش به درستی کار کنند.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { 
  BrainCircuit, ShieldAlert, Swords, 
  Loader2, Filter, DatabaseZap, Clipboard, 
  User, Database, BarChart2,
  Swords as SwordsIcon,
  Menu, // برای سایدبار دسکتاپ
  X, // برای بستن سایدبار
  Send, // دکمه ارسال چت
  Bot, // آیکون AI
  ChevronDown, // برای انتخاب‌گر موبایل
  ArrowLeft // برای بازگشت از چت در موبایل
} from 'https://esm.sh/lucide-react@0.395.0'; 

// --- Supabase Client (ادغام شده - بدون تغییر) ---
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
    // ایجاد یک کلاینت mock برای جلوگیری از کرش کامل در پیش‌نمایش
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


// --- کامپوننت کمکی: CopyButton (بدون تغییر) ---
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
            // از alert استفاده نکنید
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


// --- کامپوننت NVDTable (بدون تغییر) ---
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
        {/* فیلتر تاریخ */}
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

      {/* راهنمای اسکرول افقی در موبایل */}
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
                      {cve.published_date ? new Date(cve.published_date).toLocaleDateString('fa-IR') : `(Est) ${extractYearFromCveId(cve.ID) || 'N/A'}`}
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


// --- کامپوننت ExploitDBTable (بدون تغییر) ---
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

       {/* دکمه Refresh */}
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
// --- [END] کامپوننت ExploitDBTable ---


// --- [START] منطق کامپوننت AIModelCard سابق ---
// این منطق اکنون به کامپوننت جدید AIModels منتقل می‌شود
const HF_USER = "amirimmd";
const HF_SPACE_NAME = "ExBERT-Classifier-Inference";
const BASE_API_URL = `https://${HF_USER}-${HF_SPACE_NAME}.hf.space`;
const API_PREFIX = "/gradio_api";
const QUEUE_JOIN_URL = `${BASE_API_URL}${API_PREFIX}/queue/join`;
const QUEUE_DATA_URL = (sessionHash) => `${BASE_API_URL}${API_PREFIX}/queue/data?session_hash=${sessionHash}`;
const HF_API_TOKEN = import.meta.env.VITE_HF_API_TOKEN || ""; 

// تابع تولید هش
const generateSessionHash = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 11; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// هوک تایپ‌رایتر
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

// تابع شبیه‌سازی
const simulateAnalysis = (query, modelId) => {
    let simulatedResponse = '';
    switch (modelId) {
      case 'xai': simulatedResponse = `[SIMULATED_XAI_REPORT]:\nAnalysis for "${query.substring(0,15)}..." shows high attention on token [X].\nPredicted Label: 1\nConfidence: 0.85`; break;
      case 'other': simulatedResponse = `[SIMULATED_GENERAL_REPORT]:\nQuery processed by General Purpose Model.\nInput Length: ${query.length} chars.\nStatus: OK`; break;
      default: simulatedResponse = "ERROR: Simulated model not found.";
    }
    return simulatedResponse;
};
// --- [END] منطق کامپوننت AIModelCard سابق ---


// --- [START] کامپوننت جدید AIModels (رابط چت) ---
const AIModels = ({ setActiveTab }) => {
    const [activeModel, setActiveModel] = useState('exbert');
    const [messages, setMessages] = useState([
        { id: 'welcome', sender: 'ai', model: 'exbert', text: ':: اتصال برقرار شد ::\nبه واحد تحلیل هوشمند خوش آمدید. لطفاً مدل خود را انتخاب کرده و درخواست را وارد کنید.' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    // باز بودن سایدبار در دسکتاپ به صورت پیش‌فرض
    const [sidebarOpen, setSidebarOpen] = useState(true); 
    // بسته بودن انتخاب‌گر موبایل به صورت پیش‌فرض
    const [modelSelectorOpen, setModelSelectorOpen] = useState(false); 
    const [statusText, setStatusText] = useState(''); // برای نمایش وضعیت صف

    const eventSourceRef = useRef(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // هوک تایپ‌رایتر برای پیام در حال ورود
    const [typedMessage, startTypingProcess, isTyping] = useTypewriter('', 20);
    const [lastAiMessageText, setLastAiMessageText] = useState('');
    const prevIsTyping = useRef(false);

    const models = {
      'exbert': { title: 'MODEL::EXBERT_', description: 'تحلیل احتمال Exploitability' },
      'xai': { title: 'MODEL::EXBERT.XAI_', description: '[شبیه‌سازی شده] Explainable AI' },
      'other': { title: 'MODEL::GENERAL.PURPOSE_', description: '[شبیه‌سازی شده] مدل عمومی' },
    };

    // افکت برای افزودن پیام به لیست پس از اتمام تایپ
    useEffect(() => {
        if (prevIsTyping.current && !isTyping && lastAiMessageText) {
            const aiMessage = { id: Date.now(), sender: 'ai', model: activeModel, text: lastAiMessageText };
            setMessages(prev => [...prev, aiMessage]);
            setLastAiMessageText('');
            startTypingProcess('');
        }
        prevIsTyping.current = isTyping;
    }, [isTyping, lastAiMessageText, activeModel, startTypingProcess]);

    // افکت برای اسکرول خودکار به پایین
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typedMessage]); // با هر پیام جدید یا هر حرف تایپ شده اسکرول کن

    // پاکسازی EventSource هنگام خروج
    useEffect(() => {
      return () => {
        if (eventSourceRef.current) {
          console.log("Closing existing EventSource connection on component unmount.");
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
      };
    }, []);

    // تابع ارسال پیام (ترکیبی از منطق AIModelCard)
    const handleSend = async () => {
        const query = input.trim();
        if (!query || loading) return;

        setLoading(true);
        setInput('');
        setStatusText('');
        if(inputRef.current) inputRef.current.style.height = 'auto'; // ریست کردن ارتفاع textarea
        
        const newUserMessage = { id: Date.now(), sender: 'user', text: query, model: activeModel };
        setMessages(prev => [...prev, newUserMessage]);
        
        if (eventSourceRef.current) {
            console.log("Closing previous EventSource before new request.");
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        // --- منطق شبیه‌سازی ---
        if (activeModel !== 'exbert') {
          const response = simulateAnalysis(query, activeModel);
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          setLastAiMessageText(response);
          startTypingProcess(response);
          setLoading(false);
          return;
        }
        
        // --- منطق واقعی ExBERT (/queue/join) ---
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
    
    // کامپوننت داخلی برای رندر پیام‌ها
    const MessageComponent = ({ msg, isTyping = false }) => {
        const isAi = msg.sender === 'ai';
        return (
            <div className={`flex w-full mb-4 ${isAi ? 'justify-start' : 'justify-end'}`}>
                <div className={`flex max-w-xs md:max-w-md lg:max-w-2xl ${isAi ? 'flex-row' : 'flex-row-reverse'}`}>
                    {/* آیکون */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isAi ? 'bg-cyber-card text-cyber-green' : 'bg-cyber-green text-dark-bg'}`}>
                        {isAi ? <Bot size={20} /> : <User size={20} />}
                    </div>
                    {/* متن پیام */}
                    <div className={`mx-3 rounded-lg p-3 ${isAi ? 'bg-cyber-card' : 'bg-cyber-green text-dark-bg'}`}>
                        {isAi && (
                            <span className="text-xs font-bold text-cyber-green block mb-1">
                                {models[msg.model]?.title || 'AI Model'}
                            </span>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">
                            {msg.text}
                            {isTyping && <span className="typing-cursor"></span>}
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    // کامپوننت داخلی سایدبار دسکتاپ
    const ModelSidebar = () => (
        <div className={`hidden md:flex flex-col flex-shrink-0 bg-cyber-card border-r border-cyber-cyan/20 transition-all duration-300 ease-in-out overflow-hidden ${sidebarOpen ? 'w-72 p-4' : 'w-0 p-0'}`}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white whitespace-nowrap">انتخاب مدل</h3>
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
                            // شروع مکالمه جدید هنگام تغییر مدل
                            setMessages([
                                { id: 'welcome-' + key, sender: 'ai', model: key, text: `:: مدل به ${models[key].title} تغییر یافت ::\n آماده دریافت درخواست...` }
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
    
    // مدیریت تغییر ارتفاع textarea
    const handleInput = (e) => {
        setInput(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = (e.target.scrollHeight) + 'px';
    };

    return (
        // [مهم] بخش AIModels دیگر یک cyber-card معمولی نیست، بلکه یک کانتینر چت تمام ارتفاع است
        <section id="ai-models-section" className="mb-12">
            {/* [مهم] ارتفاع ثابت برای کانتینر چت */}
            <div className="flex h-[85vh] bg-cyber-card border border-solid border-cyber-cyan/30 rounded-2xl animate-border-pulse overflow-hidden shadow-lg shadow-cyber-green/10">
                
                {/* --- سایدبار (دسکتاپ) --- */}
                <ModelSidebar />

                {/* --- بخش اصلی چت --- */}
                <div className="flex-1 flex flex-col h-full bg-dark-bg/50">
                    
                    {/* هدر چت */}
                    <div className="flex-shrink-0 flex items-center justify-between p-3 border-b border-cyber-cyan/20 bg-cyber-card">
                        {/* دکمه باز کردن سایدبار (دسکتاپ) */}
                        <button onClick={() => setSidebarOpen(true)} className={`hidden md:block text-cyber-cyan hover:text-cyber-green ${sidebarOpen ? 'hidden' : ''}`}>
                            <Menu size={24} />
                        </button>
                        
                        {/* دکمه بازگشت (موبایل) - کاربر را به تب NVD می‌برد */}
                        <button onClick={() => setActiveTab('nvd')} className="md:hidden text-cyber-cyan hover:text-cyber-green">
                            <ArrowLeft size={24} />
                        </button>

                        {/* انتخاب‌گر مدل (موبایل) */}
                        <div className="relative md:hidden">
                            <button onClick={() => setModelSelectorOpen(o => !o)} className="flex items-center text-lg font-bold text-white">
                                {models[activeModel].title}
                                <ChevronDown size={20} className={`ml-1 transition-transform ${modelSelectorOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {/* منوی کشویی مدل‌ها در موبایل */}
                            {modelSelectorOpen && (
                                <div className="absolute top-full right-0 mt-2 w-60 bg-cyber-card border border-cyber-cyan/30 rounded-lg shadow-lg z-20">
                                    {Object.keys(models).map(key => (
                                        <button
                                            key={key}
                                            onClick={() => {
                                                setActiveModel(key);
                                                setModelSelectorOpen(false);
                                                // شروع مکالمه جدید
                                                setMessages([
                                                    { id: 'welcome-' + key, sender: 'ai', model: key, text: `:: مدل به ${models[key].title} تغییر یافت ::\n آماده دریافت درخواست...` }
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

                        {/* عنوان مدل (دسکتاپ) */}
                        <div className="hidden md:block text-center">
                            <h3 className="text-lg font-bold text-white">{models[activeModel].title}</h3>
                            <p className="text-xs text-gray-400">{models[activeModel].description}</p>
                        </div>
                        
                        {/* آیکون کاربر (جای خالی برای تراز) */}
                        <div className="w-8">
                          {/* <User size={24} className="text-cyber-cyan" /> */}
                        </div>
                    </div>

                    {/* لیست پیام‌ها */}
                    <div className="flex-grow p-4 overflow-y-auto space-y-4 scroll-smooth">
                        {messages.map(msg => (
                            <MessageComponent key={msg.id} msg={msg} />
                        ))}
                        {/* پیام در حال تایپ */}
                        {isTyping && (
                            <MessageComponent 
                                msg={{ id: 'typing', sender: 'ai', model: activeModel, text: typedMessage }} 
                                isTyping={true} 
                            />
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* بخش ورودی متن */}
                    <div className="flex-shrink-0 p-4 border-t border-cyber-cyan/20 bg-dark-bg">
                        {/* نمایش وضعیت صف */}
                        { (loading || statusText) && (
                            <div className="text-xs text-cyber-cyan mb-2 flex items-center">
                                <Loader2 size={14} className="animate-spin mr-2" />
                                {statusText || 'در حال پردازش...'}
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
                                placeholder="پیام خود را برای تحلیل وارد کنید..."
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
// --- [END] کامپوننت جدید AIModels ---


// --- کامپوننت‌های Wrapper برای تب‌ها (بدون تغییر) ---

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

// [اصلاح شد] کامپوننت TabButton برای پشتیبانی از setActiveTab در موبایل
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


// --- کامپوننت اصلی App (با چیدمان واکنش‌گرا) ---
function App() {
  const [activeTab, setActiveTab] = useState('ai'); 

  // [مهم] اگر تب AI فعال باشد، فقط کامپوننت AIModels را در موبایل رندر می‌کنیم
  // و هدر اصلی و گرید پس‌زمینه را مخفی می‌کنیم تا تمام صفحه شود.
  if (activeTab === 'ai' && typeof window !== 'undefined' && window.innerWidth < 768) {
      return (
        <>
          <div className="background-grid"></div>
          {/* کانتینر تمام صفحه برای چت موبایل */}
          <div className="w-full h-screen p-2 pt-4 flex flex-col">
            <AIModels setActiveTab={setActiveTab} />
          </div>
        </>
      );
  }
  
  // رندر عادی برای دسکتاپ (که چت داخل تب است) یا سایر تب‌های موبایل
  return (
    <>
      {/* Background Grid Effect */}
      <div className="background-grid"></div>

      {/* کانتینر اصلی */}
      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8 relative z-10">

        {/* Main Header (مشترک برای دسکتاپ و موبایل) */}
        <h1 className="text-3xl md:text-5xl font-bold text-center mb-6 md:mb-10 bg-clip-text text-transparent bg-gradient-to-r from-cyber-green to-cyber-cyan section-header break-words">
          ::CYBERNETIC.INTELLIGENCE.HUB::
        </h1>

        {/* --- [START] چیدمان دسکتاپ (md به بالا) --- */}
        {/* در دسکتاپ، همه تب‌ها همیشه نمایش داده می‌شوند */}
        <div className="hidden md:block">
          {/* [مهم] ارسال setActiveTab به AIModels لازم نیست چون در دسکتاپ همیشه باز است */}
          <AIModels setActiveTab={() => {}} /> 
          <NVDTab />
          <ExploitDBTab />
        </div>
        {/* --- [END] چیدمان دسکتاپ --- */}


        {/* --- [START] چیدمان اپلیکیشن موبایل (زیر md) --- */}
        {/* در موبایل، فقط تب فعال (غیر از AI) نمایش داده می‌شود */}
        <div className="md:hidden pb-20"> 
          
          <div id="mobile-tab-content">
            {/* activeTab === 'ai' در اینجا مدیریت نمی‌شود، چون در بالا جداگانه رندر شد */}
            {activeTab === 'nvd' && <NVDTab />}
            {activeTab === 'exploits' && <ExploitDBTab />}
            {activeTab === 'user' && <LoginTab />}
          </div>

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
        {/* --- [END] چیدمان موبایل --- */}

      </div>
    </>
  );
}

export default App;
