// frontend/src/components/NVDTable.jsx
import React, { useState, useEffect, useCallback } from 'react';
// [FIX] اصلاح آدرس دهی ایمپورت. اگرچه آدرس قبلی منطقی بود، اما این آدرس باید کار کند:
import { supabase } from '../supabaseClient.js'; 
import { Loader2, Filter, DatabaseZap } from 'lucide-react';

// تاریخ شروع فیلتر: شروع از 2024 برای نمایش داده های جدیدتر
const DEFAULT_START_DATE_FILTER = '2024-01-01'; 
// حداقل مجاز برای ورودی date (بر اساس داده‌های دستی وارد شده در Supabase)
const EARLIEST_MANUAL_DATA_YEAR = '2016-01-01'; 

// Helper for severity badges
const SeverityBadge = ({ severity }) => {
  let badgeClass = 'badge-unknown';
  // اطمینان از اینکه severity یک رشته است و آن را به بزرگ تبدیل می‌کنیم
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

const NVDTable = () => {
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // مقدار پیش‌فرض فیلترها
  const [filters, setFilters] = useState({ 
    keyword: '', 
    severity: 'all', 
    date: DEFAULT_START_DATE_FILTER
  });
  
  // [FIX] حذف بررسی import.meta.env از اینجا. 
  // این بررسی باید در supabaseClient.js یا در سطح بالاتر انجام شود.
  useEffect(() => {
    // در این مرحله، اگر supabaseClient.js خطا داشته باشد، اینجا error را چک می کنیم.
    // اما برای اجتناب از خطای کامپایل، کد چک کردن import.meta.env حذف شد.
    // اگر در آینده نیاز به بررسی وضعیت Supabase بود، از useState در supabaseClient.js استفاده کنید.
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  /**
   * تابع واکشی داده‌ها از Supabase بر اساس فیلترهای کنونی
   */
  const fetchData = useCallback(async () => {
    // [FIX] حذف چک کردن error اولیه، تا اگر error ای از supabaseClient.js نبود، ادامه دهد
    // if (error) return; 

    setLoading(true);
    setError(null);
    
    // اگر supabaseClient.js خطا داشته باشد، در این مرحله خطا رخ می‌دهد.
    // انتخاب ستون‌های مورد نیاز (ID, text, baseSeverity, score, published_date, vectorString)
    let query = supabase
      .from('vulnerabilities')
      .select('ID, text, baseSeverity, score, published_date, vectorString') 
      .order('published_date', { ascending: false })
      .limit(50); // کاهش محدودیت به 50 رکورد برای بهبود عملکرد اولیه

    // 1. اعمال فیلتر تاریخ
    if (filters.date) {
        const datePart = filters.date; 
        // در Supabase، `gte` بر روی `published_date` (که تایم استمپ است) کار می‌کند.
        // اضافه کردن T00:00:00Z تضمین می‌کند که فیلتر، شروع آن روز را در UTC در نظر بگیرد.
        const effectiveDateISO = `${datePart}T00:00:00Z`;
        query = query.gte('published_date', effectiveDateISO);
    }
    
    // 2. اعمال فیلتر جستجوی کلمات کلیدی
    if (filters.keyword) {
      const keyword = filters.keyword.trim();
      // جستجو در ستون ID (CVE) و ستون Description (text) با استفاده از ilike
      query = query.or(`ID.ilike.%${keyword}%,text.ilike.%${keyword}%`);
    }
    
    // 3. اعمال فیلتر شدت (Severity)
    if (filters.severity !== 'all') {
      // فیلتر بر اساس baseSeverity
      query = query.eq('baseSeverity', filters.severity.toUpperCase());
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching NVD data:', fetchError);
      setError(`Database Error: ${fetchError.message}`);
    } else {
      setVulnerabilities(data || []);
    }
    setLoading(false);
  }, [filters]); // وابستگی‌ها به‌روز شد

  // Initial data fetch on component mount
  useEffect(() => {
    fetchData();
  }, [fetchData]); // استفاده از fetchData در وابستگی

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchData(); // فراخوانی مجدد واکشی داده با فیلترهای جدید
  };
  
  // تابع کمکی برای نمایش عنوان کوتاه شده در موبایل
  const truncateText = (text) => {
    if (!text) return 'N/A';
    // اگر عرض صفحه کوچک باشد (مانند موبایل)، متن را تا 50 کاراکتر کوتاه می‌کند
    const limit = window.innerWidth < 640 ? 50 : 150; 
    if (text.length > limit) {
        return text.substring(0, limit) + '...';
    }
    return text;
  }

  return (
    <div>
      {/* Filter Form */}
      <form onSubmit={handleFilterSubmit} className="mb-6 space-y-4 md:space-y-0 md:flex md:items-end md:space-x-4 md:gap-4">
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
            {/* اضافه کردن NONE برای کامل بودن، اگرچه در NVD اغلب به LOW نگاشت می‌شود */}
            <option value="NONE">NONE</option>
          </select>
        </div>
        <div>
          <label htmlFor="nvd-date" className="block text-sm font-medium text-gray-400 mb-1">Published After:</label>
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
          <button type="submit" className="cyber-button w-full md:w-auto flex items-center justify-center" disabled={loading || !!error}>
            {loading ? (
                <Loader2 className="animate-spin w-5 h-5 mr-2" />
            ) : (
                <Filter className="w-5 h-5 mr-2" />
            )}
            FILTER_
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
                    <span>LOADING NVD_DATA_STREAM...</span>
                  </div>
                </td>
              </tr>
            )}
            {/* [FIX] نمایش خطاهای تنظیمات یا دیتابیس */}
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
            {!loading && !error && vulnerabilities.length === 0 && (
              <tr>
                <td colSpan="6" className="px-3 sm:px-6 py-10 text-center">
                  <div className="text-gray-500">
                    <DatabaseZap className="w-10 h-10 mx-auto mb-2" />
                    <span>NO MATCHING VULNERABILITIES FOUND_</span>
                  </div>
                </td>
              </tr>
            )}
            {!loading && !error && vulnerabilities.map((cve) => (
              <tr key={cve.ID} className="hover:bg-gray-800/50 transition-colors duration-150">
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-cyber-cyan">
                  <a href={`https://nvd.nist.gov/vuln/detail/${cve.ID}`} target="_blank" rel="noopener noreferrer" className="hover:underline">{cve.ID}</a>
                </td>
                {/* [FIX] استفاده از truncateText برای موبایل */}
                <td className="px-3 sm:px-6 py-4 text-sm text-cyber-text max-w-xs min-w-40" title={cve.text}>{truncateText(cve.text)}</td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm"><SeverityBadge severity={cve.baseSeverity} /></td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-bold text-white">{cve.score ? cve.score.toFixed(1) : 'N/A'}</td>
                {/* کوتاه کردن vectorString برای نمایش در جدول */}
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500" title={cve.vectorString}>{cve.vectorString ? cve.vectorString.substring(0, 30) + '...' : 'N/A'}</td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(cve.published_date).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NVDTable;
