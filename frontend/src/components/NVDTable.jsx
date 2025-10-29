// frontend/src/components/NVDTable.jsx
import React, { useState, useEffect, useCallback } from 'react';
// [FIX] افزودن پسوند .js به مسیر ایمپورت برای رفع خطای "Could not resolve"
import { supabase } from '../supabaseClient.js'; 
import { Loader2, Search, Filter, DatabaseZap } from 'lucide-react';

// [اصلاح شده] تاریخ شروع فیلتر: شروع از 2024 برای نمایش داده های جدیدتر، اما حداقل مجاز 2016 است
const DEFAULT_START_DATE_FILTER = '2024-01-01'; // Default view to show recent data (manual + synced)
const EARLIEST_MANUAL_DATA_YEAR = '2016-01-01'; // Minimum selectable date in the calendar

// Helper for severity badges
const SeverityBadge = ({ severity }) => {
  let badgeClass = 'badge-unknown';
  switch (String(severity).toUpperCase()) {
    case 'CRITICAL': badgeClass = 'badge-critical'; break;
    case 'HIGH': badgeClass = 'badge-high'; break;
    case 'MEDIUM': badgeClass = 'badge-medium'; break;
    case 'LOW': badgeClass = 'badge-low'; break;
    case 'NONE': badgeClass = 'badge-low'; break; // None is similar to Low in terms of risk
  }
  return <span className={`severity-badge ${badgeClass}`}>{severity || 'N/A'}</span>;
};

const NVDTable = () => {
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // مقدار پیش‌فرض فیلتر تاریخ
  const [filters, setFilters] = useState({ 
    keyword: '', 
    severity: 'all', 
    date: DEFAULT_START_DATE_FILTER // تنظیم پیش‌فرض برای نمایش داده‌های اخیر
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    let query = supabase
      .from('vulnerabilities')
      .select('ID, text, baseSeverity, score, published_date, vectorString') 
      .order('published_date', { ascending: false })
      .limit(100);

    // اعمال فیلتر تاریخ
    if (filters.date) {
        // تبدیل تاریخ محلی به ISO 8601 UTC
        const datePart = filters.date; // e.g., '2024-01-01'
        const effectiveDateISO = new Date(`${datePart}T00:00:00Z`).toISOString();
        query = query.gte('published_date', effectiveDateISO);
    }
    
    // Apply other filters
    if (filters.keyword) {
      // جستجو در ID و text
      query = query.or(`ID.ilike.%${filters.keyword}%,text.ilike.%${filters.keyword}%`);
    }
    if (filters.severity !== 'all') {
      // فیلتر بر اساس baseSeverity
      query = query.eq('baseSeverity', filters.severity.toUpperCase());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching NVD data:', error);
      setError(error.message);
    } else {
      setVulnerabilities(data);
    }
    setLoading(false);
  }, [filters]); // Re-run when filters change

  // Initial data fetch on component mount
  useEffect(() => {
    fetchData();
  }, [fetchData]); // استفاده از fetchData در وابستگی

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

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
          />
        </div>
        <div>
          <label htmlFor="nvd-severity" className="block text-sm font-medium text-gray-400 mb-1">Severity:</label>
          {/* w-full روی موبایل، w-48 روی دسکتاپ */}
          <select 
            name="severity" 
            id="nvd-severity" 
            value={filters.severity} 
            onChange={handleFilterChange} 
            className="cyber-select w-full md:w-48"
          >
            <option value="all">::ALL::</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
        </div>
        <div>
          <label htmlFor="nvd-date" className="block text-sm font-medium text-gray-400 mb-1">Published After:</label>
          {/* w-full روی موبایل، w-48 روی دسکتاپ */}
          <input 
            type="date" 
            name="date" 
            id="nvd-date" 
            value={filters.date} 
            onChange={handleFilterChange} 
            // تنظیم حداقل تاریخ مجاز در تقویم به 2016
            min={EARLIEST_MANUAL_DATA_YEAR}
            className="cyber-input w-full md:w-48" 
          />
        </div>
        <div className="md:flex-shrink-0">
          <button type="submit" className="cyber-button w-full md:w-auto flex items-center justify-center" disabled={loading}>
            {/* اضافه کردن w-full برای موبایل */}
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
      {/* overflow-x-auto تضمین می‌کند که جدول در صورت کوچک بودن صفحه (مانند موبایل) افقی اسکرول بخورد و ظاهر کلی سایت بهم نریزد */}
      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="min-w-full divide-y divide-gray-800">
          <thead className="bg-gray-800/50">
            <tr>
              {/* کاهش Padding روی موبایل: px-3 برای موبایل و px-6 برای صفحه بزرگتر */}
              <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-cyber-cyan uppercase tracking-wider">CVE ID</th>
              <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-cyber-cyan uppercase tracking-wider">Description</th>
              <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-cyber-cyan uppercase tracking-wider">Severity</th>
              <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-cyber-cyan uppercase tracking-wider">Score</th>
              <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-cyber-cyan uppercase tracking-wider">Vector</th>
              <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-cyber-cyan uppercase tracking-wider">Published</th>
            </tr>
          </thead>
          <tbody className="bg-cyber-card divide-y divide-gray-800">
            {loading && (
              <tr>
                <td colSpan="6" className="px-3 sm:px-6 py-10 text-center">
                  <div className="flex justify-center items-center text-cyber-cyan">
                    <Loader2 className="animate-spin h-6 w-6 mr-3" />
                    <span>LOADING NVD_DATA_STREAM (2024+)...</span>
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
            {!loading && !error && vulnerabilities.length === 0 && (
              <tr>
                <td colSpan="6" className="px-3 sm:px-6 py-10 text-center">
                  <div className="text-gray-500">
                    <DatabaseZap className="w-10 h-10 mx-auto mb-2" />
                    <span>NO MATCHING VULNERABILITIES FOUND (2024+)_</span>
                  </div>
                </td>
              </tr>
            )}
            {!loading && !error && vulnerabilities.map((cve) => (
              // استفاده از cve.ID
              <tr key={cve.ID} className="hover:bg-gray-800/50 transition-colors duration-150">
                {/* کاهش Padding روی موبایل */}
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-cyber-cyan">
                  {/* استفاده از cve.ID */}
                  <a href={`https://nvd.nist.gov/vuln/detail/${cve.ID}`} target="_blank" rel="noopener noreferrer" className="hover:underline">{cve.ID}</a>
                </td>
                {/* استفاده از cve.text. استفاده از min-w-40 برای اطمینان از فضای کافی برای متن در حالت truncate */}
                <td className="px-3 sm:px-6 py-4 text-sm text-cyber-text max-w-xs min-w-40 truncate" title={cve.text}>{cve.text || 'N/A'}</td>
                {/* استفاده از cve.baseSeverity */}
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm"><SeverityBadge severity={cve.baseSeverity} /></td>
                {/* استفاده از cve.score */}
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-bold text-white">{cve.score ? cve.score.toFixed(1) : 'N/A'}</td>
                {/* نمایش vectorString */}
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
