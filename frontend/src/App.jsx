// frontend/src/App.jsx
// [فایل کامل] 
// [ویرایش شد] بخش AIModels به یک رابط چت واحد با قابلیت انتخاب مدل تبدیل شد.
// [حفظ شد] تمام کامپوننت‌های دیگر (NVD, ExploitDB) و منطق آن‌ها.

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
// [اصلاح شد] ایمپورت‌ها به CDN (esm.sh) تغییر یافتند تا در محیط پیش‌نمایش به درستی کار کنند.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { 
  BrainCircuit, ShieldAlert, Swords, 
  Loader2, Filter, DatabaseZap, Clipboard, 
  User, Database, BarChart2,
  Swords as SwordsIcon,
  Send // [جدید] آیکون ارسال
} from 'https://esm.sh/lucide-react@0.395.0'; 

// --- Supabase Client (ادغام شده) ---
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
            document.execCommand('copy'); 
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500); 
        } catch (err) {
            console.error('Failed to copy text:', err);
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
// [بدون تغییر]
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


// --- [START] منطق چت هوش مصنوعی ---
// این بخش جایگزین کامپوننت AIModelCard می‌شود

const HF_USER = "amirimmd";
const HF_SPACE_NAME = "ExBERT-Classifier-Inference";
const BASE_API_URL = `https://${HF_USER}-${HF_SPACE_NAME}.hf.space`;

const API_PREFIX = "/gradio_api";
const QUEUE_JOIN_URL = `${BASE_API_URL}${API_PREFIX}/queue/join`;
const QUEUE_DATA_URL = (sessionHash) => `${BASE_API_URL}${API_PREFIX}/queue/data?session_hash=${sessionHash}`;

const HF_API_TOKEN = import.meta.env.VITE_HF_API_TOKEN || ""; 

const generateSessionHash = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 11; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

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


// [جدید] کامپوننت رابط چت هوش مصنوعی
const AIChatInterface = () => {
    const [activeModel, setActiveModel] = useState('exbert');
    const [messages, setMessages] = useState([
        { 
            id: 'init',
            sender: 'model', 
            model: 'exbert', 
            text: 'SYSTEM.BOOT_UP: AI Analysis Unit is online. Please select a model and initiate your query.' 
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const eventSourceRef = useRef(null);
    const messagesEndRef = useRef(null);

    // تعریف مدل‌ها
    const models = {
        'exbert': { 
            title: "MODEL::EXBERT_", 
            description: "Custom BERT+LSTM model for exploitability estimation.", 
            placeholder: "INITIATE_EXBERT_QUERY..." 
        },
        'xai': { 
            title: "MODEL::EXBERT.XAI_", 
            description: "[SIMULATED] Explainable AI for threat assessment.", 
            placeholder: "INITIATE_XAI_QUERY..." 
        },
        'other': { 
            title: "MODEL::GENERAL.PURPOSE_", 
            description: "[SIMULATED] Versatile language processing.", 
            placeholder: "INITIATE_GENERAL_QUERY..." 
        },
    };
    
    // Typewriter برای آخرین پیام
    const [typedOutput, startTypingProcess, isTyping] = useTypewriter('', 20);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages, typedOutput]); // اسکرول با پیام جدید یا تایپ

    useEffect(() => {
        // پاکسازی EventSource در زمان unmount
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, []);

    // منطق شبیه‌سازی برای مدل‌های دوم و سوم
    const simulateAnalysis = (query, modelId) => {
      let simulatedResponse = '';
      switch (modelId) {
        case 'xai': simulatedResponse = `[SIMULATED_XAI_REPORT]:\nAnalysis for "${query.substring(0,15)}..." shows high attention on token [X].\nPredicted Label: 1\nConfidence: 0.85`; break;
        case 'other': simulatedResponse = `[SIMULATED_GENERAL_REPORT]:\nQuery processed by General Purpose Model.\nInput Length: ${query.length} chars.\nStatus: OK`; break;
        default: simulatedResponse = "ERROR: Simulated model not found.";
      }
      return simulatedResponse;
    };

    // تابع اصلی ارسال کوئری
    const handleQuerySubmit = async (e) => {
        e.preventDefault();
        const query = input.trim();
        if (!query || loading) return;

        setLoading(true);
        setError(null);
        startTypingProcess(''); // پاک کردن تایپ قبلی

        const userMessage = {
            id: `user-${messages.length}`,
            sender: 'user',
            model: activeModel,
            text: query
        };
        
        // اضافه کردن پیام کاربر و یک نگه‌دارنده (placeholder) برای پاسخ مدل
        setMessages(prev => [
            ...prev, 
            userMessage, 
            { id: `model-${messages.length}`, sender: 'model', model: activeModel, text: '', isLoading: true }
        ]);
        
        setInput(''); // پاک کردن فیلد ورودی

        if (eventSourceRef.current) {
            console.log("Closing previous EventSource before new request.");
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        // --- مدیریت منطق مدل ---
        if (activeModel !== 'exbert') {
            const response = simulateAnalysis(query, activeModel);
            await new Promise(resolve => setTimeout(resolve, 1000)); // شبیه‌سازی تاخیر شبکه
            
            // به‌روزرسانی آخرین پیام (نگه‌دارنده)
            setMessages(prev => prev.map((msg, index) => 
                index === prev.length - 1 
                ? { ...msg, text: response, isLoading: false } 
                : msg
            ));
            startTypingProcess(response); // شروع تایپ پاسخ کامل
            setLoading(false);
            return;
        }

        // --- [START] منطق /queue/join مدل ExBERT ---
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

            // --- گوش دادن به EventSource ---
            const dataUrl = QUEUE_DATA_URL(sessionHash);
            eventSourceRef.current = new EventSource(dataUrl); 

            let fullResponseText = '';

            eventSourceRef.current.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    let currentText = '';
                    let isComplete = false;
                    let isError = false;

                    switch (message.msg) {
                        case "process_starts":
                            currentText = "Processing started...";
                            break;
                        case "estimation":
                            const queuePosition = message.rank !== undefined ? message.rank + 1 : '?';
                            const queueSize = message.queue_size !== undefined ? message.queue_size : '?';
                            const eta = message.rank_eta !== undefined ? message.rank_eta.toFixed(1) : '?';
                            currentText = `In queue (${queuePosition}/${queueSize}). Est. wait: ${eta}s...`;
                            break;
                        case "process_completed":
                            if (message.success && message.output?.data?.[0]) {
                                fullResponseText = `[EXBERT_REPORT]:\n${message.output.data[0]}`;
                                currentText = fullResponseText;
                            } else {
                                currentText = `Processing failed: ${message.output?.error || "Unknown error."}`;
                                isError = true;
                            }
                            isComplete = true;
                            break;
                        case "queue_full":
                            currentText = "API Error: The queue is full, please try again later.";
                            isComplete = true;
                            isError = true;
                            break;
                        case "close_stream":
                            isComplete = true;
                            if (!fullResponseText && !error) {
                                currentText = "Stream closed unexpectedly.";
                                isError = true;
                            }
                            break;
                        default:
                            return; // عدم به‌روزرسانی برای پیام‌های ناشناخته
                    }

                    if (isComplete) {
                        if(eventSourceRef.current) eventSourceRef.current.close();
                        eventSourceRef.current = null;
                        setLoading(false);
                        if (isError) setError(currentText);
                        
                        // تنظیم متن نهایی در نگه‌دارنده
                        setMessages(prev => prev.map((msg, index) => 
                            index === prev.length - 1 
                            ? { ...msg, text: fullResponseText || currentText, isLoading: false } 
                            : msg
                        ));
                        // شروع تایپ پاسخ نهایی (اگر موفق بود)
                        if (fullResponseText) startTypingProcess(fullResponseText);

                    } else {
                        // به‌روزرسانی نگه‌دارنده با وضعیت لودینگ
                        setMessages(prev => prev.map((msg, index) => 
                            index === prev.length - 1 
                            ? { ...msg, text: currentText, isLoading: true } 
                            : msg
                        ));
                    }
                } catch (parseError) {
                    console.warn("Could not parse SSE message:", event.data);
                }
            };

            eventSourceRef.current.onerror = (err) => {
                let errorMsg = "Error connecting to API stream.";
                 if (!navigator.onLine) {
                     errorMsg += " Check your network connection.";
                 } else {
                     errorMsg += " Could not maintain connection. Check Space status/logs."; 
                 }
                setError(errorMsg);
                setMessages(prev => prev.map((msg, index) => 
                    index === prev.length - 1 
                    ? { ...msg, text: errorMsg, isLoading: false } 
                    : msg
                ));
                 if(eventSourceRef.current) eventSourceRef.current.close();
                eventSourceRef.current = null;
                setLoading(false);
            };

        } catch (err) {
            let displayError = err.message || "An unknown error occurred.";
            if (err.message.includes("Failed to fetch")) {
                displayError = "API ERROR: Network error or CORS issue. Check browser console and Space status.";
            } else if (err.message.includes("503")) {
                 displayError = "API ERROR: 503 Service Unavailable. The Space might be sleeping/overloaded. Wait and retry.";
            }
           setError(displayError);
           setMessages(prev => prev.map((msg, index) => 
                index === prev.length - 1 
                ? { ...msg, text: displayError, isLoading: false } 
                : msg
            ));
           setLoading(false);
            if (eventSourceRef.current) {
               eventSourceRef.current.close();
               eventSourceRef.current = null;
            }
        }
        // --- [END] منطق ExBERT ---
    };

    // تابع کمکی برای استایل‌دهی حباب‌های چت
    const getMessageStyle = (sender, model) => {
        if (sender === 'user') {
            return 'chat-bubble-user';
        }
        // Model message
        let colorClass = 'chat-bubble-model-green'; // Default (exbert)
        if (model === 'xai') colorClass = 'chat-bubble-model-cyan';
        if (model === 'other') colorClass = 'chat-bubble-model-yellow';
        return colorClass;
    };

    // تابع کمکی برای آیکون مدل
    const getModelIcon = (model) => {
        if (model === 'xai') return <BrainCircuit className="w-4 h-4 mr-2 text-cyber-cyan/70 flex-shrink-0" />;
        if (model === 'other') return <Database className="w-4 h-4 mr-2 text-cyber-yellow/70 flex-shrink-0" />;
        return <BrainCircuit className="w-4 h-4 mr-2 text-cyber-green/70 flex-shrink-0" />; // Default (exbert)
    };

    return (
        <div className="bg-gray-900 rounded-lg shadow-inner shadow-cyber-green/10 border border-cyber-green/20 flex flex-col h-[80vh] max-h-[700px] min-h-[500px]">
            {/* هدر / تب‌های انتخاب مدل */}
            <div className="flex flex-col sm:flex-row border-b border-cyber-green/20 p-2 space-y-2 sm:space-y-0">
                {/* دکمه‌های تب */}
                <div className="flex flex-wrap flex-1">
                    {Object.keys(models).map(modelId => (
                        <button
                            key={modelId}
                            onClick={() => !loading && setActiveModel(modelId)}
                            disabled={loading}
                            className={`px-4 py-2 text-sm font-bold rounded-md mr-2 mb-2 sm:mb-0 transition-all duration-200 animate-border-pulse-fast ${
                                activeModel === modelId
                                ? 'bg-cyber-green text-dark-bg shadow-lg shadow-cyber-green/50'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {models[modelId].title}
                        </button>
                    ))}
                </div>
                 {/* توضیحات مدل فعلی */}
                 <p className="text-xs text-cyber-cyan/80 text-left sm:text-right px-2 py-1 bg-dark-bg rounded-md flex-shrink-0 self-start sm:self-center max-w-full">
                    <span className="font-bold text-white">ACTIVE:</span> {models[activeModel].description}
                 </p>
            </div>

            {/* تاریخچه چت */}
            <div className="flex-grow p-4 overflow-y-auto space-y-4 chat-history-bg">
                {messages.map((msg, index) => {
                    const isLastMessage = index === messages.length - 1;
                    // آیا این آخرین پیام است، در حال تایپ است، و از طرف مدل است؟
                    const isTypingMessage = isLastMessage && isTyping && msg.sender === 'model' && !msg.isLoading;
                    
                    return (
                        <div 
                            key={msg.id} 
                            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                        >
                            <div className={`chat-bubble ${getMessageStyle(msg.sender, msg.model)}`}>
                                <div className="flex items-center text-xs font-bold mb-1 opacity-70">
                                    {msg.sender === 'model' 
                                        ? getModelIcon(msg.model) 
                                        : <User className="w-4 h-4 mr-2 text-cyber-cyan/70 flex-shrink-0" />
                                    }
                                    {msg.sender === 'user' ? 'USER_QUERY' : models[msg.model]?.title || 'SYSTEM'}
                                </div>
                                {/* [ویرایش شد] منطق نمایش متن برای تایپ‌رایتر */}
                                <div className="whitespace-pre-wrap break-words">
                                    {isTypingMessage ? (
                                        <>
                                            {typedOutput}
                                            <span className="typing-cursor"></span>
                                        </>
                                    ) : msg.isLoading ? (
                                        <span className="flex items-center">
                                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                          {msg.text || 'Processing...'}
                                        </span>
                                    ) : (
                                        msg.text
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* نمایش خطا */}
            {error && (
                <p className="m-4 mt-0 text-xs text-cyber-red p-2 bg-red-900/30 rounded border border-red-500/50">
                    {error}
                </p>
            )}

            {/* فرم ورودی */}
            <form onSubmit={handleQuerySubmit} className="p-4 border-t border-cyber-green/20">
                <div className="flex space-x-3">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="cyber-input flex-grow"
                        placeholder={loading ? 'ANALYZING...' : models[activeModel].placeholder}
                        disabled={loading}
                    />
                    <button 
                        type="submit" 
                        className="cyber-button flex-shrink-0 px-4" // پدینگ کمتر برای دکمه آیکون
                        disabled={loading || !input.trim()}
                    >
                        {loading ? (
                            <Loader2 className="animate-spin h-5 w-5" />
                        ) : (
                            <Send className="h-5 w-5" />
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};
// --- [END] منطق چت هوش مصنوعی ---


// --- [START] کامپوننت ExploitDBTable (اصلاح شده) ---
// [بدون تغییر]
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


// --- کامپوننت‌های Wrapper برای تب‌ها ---
// [بدون تغییر]
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

  // --- [جدید] کامپوننت Wrapper برای رابط چت هوش مصنوعی ---
  const AIModelsChat = () => (
    <section id="ai-models-section" className="cyber-card mb-12">
      <div className="flex items-center mb-6">
        <BrainCircuit className="icon-green w-8 h-8 mr-3 flex-shrink-0" />
        <h2 className="text-2xl font-semibold text-green-300 break-words min-w-0">INTELLIGENT.ANALYSIS.UNIT_</h2>
      </div>
      {/* جایگزینی گرید قبلی با رابط چت جدید */}
      <AIChatInterface />
    </section>
  );
  // --- [END] کامپوننت Wrapper ---

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
          {/* [ویرایش شد] استفاده از Wrapper جدید چت */}
          <AIModelsChat />
          <NVDTab />
          <ExploitDBTab />
        </div>
        {/* --- [END] چیدمان دسکتاپ --- */}


        {/* --- [START] چیدمان اپلیکیشن موبایل (زیر md) --- */}
        <div className="md:hidden pb-20"> 
          
          <div id="mobile-tab-content">
            {/* [ویرایش شد] استفاده از Wrapper جدید چت */}
            {activeTab === 'ai' && <AIModelsChat />}
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
