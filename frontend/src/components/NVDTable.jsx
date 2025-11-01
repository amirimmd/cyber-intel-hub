// frontend/src/components/NVDTable.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
// [FINAL FIX] آدرس دهی نهایی به فایل supabaseClient.js (با فرض وجود این نام فایل)
import { supabase } from '../supabaseClient.js'; 
import { Loader2, Filter, DatabaseZap, Clipboard } from 'lucide-react';

// --- Constants ---
const DEFAULT_ROWS_TO_SHOW = 10;
const INITIAL_DATE_FILTER = ''; 
const EARLIEST_MANUAL_DATA_YEAR = '2016-01-01'; 
const DEFAULT_START_DATE_FILTER = '2024-01-01'; 
// -----------------

// Helper for severity badges (استایل‌های سایبرپانک شما)
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

// تابع کمکی برای استخراج سال از CVE ID
const extractYearFromCveId = (cveId) => {
    const match = cveId?.match(/CVE-(\d{4})-\d+/);
    return match ? parseInt(match[1], 10) : null;
};

// کامپوننت دکمه کپی (با استایل سایبرپانک)
const CopyButton = ({ textToCopy, isId = false }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
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
        'ml-2 px-2 py-1 text-xs font-mono rounded-full transition-all duration-150';
    
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


const NVDTable = () => {
  // cveData به allData تغییر داده شد تا با منطق فیلترینگ سمت کلاینت هماهنگ شود
  const [allData, setAllData] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // تعریف فیلترهای مورد نیاز
  const [filters, setFilters] = useState({ 
    keyword: '', 
    severity: 'all', 
    date: INITIAL_DATE_FILTER // شروع با حالت "همه آسیب‌پذیری‌ها"
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value === 'all_dates' ? INITIAL_DATE_FILTER : value }));
  };

  /**
   * واکشی داده‌های خام از Supabase
   * توجه: استفاده از ID, text, baseSeverity, score, published_date, vectorString
   */
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
        const { data, error: fetchError } = await supabase
        .from('vulnerabilities') // نام جدول شما
        .select('ID, text, baseSeverity, score, published_date, vectorString') 
        .order('ID', { ascending: false }) // مرتب سازی بر اساس ID (جدیدترین)
        .limit(5000); // محدود کردن تعداد رکوردها

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

  /**
   * اعمال فیلترها (جستجو، شدت، تاریخ تخمینی) سمت کلاینت
   */
  const filteredVulnerabilities = useMemo(() => {
    if (loading || error) return [];

    let filtered = allData;
    const { keyword, severity, date } = filters;
    
    const isFilteredOrSearched = keyword.toLowerCase().trim() || severity !== 'all' || date; 

    // 1. فیلتر کلمات کلیدی
    const lowerKeyword = keyword.toLowerCase().trim();
    if (lowerKeyword) {
        filtered = filtered.filter(cve => 
            cve.ID?.toLowerCase().includes(lowerKeyword) || 
            cve.text?.toLowerCase().includes(lowerKeyword)
        );
    }
    
    // 2. فیلتر شدت
    if (severity !== 'all') {
        filtered = filtered.filter(cve => 
            String(cve.baseSeverity).toUpperCase() === severity.toUpperCase()
        );
    }

    // 3. فیلتر تاریخ (با استفاده از ID در صورت NULL بودن published_date)
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
    
    // 4. اعمال محدودیت نمایش اولیه
    if (!isFilteredOrSearched) {
        return filtered.slice(0, DEFAULT_ROWS_TO_SHOW);
    }

    return filtered;
  }, [allData, loading, error, filters]);
  
  // تابع کمکی برای نمایش عنوان کوتاه شده و تصمیم‌گیری برای نمایش دکمه کپی
  const truncateText = (text) => {
    if (!text) return { display: 'N/A', needsCopy: false };
    
    const limit = window.innerWidth < 640 ? 50 : 150; 
    const needsCopy = text.length > limit;

    if (needsCopy) {
        return { 
            display: text.substring(0, limit) + '...', 
            needsCopy: true 
        };
    }
    return { display: text, needsCopy: false };
  }

  // --- Render logic (با استایل‌های سایبرپانک بازگردانده شده) ---
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
        {/* فیلتر تاریخ با گزینه "همه آسیب‌پذیری‌ها" */}
        <div>
            <label htmlFor="nvd-date" className="block text-sm font-medium text-gray-400 mb-1">Published After (Estimated):</label>
            {filters.date ? (
                // حالت انتخاب تاریخ
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
                // حالت نمایش "همه"
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
            
            {/* دکمه‌های سوئیچ بین حالت "همه" و "انتخاب تاریخ" */}
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
                    <span>LOADING NVD_DATA_STREAM (Fetching All Required Data)...</span>
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
                  {/* دکمه کپی برای CVE ID */}
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-cyber-cyan">
                    <div className="flex items-center space-x-1">
                        <a href={`https://nvd.nist.gov/vuln/detail/${cve.ID}`} target="_blank" rel="noopener noreferrer" className="hover:underline">{cve.ID}</a>
                        <CopyButton textToCopy={cve.ID} isId={true} />
                    </div>
                  </td>
                  {/* نمایش متن کوتاه شده و دکمه کپی */}
                  <td className="px-3 sm:px-6 py-4 text-sm text-cyber-text max-w-xs min-w-40" title={cve.text}>
                      <div className="flex items-start">
                          <p>{truncatedText}</p>
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

export default NVDTable;
