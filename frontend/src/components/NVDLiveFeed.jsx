// frontend/src/components/NVDLiveFeed.jsx
import React, { useState, useEffect, useRef } from 'react';
// [اصلاح شده] پسوند .js از مسیر حذف شد
import { supabase } from '../supabaseClient';
import { Loader2, DatabaseZap } from 'lucide-react';

// [جدید] تاریخ شروع فیلتر
const START_DATE_FILTER = '2024-01-01T00:00:00Z';

// Helper for severity badges (کپی شده از NVDTable برای سازگاری)
const SeverityBadge = ({ severity }) => {
  let badgeClass = 'badge-unknown';
  switch (String(severity).toUpperCase()) {
    case 'CRITICAL': badgeClass = 'badge-critical'; break;
    case 'HIGH': badgeClass = 'badge-high'; break;
    case 'MEDIUM': badgeClass = 'badge-medium'; break;
    case 'LOW': badgeClass = 'badge-low'; break;
  }
  return <span className={`severity-badge ${badgeClass}`}>{severity || 'N/A'}</span>;
};

const NVDLiveFeed = () => {
  const [feedData, setFeedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  
  // Ref برای ذخیره آخرین تاریخ واکشی شده
  const lastFetchedDate = useRef(new Date().toISOString());
  // Ref برای جلوگیری از واکشی موارد تکراری
  const fetchedIds = useRef(new Set());

  // تابع برای واکشی داده‌های اولیه
  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    
    const { data, error } = await supabase
      .from('vulnerabilities')
      // [اصلاح شده] ستون‌های صحیح درخواست شد
      .select('ID, text, vectorString, score, baseSeverity, published_date')
      // [جدید] اعمال فیلتر تاریخ 2024
      .gte('published_date', START_DATE_FILTER)
      .order('published_date', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching initial NVD feed:', error);
      setError(error.message);
    } else if (data && data.length > 0) {
      // ذخیره آخرین تاریخ برای واکشی بعدی
      lastFetchedDate.current = data[0].published_date;
      // ذخیره ID ها برای جلوگیری از تکرار
      data.forEach(item => fetchedIds.current.add(item.ID));
      setFeedData(data.reverse()); // نمایش از قدیمی به جدید
    }
    setLoading(false);
  };

  // تابع برای واکشی آیتم جدید
  const fetchNewItem = async () => {
    if (isPaused || document.hidden) return; // اگر متوقف بود یا تب فعال نبود، اجرا نکن

    const { data, error } = await supabase
      .from('vulnerabilities')
      .select('ID, text, vectorString, score, baseSeverity, published_date')
      // [جدید] اعمال فیلتر تاریخ 2024
      .gte('published_date', START_DATE_FILTER)
      // دریافت جدیدترین آیتم بعد از آخرین مورد واکشی شده
      .gt('published_date', lastFetchedDate.current)
      .order('published_date', { ascending: true }) // دریافت قدیمی‌ترینِ جدیدترین‌ها
      .limit(1);

    if (error) {
      console.error('Error fetching new NVD item:', error);
      // خطاهای جزئی را نمایش نمی‌دهیم تا فید متوقف نشود
    } else if (data && data.length > 0) {
      const newItem = data[0];
      
      // بررسی مجدد برای اطمینان از عدم تکرار
      if (!fetchedIds.current.has(newItem.ID)) {
        // به‌روزرسانی آخرین تاریخ
        lastFetchedDate.current = newItem.published_date;
        // افزودن ID جدید
        fetchedIds.current.add(newItem.ID);

        setFeedData(currentData => {
          // افزودن آیتم جدید و حذف قدیمی‌ترین (اولین) آیتم
          const updatedData = [...currentData, newItem];
          if (updatedData.length > 10) {
            // ID آیتمی که حذف می‌شود را نیز از Set پاک می‌کنیم
            const removedItem = updatedData.shift();
            fetchedIds.current.delete(removedItem.ID);
          }
          return updatedData;
        });
      }
    }
  };

  // واکشی اولیه در زمان بارگذاری
  useEffect(() => {
    fetchInitialData();
  }, []);

  // تنظیم اینتروال برای واکشی داده‌های جدید
  useEffect(() => {
    const interval = setInterval(fetchNewItem, 3000); // هر 3 ثانیه
    return () => clearInterval(interval); // پاکسازی در زمان unmount
  }, [isPaused]); // وابستگی به isPaused

  return (
    <div 
      className="h-64 bg-dark-bg border border-cyber-cyan/30 rounded-lg p-4 overflow-hidden relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="absolute top-2 left-4 text-xs font-bold text-cyber-cyan animate-flicker">
        ::LIVE NVD FEED:: 2024+ :: {isPaused ? "[PAUSED]" : "[ACTIVE]"}
      </div>
      
      {loading && (
        <div className="flex justify-center items-center h-full text-cyber-cyan">
          <Loader2 className="animate-spin h-5 w-5 mr-2" />
          <span>INITIATING NVD_DATA_STREAM (2024+)...</span>
        </div>
      )}

      {!loading && error && (
        <div className="flex justify-center items-center h-full text-cyber-red">
          <DatabaseZap className="h-6 w-6 mr-2" />
          <span>ERROR: {error}</span>
        </div>
      )}

      {!loading && !error && (
        <div className="feed-container h-full pt-6 overflow-y-auto custom-scrollbar">
          {feedData.map((cve, index) => (
            <div 
              key={cve.ID} 
              // انیمیشن فقط برای آخرین آیتم
              className={`feed-item ${index === feedData.length - 1 ? 'feed-item-new' : ''}`}
            >
              <span className="text-gray-500 mr-2">{new Date(cve.published_date).toLocaleTimeString()}</span>
              <span className="text-cyber-cyan font-medium mr-2">{cve.ID}</span>
              <SeverityBadge severity={cve.baseSeverity} />
              <span className="text-white mx-2 font-bold">{cve.score}</span>
              <span className="text-cyber-text truncate" title={cve.text}>
                {/* [اصلاح شده] استفاده از cve.text */}
                {cve.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NVDLiveFeed;


