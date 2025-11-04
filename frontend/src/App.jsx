// frontend/src/App.jsx
// [فایل کامل] ادغام همه کامپوننت‌ها و رفع خطای قبلی
// [اصلاح شد] منطق ExploitDB برای استفاده از ID برای فیلتر تاریخ (2023+) در سمت کلاینت

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
// [اصلاح شد] ایمپورت‌ها به CDN (esm.sh) تغییر یافتند تا در محیط پیش‌نمایش به درستی کار کنند.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { 
  BrainCircuit, ShieldAlert, Swords, 
  Loader2, Filter, DatabaseZap, Clipboard, 
  User, Database, BarChart2,
  Swords as SwordsIcon // آیکون اضافی برای ExploitDB
} from 'https://esm.sh/lucide-react@0.395.0'; 

// --- Supabase Client (ادغام شده) ---
// [رفع هشدار] استفاده از مقادیر Placeholder برای جلوگیری از خطای import.meta در پیش‌نمایش
// مطمئن شوید که فایل vite.config.js شما دارای target: 'es2020' است.
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


// --- کامپوننت کمکی: CopyButton ---
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
            // استفاده از execCommand برای سازگاری بهتر در iFrame
            document.execCommand('copy'); 
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500); 
        } catch (err) {
            console.error('Failed to copy text:', err);
            // نمایش پیام خطا به جای alert
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


// --- کامپوننت NVDTable ---
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

// [اصلاح شد] تابع استخراج سال از CVE ID (برای NVD)
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
        // [اصلاح شد] ستون vectorString اضافه شد
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
                  {/* [اصلاح شد] نمایش vectorString */}
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


// --- کامپوننت AIModelCard (با API پایدار) ---
const HF_USER = "amirimmd";
const HF_SPACE_NAME = "ExBERT-Classifier-Inference";
// [اصلاح شد] استفاده از اندپوینت /run/predict به جای /queue/join
const API_URL = `https://${HF_USER}-${HF_SPACE_NAME}.hf.space/run/predict`; 
const HF_API_TOKEN = import.meta.env.VITE_HF_API_TOKEN || ""; // Placeholder

if (!HF_API_TOKEN && !API_URL.includes("your-project-url")) {
  console.warn("⚠️ [AIModelCard] VITE_HF_API_TOKEN is missing! Using public mode for public Space.");
}

// Typewriter Hook
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

const AIModelCard = ({ title, description, placeholder, modelId }) => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [typedOutput, startTypingProcess, isTyping] = useTypewriter(output, 20);

  // شبیه‌سازی برای مدل‌های غیر از ExBERT
  const simulateAnalysis = (query, modelId) => {
      let simulatedResponse = '';
      switch (modelId) {
        case 'xai': simulatedResponse = `[SIMULATED_XAI_REPORT]:\nAnalysis for "${query.substring(0,15)}..." shows high attention on token [X].\nPredicted Label: 1\nConfidence: 0.85`; break;
        case 'other': simulatedResponse = `[SIMULATED_GENERAL_REPORT]:\nQuery processed by General Purpose Model.\nInput Length: ${query.length} chars.\nStatus: OK`; break;
        default: simulatedResponse = "ERROR: Simulated model not found.";
      }
      return simulatedResponse;
  };


  const handleModelQuery = async (e) => {
    e.preventDefault();
    const query = input.trim();
    if (!query) return;

    setLoading(true);
    setError(null);
    startTypingProcess('');

    // شبیه‌سازی برای مدل‌های دیگر
    if (modelId !== 'exbert') {
      const response = simulateAnalysis(query, modelId);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setOutput(response);
      startTypingProcess(response);
      setLoading(false);
      return;
    }
    
    // --- [START] پیاده‌سازی API پایدار (Named Endpoint) ---
    try {
        console.log(`Step 1: Calling Gradio API at ${API_URL}...`);
        
        const headers = {
            'Content-Type': 'application/json',
        };
        // اگر توکن HF دارید، آن را اضافه کنید (برای Spaces خصوصی)
        // if (HF_API_TOKEN) {
        //     headers['Authorization'] = `Bearer ${HF_API_TOKEN}`;
        // }
        
        const payload = {
            "data": [query] // ورودی مدل شما فقط یک رشته است
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: headers, 
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
             const errorText = await response.text();
             console.error("API Call Error:", response.status, errorText);
             let detailedError = `Failed to call API: ${response.status}.`;
             if (response.status === 401) {
                 detailedError = "API ERROR: 401 Unauthorized. Check Space permissions/token.";
             } else if (response.status === 503) {
                 detailedError = "API ERROR: 503 Service Unavailable. The Space might be sleeping/loading. Wait 30s and retry.";
             } else if (response.status === 404) {
                 detailedError = "API ERROR: 404 Not Found. Check if api_name='predict' is set in app.py.";
             } else {
                 detailedError += ` ${errorText.substring(0, 150)}`;
             }
             throw new Error(detailedError);
        }

        const result = await response.json();
        console.log("API Result:", result);

        // 9. استخراج خروجی
        if (result.data && result.data.length > 0) {
            const rawPrediction = result.data[0];
            // خروجی app.py شما اکنون دارای \n است، آن را حفظ می‌کنیم
            const formattedOutput = `[EXBERT_REPORT]:\n${rawPrediction}`;
            setOutput(formattedOutput);
            startTypingProcess(formattedOutput);
        } else if (result.error) {
            throw new Error(`API returned an error: ${result.error}`);
        } else {
            throw new Error("Invalid response structure from API.");
        }

    } catch (err) {
        let displayError = err.message || "An unknown error occurred.";
        if (err.message.includes("Failed to fetch")) {
            displayError = "API ERROR: Network error or CORS issue. Check browser console and Space status.";
        }
       setError(displayError);
       setOutput('');
       startTypingProcess('');
    } finally {
        setLoading(false);
    }
    // --- [END] پیاده‌سازی ---
  };

  // --- Render logic (اصلاح شده) ---
  return (
    <div className="bg-gray-900 rounded-lg p-5 shadow-inner shadow-cyber-green/10 border border-cyber-green/20 flex flex-col h-full">
      <h3 className="text-xl font-bold mb-2 text-white break-words">{title}</h3>
      <p className="text-sm text-gray-400 mb-4 flex-grow">{description}</p>

      <form onSubmit={handleModelQuery}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows="4"
          className="cyber-textarea w-full"
          placeholder={placeholder}
          disabled={loading} 
        />
        <button 
            type="submit" 
            className="cyber-button w-full mt-3 flex items-center justify-center" 
            disabled={loading || !input.trim()}
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin h-5 w-5 mr-3" />
              ANALYZING...
            </>
          ) : (
            'EXECUTE_QUERY_'
          )}
        </button>
      </form>

      {error && (
        <p className="mt-2 text-xs text-cyber-red p-2 bg-red-900/30 rounded border border-red-500/50">
          {error}
        </p>
      )}

      <div className="mt-4 bg-dark-bg rounded-lg p-3 text-cyber-green text-sm min-h-[100px] border border-cyber-green/30 overflow-auto whitespace-pre-wrap">
         {typedOutput}
         {isTyping ? <span className="typing-cursor"></span> : null}
         {!loading && !error && !output && !typedOutput && (
             <span className="text-gray-500">MODEL.RESPONSE.STANDBY...</span>
         )}
      </div>
    </div>
  );
};
// --- [END] کامپوننت AIModelCard ---


// --- [START] کامپوننت ExploitDBTable (اصلاح شده) ---
const EXPLOITS_TO_SHOW = 10;
const HALF_EXPLOITS = EXPLOITS_TO_SHOW / 2;
const REFRESH_INTERVAL = 3 * 60 * 1000; // 3 دقیقه
const MIN_EXPLOIT_YEAR = 2023;
const EXPLOIT_POOL_SIZE = 200; // واکشی 200 مورد برای استخر رندوم

// [اصلاح شد] تابع استخراج سال از ID (بر اساس درخواست کاربر)
const extractYearFromId = (id) => {
    // به دنبال الگوهایی شبیه EDB-ID یا CVE-YYYY می‌گردد
    // اگر هیچکدام نبود، به دنبال اولین عدد ۴ رقمی می‌گردد
    const cveMatch = id?.match(/CVE-(\d{4})/);
    if (cveMatch) return parseInt(cveMatch[1], 10);
    
    const edbMatch = id?.match(/EDB-ID: (\d+)/); // (فرض بر اینکه ID در توضیحات است)
    // این الگو دیگر مفید نیست چون فقط ID عددی را داریم
    
    // اگر فقط ID عددی (مثلاً 49517) داریم، استخراج سال از آن غیرممکن است
    // اما در دیتابیس شما، IDها شبیه 2023-12345 هستند
    const generalMatch = id?.match(/(\d{4})/); 
    if(generalMatch) return parseInt(generalMatch[1], 10);

    return null;
};

// [جدید] تابع کمکی برای مخلوط کردن آرایه
const shuffleArray = (array) => {
    let currentIndex = array.length, randomIndex;
    // تا زمانی که عنصری برای مخلوط کردن باقی مانده است
    while (currentIndex !== 0) {
        // یک عنصر باقی‌مانده را انتخاب کن
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        // و آن را با عنصر فعلی جابجا کن
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

  // [اصلاح شد] منطق واکشی برای رندوم‌سازی و فیلتر تاریخ بر اساس ID
  const fetchLatestExploits = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // [اصلاح شد] کوئری‌ها ستون 'date' را واکشی نمی‌کنند و از gte استفاده نمی‌کنند
      // ما pool بزرگتری واکشی می‌کنیم و در کلاینت فیلتر می‌کنیم
      const query1 = supabase
        .from('exploits') 
        .select('ID, Description, Exploitability') // فقط ستون‌های مورد نیاز
        .eq('Exploitability', 1) 
        .order('ID', { ascending: false }) // مرتب‌سازی بر اساس ID (که تاریخ در آن است)
        .limit(EXPLOIT_POOL_SIZE); // واکشی استخر بزرگ

      const query0 = supabase
        .from('exploits')
        .select('ID, Description, Exploitability')
        .neq('Exploitability', 1) 
        .order('ID', { ascending: false })
        .limit(EXPLOIT_POOL_SIZE);

      const [response1, response0] = await Promise.all([query1, query0]);

      if (response1.error) throw response1.error;
      if (response0.error) throw response0.error;

      // [اصلاح شد] فیلتر تاریخ (2023+) در سمت کلاینت بر اساس ID
      const filterByYear = (item) => {
          const year = extractYearFromId(item.ID);
          return year && year >= MIN_EXPLOIT_YEAR;
      };

      const pool1 = (response1.data || []).filter(filterByYear);
      const pool0 = (response0.data || []).filter(filterByYear);

      console.log(`ExploitDBTable: Fetched ${pool1.length} (Label 1) and ${pool0.length} (Label 0) exploits from 2023+.`);

      // [اصلاح شد] 5 آیتم رندوم از هر استخر انتخاب کن
      const randomPool1 = shuffleArray([...pool1]).slice(0, HALF_EXPLOITS);
      const randomPool0 = shuffleArray([...pool0]).slice(0, HALF_EXPLOITS);

      // [اصلاح شد] 10 آیتم نهایی را دوباره مخلوط کن تا ترتیب کاملاً رندوم باشد
      let combinedData = [...randomPool1, ...randomPool0];
      const finalSet = shuffleArray(combinedData);
      
      if (finalSet.length === 0 && (pool1.length > 0 || pool0.length > 0)) {
          console.warn("ExploitDBTable: Random selection resulted in 0 items, but pools were not empty.");
      }
      
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
    
    // [اصلاح شد] رفرش خودکار هر 3 دقیقه به جای Realtime
    const refreshInterval = setInterval(() => {
        console.log('ExploitDBTable: Auto-refreshing random exploits...');
        fetchLatestExploits();
    }, REFRESH_INTERVAL); // 3 minutes

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
                    {/* [اصلاح شد] استفاده از ID برای تاریخ */}
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


// --- کامپوننت‌های Wrapper برای تب‌ها ---

// Wrapper برای مدل‌های AI
const AIModels = () => (
    <section id="ai-models-section" className="cyber-card mb-12">
      <div className="flex items-center mb-6">
        <BrainCircuit className="icon-green w-8 h-8 mr-3 flex-shrink-0" />
        <h2 className="text-2xl font-semibold text-green-300 break-words min-w-0">INTELLIGENT.ANALYSIS.UNIT_</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AIModelCard 
          title="MODEL::EXBERT_"
          description="Custom BERT+LSTM model fine-tuned for estimating exploitability probability."
          placeholder="INITIATE_EXBERT_QUERY... (e.g., Buffer overflow in...)"
          modelId="exbert"
        />
        <AIModelCard 
          title="MODEL::EXBERT.XAI_"
          description="[SIMULATED] Explainable AI (XAI) for transparent threat assessment."
          placeholder="INITIATE_XAI_QUERY..."
          modelId="xai"
        />
        <AIModelCard 
          title="MODEL::GENERAL.PURPOSE_"
          description="[SIMULATED] Versatile language processing for auxiliary tasks."
          placeholder="INITIATE_GENERAL_QUERY..."
          modelId="other"
        />
      </div>
    </section>
);

// Wrapper برای NVD
const NVDTab = () => (
    <section id="nvd-section" className="cyber-card mb-12">
      <div className="flex items-center mb-6">
        <ShieldAlert className="icon-cyan w-8 h-8 mr-3 flex-shrink-0" />
        <h2 className="text-2xl font-semibold text-cyan-300 break-words min-w-0">NVD Vulnerability Feed_</h2>
      </div>
      <NVDTable />
    </section>
);

// Wrapper برای ExploitDB
const ExploitDBTab = () => (
    <section id="exploit-db-section" className="cyber-card mb-12">
      <div className="flex items-center mb-6">
        <Swords className="icon-red w-8 h-8 mr-3 flex-shrink-0" />
        <h2 className="text-2xl font-semibold text-red-300 break-words min-w-0">EXPLOIT.DB.LATEST_</h2>
      </div>
      <ExploitDBTable />
   </section>
);

// [جدید] کامپوننت Placeholder برای تب User
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

// [جدید] کامپوننت دکمه تب
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
  // [اصلاح شد] تب پیش‌فرض AI و ترتیب دکمه‌ها در موبایل تغییر کرد
  const [activeTab, setActiveTab] = useState('ai'); 

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
        <div className="hidden md:block">
          {/* چیدمان قبلی شما برای دسکتاپ حفظ شده است */}
          <AIModels />
          <NVDTab />
          <ExploitDBTab />
          {/* <LoginTab /> */} {/* می‌توانید تب User را در دسکتاپ نیز فعال کنید */}
        </div>
        {/* --- [END] چیدمان دسکتاپ --- */}


        {/* --- [START] چیدمان اپلیکیشن موبایل (زیر md) --- */}
        <div className="md:hidden pb-20"> {/* pb-20 برای ایجاد فضا برای نوار تب پایین */}
          
          {/* محتوای تب‌ها بر اساس activeTab رندر می‌شود */}
          <div id="mobile-tab-content">
            {activeTab === 'ai' && <AIModels />}
            {activeTab === 'nvd' && <NVDTab />}
            {activeTab === 'exploits' && <ExploitDBTab />}
            {activeTab === 'user' && <LoginTab />}
          </div>

          {/* نوار تب ثابت در پایین */}
          <nav className="fixed bottom-0 left-0 right-0 h-16 bg-cyber-card border-t border-solid border-cyber-cyan/30 z-50 flex justify-around items-center shadow-lg backdrop-blur-sm bg-opacity-90">
            {/* [اصلاح شد] ترتیب دکمه‌ها تغییر کرد */}
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

