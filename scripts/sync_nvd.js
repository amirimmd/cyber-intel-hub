// frontend/src/components/NVDTable.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient.js'; // مسیر صحیح
import { Loader2, Filter, DatabaseZap } from 'lucide-react';

// تابع برای فرمت کردن تاریخ
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    // اگر تاریخ 1978 است (احتمالاً placeholder)، آن را نمایش نده
    if (String(dateString).startsWith('1978-01-01')) return 'N/A';
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

// کامپوننت برای نمایش Badge شدت
const SeverityBadge = ({ severity }) => {
  let badgeClass = 'badge-unknown';
  const upperSeverity = String(severity).toUpperCase(); // مدیریت null یا undefined
  switch (upperSeverity) {
    case 'CRITICAL': badgeClass = 'badge-critical'; break;
    case 'HIGH': badgeClass = 'badge-high'; break;
    case 'MEDIUM': badgeClass = 'badge-medium'; break;
    case 'LOW': badgeClass = 'badge-low'; break;
    default: badgeClass = 'badge-unknown'; break; // شامل UNKNOWN یا مقادیر نامعتبر
  }
  // نمایش UNKNOWN اگر مقدار null یا خالی است
  return <span className={`severity-badge ${badgeClass}`}>{severity || 'UNKNOWN'}</span>;
};

// کامپوننت اصلی جدول NVD
const NVDTable = () => {
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ keyword: '', severity: 'all', date: '' });

  // مدیریت تغییرات در فیلترها
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // تابع واکشی داده‌ها از Supabase
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    let query = supabase
      .from('vulnerabilities')
      // انتخاب دقیق ستون‌ها مطابق Schema شما
      // ستون‌هایی که حروف بزرگ دارند یا نام‌های خاص هستند باید داخل "" باشند
      .select('"ID", text, "vectorString", av, ac, pr, ui, s, c, i, a, score, "baseSeverity", published_date')
      .order('published_date', { ascending: false, nullsFirst: false }) // مرتب‌سازی بر اساس تاریخ انتشار (جدیدترین اول)
      .limit(100); // محدود کردن نتایج برای بهبود عملکرد

    // اعمال فیلتر کلمه کلیدی
    if (filters.keyword) {
      // جستجو در ستون‌های "ID" و "text"
      // نام ستون‌ها باید داخل "" باشند
      query = query.or(`"ID".ilike.%${filters.keyword}%, text.ilike.%${filters.keyword}%`);
    }

    // اعمال فیلتر شدت
    if (filters.severity !== 'all') {
      // فیلتر بر اساس ستون "baseSeverity"
      query = query.eq('"baseSeverity"', filters.severity.toUpperCase());
    }

    // اعمال فیلتر تاریخ
    if (filters.date) {
      try {
        const filterDate = new Date(filters.date).toISOString();
        // فیلتر بر اساس ستون published_date
        query = query.gte('published_date', filterDate);
      } catch (dateError) {
         console.error("Invalid date filter format:", filters.date, dateError);
         // در صورت نامعتبر بودن تاریخ، فیلتر را اعمال نکن
      }
    }

    // اجرای کوئری
    const { data, error: queryError } = await query;

    // مدیریت خطا یا موفقیت
    if (queryError) {
      console.error('Error fetching NVD data:', queryError);
      setError(queryError.message); // نمایش پیام خطا به کاربر
      setVulnerabilities([]); // خالی کردن جدول در صورت خطا
    } else {
      setVulnerabilities(data || []); // اطمینان از اینکه همیشه یک آرایه است
    }
    setLoading(false);
  }, [filters]); // اجرای مجدد fetchData فقط زمانی که فیلترها تغییر می‌کنند

  // واکشی اولیه داده‌ها هنگام بارگذاری کامپوننت
  useEffect(() => {
    fetchData();
  }, [fetchData]); // اجرای fetchData یک بار پس از mount شدن

  // مدیریت ارسال فرم فیلتر
  const handleFilterSubmit = (e) => {
    e.preventDefault(); // جلوگیری از رفرش صفحه
    fetchData(); // اجرای مجدد واکشی با فیلترهای جدید
  };

  // رندر JSX کامپوننت
  return (
    <div>
      {/* فرم فیلتر */}
      <form onSubmit={handleFilterSubmit} className="mb-6 space-y-4 md:space-y-0 md:flex md:items-end md:space-x-4 md:gap-4">
        {/* ورودی کلمه کلیدی */}
        <div className="flex-grow">
          <label htmlFor="nvd-keyword" className="block text-sm font-medium text-gray-400 mb-1">Keyword / CVE ID:</label>
          <input type="text" name="keyword" id="nvd-keyword" value={filters.keyword} onChange={handleFilterChange} placeholder="e.g., SQLI, RCE, Apache..." className="cyber-input" />
        </div>
        {/* انتخاب شدت */}
        <div>
          <label htmlFor="nvd-severity" className="block text-sm font-medium text-gray-400 mb-1">Severity:</label>
          <select name="severity" id="nvd-severity" value={filters.severity} onChange={handleFilterChange} className="cyber-select w-full md:w-48">
            <option value="all">::ALL::</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
            {/* گزینه UNKNOWN را اضافه نکنید چون داده شما آن را ندارد */}
          </select>
        </div>
        {/* انتخاب تاریخ */}
        <div>
          <label htmlFor="nvd-date" className="block text-sm font-medium text-gray-400 mb-1">Published After:</label>
          <input type="date" name="date" id="nvd-date" value={filters.date} onChange={handleFilterChange} className="cyber-input w-full md:w-48" />
        </div>
        {/* دکمه فیلتر */}
        <div>
          <button type="submit" className="cyber-button" disabled={loading}>
            <Filter className="w-5 h-5 mr-2 inline-block" />
            FILTER_
          </button>
        </div>
      </form>

      {/* جدول نتایج */}
      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="min-w-full divide-y divide-gray-800">
          {/* سربرگ جدول */}
          <thead className="bg-gray-800/50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyber-cyan uppercase tracking-wider">CVE ID</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyber-cyan uppercase tracking-wider">Description</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyber-cyan uppercase tracking-wider">Severity</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyber-cyan uppercase tracking-wider">Score</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyber-cyan uppercase tracking-wider">Published</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyber-cyan uppercase tracking-wider">CVSS Vector</th>
              {/* ستون CWE در Schema شما نیست، پس حذف شد */}
            </tr>
          </thead>
          {/* بدنه جدول */}
          <tbody className="bg-cyber-card divide-y divide-gray-800">
            {/* حالت Loading */}
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
            {/* حالت خطا */}
            {!loading && error && (
              <tr>
                <td colSpan="6" className="px-6 py-10 text-center">
                  <div className="text-cyber-red break-words px-4"> {/* break-words برای خطاهای طولانی */}
                    <DatabaseZap className="w-10 h-10 mx-auto mb-2" />
                    <span>ERROR: {error}</span>
                  </div>
                </td>
              </tr>
            )}
            {/* حالت بدون داده */}
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
            {/* نمایش داده‌ها */}
            {!loading && !error && vulnerabilities.map((cve) => (
              // استفاده از cve.ID (با حروف بزرگ) به عنوان کلید منحصر به فرد هر ردیف
              <tr key={cve.ID} className="hover:bg-gray-800/50 transition-colors duration-150">
                {/* دسترسی به داده‌ها با نام ستون‌های دقیق دیتابیس شما */}
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-cyber-cyan">
                  <a href={`https://nvd.nist.gov/vuln/detail/${cve.ID}`} target="_blank" rel="noopener noreferrer" className="hover:underline">{cve.ID}</a>
                </td>
                {/* ستون text */}
                <td className="px-6 py-4 text-sm text-cyber-text max-w-md truncate" title={cve.text}>{cve.text}</td>
                {/* ستون baseSeverity */}
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <SeverityBadge severity={cve.baseSeverity} />
                </td>
                {/* ستون score */}
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-white">{cve.score}</td>
                {/* ستون published_date */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(cve.published_date)}</td>
                {/* ستون vectorString */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cve.vectorString}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NVDTable;

