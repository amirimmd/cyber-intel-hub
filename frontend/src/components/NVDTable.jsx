// frontend/src/components/NVDTable.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
// [FIX] برگشت به پسوند .js برای رفع مشکل آدرس‌دهی در برخی محیط‌ها
import { supabase } from '../supabaseClient.js'; 
import { Loader2, Filter, DatabaseZap } from 'lucide-react';

// تاریخ شروع فیلتر پیش‌فرض برای نمایش داده‌های اخیر
const DEFAULT_START_DATE_FILTER = '2024-01-01'; 
// حداقل مجاز برای ورودی date (سال 2016)
const EARLIEST_MANUAL_DATA_YEAR = '2016-01-01'; 

// Helper for severity badges
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

// تابع کمکی برای استخراج سال از CVE ID (مثلاً CVE-2024-3839 -> 2024)
const extractYearFromCveId = (cveId) => {
    const match = cveId?.match(/CVE-(\d{4})-\d+/);
    return match ? parseInt(match[1], 10) : null;
};

// کامپوننت اصلی جدول NVD
const NVDTable = () => {
  const [allData, setAllData] = useState([]); // نگه داشتن تمام داده‌های واکشی شده
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [filters, setFilters] = useState({ 
    keyword: '', 
    severity: 'all', 
    date: DEFAULT_START_DATE_FILTER 
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  /**
   * واکشی تمام داده‌های مورد نیاز برای فیلترینگ سمت کلاینت
   * این تابع فقط یک بار در ابتدا اجرا می‌شود.
   */
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    // [FIX] حذف فیلتر published_date از کوئری Supabase.
    // به جای آن، ما فقط داده‌هایی را که می‌خواهیم (مثلاً 5000 مورد آخر) واکشی می‌کنیم 
    // تا بتوانیم فیلتر تاریخ را در سمت کلاینت مدیریت کنیم.
    let query = supabase
      .from('vulnerabilities')
      .select('ID, text, baseSeverity, score, published_date, vectorString') 
      // مرتب‌سازی بر اساس ID برای گرفتن جدیدترین داده‌ها
      .order('ID', { ascending: false }) 
      .limit(5000); // افزایش محدودیت برای پوشش داده‌های بیشتر (اگرچه نباید خیلی زیاد باشد)

    const { data, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching NVD data:', fetchError);
      setError(`Database Error: ${fetchError.message}`);
    } else {
      // داده‌های خام را ذخیره می‌کنیم
      setAllData(data || []);
    }
    setLoading(false);
  }, []);

  // اجرای واکشی اولیه
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]); 

  /**
   * اعمال فیلترهای کلاینت بر روی داده‌های واکشی شده
   */
  const filteredVulnerabilities = useMemo(() => {
    if (loading || error) return [];

    let filtered = allData;
    const { keyword, severity, date } = filters;

    // 1. فیلتر کلمات کلیدی و شدت (سمت کلاینت)
    // توجه: در حالت ایده‌آل، keyword/severity هم باید سمت سرور انجام شود (همانند قبل) 
    // اما برای سادگی در این مرحله و مدیریت مشکل تاریخ، آن را در سمت کلاینت مدیریت می‌کنیم.
    
    const lowerKeyword = keyword.toLowerCase().trim();
    if (lowerKeyword) {
        filtered = filtered.filter(cve => 
            cve.ID.toLowerCase().includes(lowerKeyword) || 
            cve.text?.toLowerCase().includes(lowerKeyword)
        );
    }
    
    if (severity !== 'all') {
        filtered = filtered.filter(cve => 
            String(cve.baseSeverity).toUpperCase() === severity.toUpperCase()
        );
    }

    // 2. فیلتر تاریخ (برای رفع مشکل NULL بودن published_date)
    if (date) {
        const minDate = new Date(date).getTime();

        filtered = filtered.filter(cve => {
            let itemDate = null;

            if (cve.published_date) {
                // اگر published_date پر است (داده‌های جدید)، از آن استفاده کن
                itemDate = new Date(cve.published_date).getTime();
            } else {
                // اگر published_date خالی است، سال را از ID استخراج کن (مثل CVE-2024-XXXX)
                const cveYear = extractYearFromCveId(cve.ID);
                // تاریخ را به شروع آن سال تنظیم می‌کنیم
                if (cveYear) {
                    itemDate = new Date(`${cveYear}-01-01T00:00:00Z`).getTime();
                } else {
                    return false; // اگر نتوانستیم تاریخ را استخراج کنیم، نادیده بگیر
                }
            }

            // فیلتر: اگر تاریخ آیتم بزرگتر یا مساوی با حداقل تاریخ مورد نیاز باشد
            return itemDate >= minDate;
        });
    }

    return filtered;
  }, [allData, loading, error, filters]);
  
  // تابع کمکی برای نمایش عنوان کوتاه شده در موبایل
  const truncateText = (text) => {
    if (!text) return 'N/A';
    const limit = window.innerWidth < 640 ? 50 : 150; 
    if (text.length > limit) {
        return text.substring(0, limit) + '...';
    }
    return text;
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
        <div>
          <label htmlFor="nvd-date" className="block text-sm font-medium text-gray-400 mb-1">Published After (Estimated):</label>
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
        </div>
        <div className="md:flex-shrink-0">
          {/* دکمه فیلتر دیگر fetchData را فراخوانی نمی‌کند، چون فیلتر سمت کلاینت است. */}
          {/* برای حفظ ظاهر دکمه، می‌توانید آن را غیرفعال کنید یا یک اکشن نمایشی به آن بدهید. */}
          {/* در اینجا ما فقط آن را به یک دکمه نمایشی تبدیل می‌کنیم */}
          <button type="button" className="cyber-button w-full md:w-auto flex items-center justify-center bg-gray-600 text-dark-bg cursor-default" disabled={true}>
             <Filter className="w-5 h-5 mr-2" />
             FILTER_APPLIED_
          </button>
        </div>
      </form>

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
            {!loading && !error && filteredVulnerabilities.map((cve) => (
              <tr key={cve.ID} className="hover:bg-gray-800/50 transition-colors duration-150">
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-cyber-cyan">
                  <a href={`https://nvd.nist.gov/vuln/detail/${cve.ID}`} target="_blank" rel="noopener noreferrer" className="hover:underline">{cve.ID}</a>
                </td>
                <td className="px-3 sm:px-6 py-4 text-sm text-cyber-text max-w-xs min-w-40" title={cve.text}>{truncateText(cve.text)}</td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm"><SeverityBadge severity={cve.baseSeverity} /></td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-bold text-white">{cve.score ? cve.score.toFixed(1) : 'N/A'}</td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500" title={cve.vectorString}>{cve.vectorString ? cve.vectorString.substring(0, 30) + '...' : 'N/A'}</td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {cve.published_date ? new Date(cve.published_date).toLocaleDateString() : `(Est) ${extractYearFromCveId(cve.ID) || 'N/A'}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NVDTable;
