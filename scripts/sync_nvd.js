// frontend/src/components/NVDTable.jsx
import React, { useState, useEffect, useCallback } from 'react';
// [FIX]: مسیر import اصلاح شد تا شامل پسوند .js باشد
import { supabase } from '../supabaseClient.js';
import { Loader2, Filter, DatabaseZap } from 'lucide-react';

// [FIX]: این تابع تاریخ ISO را به فرمت خوانا تبدیل می‌کند
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    // اگر تاریخ 1978 است (داده‌ی placeholder از CSV)، آن را نمایش نده
    if (String(dateString).startsWith('1978-01-01')) return 'N/A';
    // [FIX]: اطمینان از اینکه تاریخ معتبر است
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date object");
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (error) {
    console.warn("Invalid date format:", dateString, error);
    return 'Invalid Date';
  }
};

// Helper for severity badges
const SeverityBadge = ({ severity }) => {
  let badgeClass = 'badge-unknown';
  // [FIX]: بررسی مقدار null یا "UNKNOWN"
  const upperSeverity = String(severity).toUpperCase();
  switch (upperSeverity) {
    case 'CRITICAL': badgeClass = 'badge-critical'; break;
    case 'HIGH': badgeClass = 'badge-high'; break;
    case 'MEDIUM': badgeClass = 'badge-medium'; break;
    case 'LOW': badgeClass = 'badge-low'; break;
    default: badgeClass = 'badge-unknown'; break;
  }
  return <span className={`severity-badge ${badgeClass}`}>{severity || 'UNKNOWN'}</span>;
};

const NVDTable = () => {
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ keyword: '', severity: 'all', date: '' });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    let query = supabase
      // [FIX]: ستون‌های سفارشی شما (که با حروف بزرگ هستند) باید داخل دابل کوتیشن باشند
      .from('vulnerabilities')
      // [FIX]: انتخاب دقیق نام ستون‌ها از schema شما
      .select('"ID", text, "vectorString", av, ac, pr, ui, s, c, i, a, score, "baseSeverity", published_date')
      .order('published_date', { ascending: false, nullsFirst: false })
      .limit(100);

    // Apply filters
    if (filters.keyword) {
      // [FIX]: خطای سینتکسی بک‌تیک (`) در اینجا اصلاح شد
      // [FIX]: فیلتر بر اساس ستون‌های صحیح "ID" و "text"
      query = query.or(`"ID".ilike.%${filters.keyword}%, text.ilike.%${filters.keyword}%`);
    }
    if (filters.severity !== 'all') {
      // [FIX]: فیلتر بر اساس ستون "baseSeverity"
      query = query.eq('"baseSeverity"', filters.severity.toUpperCase());
    }
    if (filters.date) {
      // [FIX]: فیلتر بر اساس ستون "published_date"
      try {
        // اطمینان از فرمت صحیح تاریخ برای کوئری
        const filterDate = new Date(filters.date).toISOString();
         query = query.gte('published_date', filterDate);
      } catch (dateError) {
         console.error("Invalid date filter format:", filters.date, dateError);
         // در صورت نامعتبر بودن تاریخ، فیلتر را اعمال نکن
      }
    }

    // [FIX]: رفع خطای نوشتاری که باعث build failure شده بود
    const { data, error: queryError } = await query;

    if (queryError) {
      console.error('Error fetching NVD data:', queryError);
      setError(queryError.message);
    } else {
      setVulnerabilities(data);
    }
    setLoading(false);
  }, [filters]); // Re-run when filters change

  // Initial data fetch on component mount
  useEffect(() => {
    fetchData();
  }, [fetchData]); // [FIX]: استفاده از fetchData در dependency array

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
          <input type="text" name="keyword" id="nvd-keyword" value={filters.keyword} onChange={handleFilterChange} placeholder="e.g., SQLI, RCE, Apache..." className="cyber-input" />
        </div>
        <div>
          <label htmlFor="nvd-severity" className="block text-sm font-medium text-gray-400 mb-1">Severity:</label>
          <select name="severity" id="nvd-severity" value={filters.severity} onChange={handleFilterChange} className="cyber-select w-full md:w-48">
            <option value="all">::ALL::</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
        </div>
        <div>
          <label htmlFor="nvd-date" className="block text-sm font-medium text-gray-400 mb-1">Published After:</label>
          <input type="date" name="date" id="nvd-date" value={filters.date} onChange={handleFilterChange} className="cyber-input w-full md:w-48" />
        </div>
        <div>
          <button type="submit" className="cyber-button" disabled={loading}>
            <Filter className="w-5 h-5 mr-2" />
            FILTER_
          </button>
        </div>
      </form>

      {/* Results Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="min-w-full divide-y divide-gray-800">
          <thead className="bg-gray-800/50">
            <tr>
              {/* [FIX]: استفاده از نام ستون‌های سفارشی شما */}
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyber-cyan uppercase tracking-wider">CVE ID</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyber-cyan uppercase tracking-wider">Description</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyber-cyan uppercase tracking-wider">Severity</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyber-cyan uppercase tracking-wider">Score</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyber-cyan uppercase tracking-wider">Published</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyber-cyan uppercase tracking-wider">CVSS Vector</th>
            </tr>
          </thead>
          <tbody className="bg-cyber-card divide-y divide-gray-800">
            {loading && (
              <tr>
                <td colSpan="6" className="px-6 py-10 text-center">
                  <div className="flex justify-center items-center text-cyber-cyan">
                    <Loader2 className="animate-spin h-6 w-6 mr-3" />
                    <span>LOADING NVD_DATA_STREAM...</span>
                  </div>
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan="6" className="px-6 py-10 text-center">
                  <div className="text-cyber-red">
                    <DatabaseZap className="w-10 h-10 mx-auto mb-2" />
                    <span>ERROR: {error}</span>
                  </div>
                </td>
              </tr>
            )}
            {!loading && !error && vulnerabilities.length === 0 && (
              <tr>
                <td colSpan="6" className="px-6 py-10 text-center">
                  <div className="text-gray-500">
                    <DatabaseZap className="w-10 h-10 mx-auto mb-2" />
                    <span>NO MATCHING VULNERABILITIES FOUND_</span>
                  </div>
                </td>
              </tr>
            )}
            {!loading && !error && vulnerabilities.map((cve) => (
              // [FIX]: استفاده از cve.ID (با حروف بزرگ) به عنوان کلید
              <tr key={cve.ID} className="hover:bg-gray-800/50 transition-colors duration-150">
                {/* [FIX]: استفاده از نام ستون‌های دقیق دیتابیس شما */}
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-cyber-cyan">
                  <a href={`https://nvd.nist.gov/vuln/detail/${cve.ID}`} target="_blank" rel="noopener noreferrer" className="hover:underline">{cve.ID}</a>
                </td>
                <td className="px-6 py-4 text-sm text-cyber-text max-w-md truncate" title={cve.text}>{cve.text}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <SeverityBadge severity={cve.baseSeverity} /> {/* نام ستون شما baseSeverity است */}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-white">{cve.score}</td> {/* نام ستون شما score است */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(cve.published_date)}</td> {/* نام ستون شما published_date است */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cve.vectorString}</td> {/* نام ستون شما vectorString است */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NVDTable;

