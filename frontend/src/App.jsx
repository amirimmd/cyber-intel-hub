// frontend/src/App.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { 
  ShieldAlert, 
  BrainCircuit, 
  Swords, 
  User,
  Loader2, 
  Filter, 
  DatabaseZap, 
  Clipboard 
} from 'https://esm.sh/lucide-react@0.395.0';

// --- [ادغام شد] Supabase Client (از supabaseClient.js) ---
// این متغیرها باید در Vercel تنظیم شوند
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log("✅ Supabase client initialized.");
} else {
  console.error(
    "FATAL: Supabase URL or Anon Key is missing. " +
    "Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in Vercel Environment Variables."
  );
  // ایجاد یک کلاینت mock برای جلوگیری از کرش کامل برنامه در حالت پیش‌نمایش
  supabase = {
    from: () => ({
      select: () => ({
        order: () => ({
          limit: () => Promise.resolve({ data: [], error: { message: "Supabase not configured" } })
        }),
        eq: () => ({
          order: () => ({
           limit: () => Promise.resolve({ data: [], error: { message: "Supabase not configured" } })
          })
        }),
        neq: () => ({
          order: () => ({
           limit: () => Promise.resolve({ data: [], error: { message: "Supabase not configured" } })
          })
        }),
      }),
      channel: () => ({
        on: () => ({
          subscribe: () => ({})
        })
      }),
      removeChannel: () => {}
    })
  };
}

// --- [ادغام شد] کامپوننت کمکی: CopyButton (مورد نیاز NVDTable و ExploitDBTable) ---
const CopyButton = ({ textToCopy, isId = false }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = (e) => {
        e.stopPropagation(); 
        try {
            // ایجاد یک textarea موقت
            const textarea = document.createElement('textarea');
            textarea.value = textToCopy;
            textarea.style.position = 'fixed'; 
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            
            // استفاده از execCommand برای سازگاری (navigator.clipboard در iFrame ها کار نمی‌کند)
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

// --- [ادغام شد] کامپوننت کمکی: SeverityBadge (مورد نیاز NVDTable) ---
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

// --- [ادغام شد] هوک کمکی: useTypewriter (مورد نیاز AIModelCard) ---
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


// --- [ادغام شد] کامپوننت NVDTable (از NVDTable.jsx) ---
const DEFAULT_ROWS_TO_SHOW = 10;
const INITIAL_DATE_FILTER = ''; 
const EARLIEST_MANUAL_DATA_YEAR = '2016-01-01'; 
const DEFAULT_START_DATE_FILTER = '2024-01-01'; 

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
        setError(`Database Error: ${err.message}. Check Supabase connection and table column names (ID, text, score, baseSeverity).`);
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
    
    // بررسی می‌کنیم که آیا در مرورگر هستیم یا خیر
    const isBrowser = typeof window !== 'undefined';
    const limit = (isBrowser && window.innerWidth < 640) ? 40 : 150; 
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
        &lt;-- برای دیدن ستون‌های بیشتر، جدول را بکشید --&gt;
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
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500" title={cve.vectorString}>{cve.vectorString ? cve.vectorString.substring(0, 30) + '...' : 'N/A'}</td>
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


// --- [ادغام شد] کامپوننت AIModelCard (از AIModelCard.jsx) ---
// --- Configuration ---
const HF_USER = "amirimmd";
const HF_SPACE_NAME = "ExBERT-Classifier-Inference";
const BASE_API_URL = `https://${HF_USER}-${HF_SPACE_NAME}.hf.space`;

const API_PREFIX = "/gradio_api";
const QUEUE_JOIN_URL = `${BASE_API_URL}${API_PREFIX}/queue/join`;
const QUEUE_DATA_URL = (sessionHash) => `${BASE_API_URL}${API_PREFIX}/queue/data?session_hash=${sessionHash}`;

// [NOTE] این متغیر خوانده می‌شود اما چون Space شما public است، در هدر ارسال استفاده نمی‌شود.
const HF_API_TOKEN = import.meta.env.VITE_HF_API_TOKEN;

if (!HF_API_TOKEN) {
  console.warn("⚠️ [AIModelCard] VITE_HF_API_TOKEN is missing! (Using public mode)");
} else {
  console.log("✅ [AIModelCard] VITE_HF_API_TOKEN loaded (though likely not needed for public space).");
}

const generateSessionHash = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 11; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const AIModelCard = ({ title, description, placeholder, modelId }) => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [typedOutput, startTypingProcess, isTyping] = useTypewriter(output, 20);
  const eventSourceRef = useRef(null);

  // منطق شبیه‌سازی برای مدل‌های غیر از ExBERT
  const simulateAnalysis = (query, modelId) => {
      let simulatedResponse = '';
      switch (modelId) {
        case 'xai': simulatedResponse = `[SIMULATED_XAI]: Analysis for "${query.substring(0,15)}..."`; break;
        case 'other': simulatedResponse = `[SIMULATED_GENERAL]: Query length: ${query.length}`; break;
        default: simulatedResponse = "ERROR: Simulated model not found.";
      }
      return simulatedResponse;
  };

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        console.log("Closing existing EventSource connection.");
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  const handleModelQuery = async (e) => {
    e.preventDefault();
    const query = input.trim();
    if (!query) return;

    setLoading(true);
    setError(null);
    startTypingProcess('');
    if (eventSourceRef.current) {
        console.log("Closing previous EventSource before new request.");
        eventSourceRef.current.close();
        eventSourceRef.current = null;
    }

    // شبیه‌سازی برای مدل‌های دیگر
    if (modelId !== 'exbert') {
      const response = simulateAnalysis(query, modelId);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setOutput(response);
      startTypingProcess(response);
      setLoading(false);
      return;
    }
    
    // --- [START] پیاده‌سازی منطق فراخوانی API عمومی ---
    const sessionHash = generateSessionHash(); // 1. تولید هش محلی
    
    try {
        console.log(`Step 1: Joining Gradio Queue at ${QUEUE_JOIN_URL}...`);
        
        // 2. ساخت هدرها (بدون نیاز به توکن Auth برای Space عمومی)
        const joinHeaders = {
            'Content-Type': 'application/json',
        };
        
        // 3. ساخت Payload دقیقاً مطابق اسکریپت پایتون
        const payload = {
            "data": [query],
            "event_data": null,
            "fn_index": 2,       // مطابق اسکریپت پایتون
            "trigger_id": 12,    // مطابق اسکریپت پایتون
            "session_hash": sessionHash
        };

        const joinResponse = await fetch(QUEUE_JOIN_URL, {
            method: 'POST',
            headers: joinHeaders, 
            body: JSON.stringify(payload) // 4. ارسال Payload
        });

        if (!joinResponse.ok) {
             const errorText = await joinResponse.text();
             console.error("Queue Join Error:", joinResponse.status, errorText);
             let detailedError = `Failed to join queue: ${joinResponse.status}.`;
             if (joinResponse.status === 401) {
                 detailedError = "API ERROR: 401 Unauthorized. Check Space permissions (should be public).";
             } else if (joinResponse.status === 422) {
                 detailedError = `API ERROR: 422 Validation Error. Check fn_index/trigger_id.`;
             } else {
                 detailedError += ` ${errorText.substring(0, 150)}`;
             }
             throw new Error(detailedError);
        }

        const joinResult = await joinResponse.json();
        
        // 5. بررسی event_id
        if (!joinResult.event_id) {
             if (joinResult.error) { throw new Error(`Queue join returned error: ${joinResult.error}`); }
             throw new Error("Failed to get event_id from queue join.");
        }
        console.log(`Step 2: Joined queue successfully with event_id: ${joinResult.event_id} and session_hash: ${sessionHash}`);

        // --- Listening for data (EventSource) ---
        // 6. گوش دادن به /queue/data با استفاده از session_hash
        console.log(`Step 3: Listening for results via EventSource at ${QUEUE_DATA_URL(sessionHash)}...`);
        const dataUrl = QUEUE_DATA_URL(sessionHash);

        eventSourceRef.current = new EventSource(dataUrl); 

        eventSourceRef.current.onmessage = (event) => {
            try {
                // 7. دریافت جریان داده‌ها
                const message = JSON.parse(event.data);
                console.log("Parsed SSE message:", message);

                switch (message.msg) {
                    case "process_starts":
                        setOutput("Processing started...");
                        startTypingProcess("Processing started...");
                        break;
                    case "process_generating": break;
                    case "process_completed":
                        // 8. دریافت نتیجه نهایی
                        console.log("Processing completed. Raw output:", JSON.stringify(message.output, null, 2));
                        if (message.success && message.output && message.output.data && message.output.data.length > 0) {
                            
                            // 9. استخراج خروجی
                            const rawPrediction = message.output.data[0];
                            let formattedOutput = `[EXBERT_REPORT]: ${rawPrediction}`;

                            setOutput(formattedOutput);
                            startTypingProcess(formattedOutput);
                        } else {
                             const errorMsg = message.output?.error || "Unknown server processing error.";
                             setError(`Processing failed: ${errorMsg}`);
                             setOutput(''); startTypingProcess('');
                        }
                        if(eventSourceRef.current) eventSourceRef.current.close();
                        eventSourceRef.current = null;
                        setLoading(false);
                        break;
                     case "queue_full":
                         setError("API Error: The queue is full, please try again later.");
                         if(eventSourceRef.current) eventSourceRef.current.close();
                         eventSourceRef.current = null;
                         setLoading(false);
                         break;
                     case "estimation":
                         const queuePosition = message.rank !== undefined ? message.rank + 1 : '?';
                         const queueSize = message.queue_size !== undefined ? message.queue_size : '?';
                         const eta = message.rank_eta !== undefined ? message.rank_eta.toFixed(1) : '?';
                         const waitMsg = `In queue (${queuePosition}/${queueSize}). Est. wait: ${eta}s...`;
                         if (loading) {
                             setOutput(waitMsg);
                             startTypingProcess(waitMsg);
                         }
                         break;
                    case "close_stream":
                        console.log("Stream closed by server.");
                        if(eventSourceRef.current) eventSourceRef.current.close();
                        eventSourceRef.current = null;
                        if (loading) { // اگر هنوز در حال بارگذاری بودیم و نتیجه نیامد
                            setLoading(false);
                            if (!output && !error) {
                                setError("Stream closed unexpectedly before result.");
                            }
                        }
                        break;
                    default:
                        break;
                }
            } catch (parseError) {
                 console.warn("Could not parse SSE message, maybe it's not JSON:", event.data);
            }
        };

        eventSourceRef.current.onerror = (error) => {
            let errorMsg = "Error connecting to API stream.";
             if (typeof navigator !== 'undefined' && !navigator.onLine) {
                 errorMsg += " Check your network connection.";
             } else {
                 errorMsg += " Could not maintain connection. Check Space status/logs."; 
             }
            setError(errorMsg);
             if(eventSourceRef.current) eventSourceRef.current.close();
            eventSourceRef.current = null;
            setLoading(false);
            setOutput('');
            startTypingProcess('');
        };

    } catch (err) {
        let displayError = err.message || "An unknown error occurred.";
        if (err.message.includes("Failed to fetch")) {
            displayError = "API ERROR: Network error or CORS issue. Check browser console and Space status.";
        } else if (err.message.includes("503")) {
             displayError = "API ERROR: 503 Service Unavailable. The Space might be sleeping/overloaded. Wait and retry.";
        }
       setError(displayError);
       setLoading(false);
       setOutput('');
       startTypingProcess('');
        if (eventSourceRef.current) {
           eventSourceRef.current.close();
           eventSourceRef.current = null;
        }
    }
    // --- [END] پیاده‌سازی ---
  };

  // --- Render logic ---
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

      <div className="mt-4 bg-dark-bg rounded-lg p-3 text-cyber-green text-sm min-h-[100px] border border-cyber-green/30 overflow-auto">
         {typedOutput}
         {isTyping ? <span className="typing-cursor"></span> : null}
         {!loading && !error && !output && !typedOutput && (
             <span className="text-gray-500">MODEL.RESPONSE.STANDBY...</span>
         )}
      </div>
    </div>
  );
};

// --- [ادغام شد] کامپوننت ExploitDBTable (از ExploitDBTable.jsx) ---
const EXPLOITS_TO_SHOW = 10;
const HALF_EXPLOITS = EXPLOITS_TO_SHOW / 2;

const extractYearFromId = (id) => {
    const match = id?.match(/(\d{4})/); 
    return match ? match[1] : 'N/A';
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
        .limit(HALF_EXPLOITS); 

      const query0 = supabase
        .from('exploits')
        .select('ID, Description, Exploitability')
        .neq('Exploitability', 1) 
        .order('ID', { ascending: false })
        .limit(HALF_EXPLOITS); 

      const [response1, response0] = await Promise.all([query1, query0]);

      if (response1.error) throw response1.error;
      if (response0.error) throw response0.error;

      const data1 = response1.data || [];
      const data0 = response0.data || [];

      console.log(`ExploitDBTable: Fetched ${data1.length} (Label 1) and ${data0.length} (Label 0/Other).`);

      let combinedData = [...data1, ...data0];
      
      combinedData.sort((a, b) => (a.ID < b.ID ? 1 : a.ID > b.ID ? -1 : 0));
      
      const finalSet = combinedData.slice(0, EXPLOITS_TO_SHOW);

      console.log(`ExploitDBTable: Final display set size: ${finalSet.length}`);
      setLatestExploits(finalSet);

    } catch (error) {
      console.error('Error fetching Exploit-DB feed:', error.message);
      setError(`Database Query Error: ${error.message}. Check RLS, the 'exploits' table structure, and data content.`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log('ExploitDBTable: Component mounted, starting initial fetch.');
    
    fetchLatestExploits();
    
    const exploitSubscription = supabase
        .channel('exploits_changes')
        .on(
            'postgres_changes', 
            { event: '*', schema: 'public', table: 'exploits' }, 
            (payload) => {
                 console.log('ExploitDBTable: Realtime change detected, refetching...');
                 fetchLatestExploits(); 
            }
        )
        .subscribe();

    return () => {
        console.log('ExploitDBTable: Component unmounting, removing subscription.');
        supabase.removeChannel(exploitSubscription);
    };
  }, [fetchLatestExploits]); 

  return (
    <div className="flex flex-col h-full min-h-[400px]">
      
      {loading && (
        <div className="text-center py-10 text-cyber-cyan">
            <Loader2 className="animate-spin h-8 w-8 mx-auto mb-2" />
            <span>LOADING EXPLOIT_DB_FEED...</span>
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
          <Swords className="w-10 h-10 mx-auto mb-2" />
          <span className="block mb-2 text-sm text-gray-400">NO LATEST EXPLOITS FOUND_ (TABLE EMPTY)</span>
          <p className="text-xs text-cyber-text/70 px-4">
            If this message persists, please ensure your Exploit-DB synchronization script is running correctly.
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
                       YEAR: {extractYearFromId(exploit.ID)}
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
             <Swords className="w-4 h-4 mr-2" />
             {loading ? 'REFRESHING...' : 'REFRESH_FEED_'}
          </button>
       </div>
    </div>
  );
};


// --- [جدید] کامپوننت‌های کمکی برای چیدمان تب ---

// (Wrapper) کامپوننت برای مدل‌های هوش مصنوعی
const AIModels = () => (
  <section id="ai-models-section" className="cyber-card mb-12">
    <div className="flex items-center mb-6">
      <BrainCircuit className="icon-green w-8 h-8 mr-3 flex-shrink-0" />
      <h2 className="text-2xl font-semibold text-green-300 break-words min-w-0">INTELLIGENT.ANALYSIS.UNIT_</h2>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <AIModelCard 
        title="MODEL::EXBERT_"
        description="Base BERT model for security context evaluation."
        placeholder="INITIATE_EXBERT_QUERY..."
        modelId="exbert"
      />
      <AIModelCard 
        title="MODEL::EXBERT.XAI_"
        description="Explainable AI (XAI) for transparent threat assessment."
        placeholder="INITIATE_XAI_QUERY..."
        modelId="xai"
      />
      <AIModelCard 
        title="MODEL::GENERAL.PURPOSE_"
        description="Versatile language processing for auxiliary tasks."
        placeholder="INITIATE_GENERAL_QUERY..."
        modelId="other"
      />
    </div>
  </section>
);

// (Placeholder) کامپوننت برای تب ورود کاربر
const LoginTab = () => (
  <div className="p-6 text-center cyber-card">
    <User className="w-16 h-16 mx-auto text-cyber-cyan" />
    <h2 className="text-2xl font-semibold text-cyan-300 mt-4">USER.LOGIN_</h2>
    <p className="text-gray-400 mt-2">Authentication module standby.</p>
    <div className="mt-6 space-y-4">
      <input type="text" placeholder="USERNAME_" className="cyber-input" />
      <input type="password" placeholder="PASSWORD_" className="cyber-input" />
      <button className="cyber-button w-full">AUTHENTICATE_</button>
    </div>
  </div>
);

// (Reusable) کامپوننت برای دکمه‌های نوار تب
const TabButton = ({ icon: Icon, label, tabName, activeTab, setActiveTab }) => (
  <button
    onClick={() => setActiveTab(tabName)}
    className={`flex flex-col items-center justify-center p-3 w-full transition-all duration-200 ${
      activeTab === tabName 
      ? 'text-cyber-cyan' 
      : 'text-gray-500 hover:text-gray-300'
    }`}
  >
    <Icon className={`w-6 h-6 ${activeTab === tabName ? 'animate-flicker' : ''}`} />
    <span className="text-xs mt-1">{label}</span>
  </button>
);

// --- [بازنویسی شده] کامپوننت اصلی App ---
function App() {
  // state برای مدیریت تب فعال در موبایل
  // تب پیش فرض 'ai' (مدل‌های هوش مصنوعی) است
  const [activeTab, setActiveTab] = useState('ai');

  return (
    <>
      {/* Background Grid Effect */}
      <div className="background-grid"></div>

      {/* کانتینر اصلی */}
      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8 relative z-10">

        {/* هدر اصلی */}
        <h1 className="text-3xl md:text-5xl font-bold text-center mb-10 bg-clip-text text-transparent bg-gradient-to-r from-cyber-green to-cyber-cyan section-header break-words">
          ::CYBERNETIC.INTELLIGENCE.HUB::
        </h1>

        {/* --- 1. نمایش دسکتاپ (مخفی در موبایل) --- */}
        <div className="hidden md:block space-y-12">
          {/* NVD Section (Desktop) */}
          <section id="nvd-section" className="cyber-card">
            <div className="flex items-center mb-6">
              <ShieldAlert className="icon-cyan w-8 h-8 mr-3 flex-shrink-0" />
              <h2 className="text-2xl font-semibold text-cyan-300">NVD Vulnerability Feed_</h2>
            </div>
            <NVDTable />
          </section>

          {/* AI Models Section (Desktop) */}
          <AIModels />

          {/* Exploit DB Section (Desktop) */}
          <section id="exploit-db-section" className="cyber-card">
             <div className="flex items-center mb-6">
              <Swords className="icon-red w-8 h-8 mr-3 flex-shrink-0" />
              <h2 className="text-2xl font-semibold text-red-300">EXPLOIT.DB.LATEST_</h2>
            </div>
            <ExploitDBTable />
          </section>
        </div>

        {/* --- 2. نمایش موبایل (مخفی در دسکتاپ) --- */}
        <div className="md:hidden pb-24"> {/* pb-24 برای ایجاد فضا برای نوار تب پایین */}
          
          {/* محتوای تب بر اساس state */}
          <div className="mobile-content-area">
            {activeTab === 'nvd' && (
              <section id="nvd-section-mobile" className="cyber-card">
                <div className="flex items-center mb-6">
                  <ShieldAlert className="icon-cyan w-8 h-8 mr-3" />
                  <h2 className="text-2xl font-semibold text-cyan-300">NVD Feed_</h2>
                </div>
                <NVDTable />
              </section>
            )}
            
            {activeTab === 'ai' && (
               <AIModels /> // استفاده مجدد از کامپوننت Wrapper
            )}

            {activeTab === 'exploits' && (
              <section id="exploit-db-section-mobile" className="cyber-card">
                <div className="flex items-center mb-6">
                  <Swords className="icon-red w-8 h-8 mr-3" />
                  <h2 className="text-2xl font-semibold text-red-300">Exploit DB_</h2>
                </div>
                <ExploitDBTable />
              </section>
            )}

            {activeTab === 'user' && (
              <LoginTab />
            )}
          </div>

          {/* نوار تب ثابت در پایین صفحه */}
          {/* [اصلاح شد] ترتیب دکمه‌ها تغییر کرد تا 'AI Models' اول باشد */}
          <nav className="fixed bottom-0 left-0 right-0 bg-cyber-card border-t border-cyber-cyan/30 flex justify-around items-center z-50 shadow-lg shadow-cyber-cyan/10">
            <TabButton icon={BrainCircuit} label="AI Models" tabName="ai" activeTab={activeTab} setActiveTab={setActiveTab} />
            <TabButton icon={ShieldAlert} label="NVD" tabName="nvd" activeTab={activeTab} setActiveTab={setActiveTab} />
            <TabButton icon={Swords} label="Exploits" tabName="exploits" activeTab={activeTab} setActiveTab={setActiveTab} />
            <TabButton icon={User} label="User" tabName="user" activeTab={activeTab} setActiveTab={setActiveTab} />
          </nav>
        </div>

      </div>
    </>
  );
}

export default App;

