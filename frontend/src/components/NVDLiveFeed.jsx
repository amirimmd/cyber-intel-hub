import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';
import { Link } from 'react-router-dom';
import { AlertCircle, Clock, Database, ChevronRight } from 'lucide-react';

const NVDLiveFeed = () => {
  const [latestCves, setLatestCves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLatestCves();
    
    // Set up real-time subscription
    const cveSubscription = supabase
      .channel('nvd_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'nvd_cve' }, (payload) => {
        // Only insert the new record if it's new and update the state
        setLatestCves((currentCves) => {
          // Prevent duplicates by checking cveId
          if (!currentCves.some(cve => cve.cveId === payload.new.cveId)) {
            // Add the new CVE and keep only the latest 5
            return [payload.new, ...currentCves].sort((a, b) => new Date(b.publishedDate) - new Date(a.publishedDate)).slice(0, 5);
          }
          return currentCves;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(cveSubscription);
    };
  }, []);

  const fetchLatestCves = async () => {
    try {
      setLoading(true);
      // Fetch the latest 5 CVEs based on publishedDate
      const { data, error } = await supabase
        .from('nvd_cve')
        .select('*')
        .order('publishedDate', { ascending: false })
        .limit(5);

      if (error) {
        throw error;
      }

      setLatestCves(data);
    } catch (error) {
      console.error('Error fetching live NVD feed:', error.message);
      setError('Error fetching live NVD feed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} ثانیه پیش`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} دقیقه پیش`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} ساعت پیش`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} روز پیش`;
  };
  
  const getSeverityText = (score) => {
    if (score >= 9.0) return 'بسیار بحرانی';
    if (score >= 7.0) return 'بحرانی';
    if (score >= 4.0) return 'متوسط';
    if (score > 0.0) return 'کم';
    return 'N/A';
  };

  const getSeverityColor = (score) => {
    if (score >= 9.0) return 'text-red-600 bg-red-100';
    if (score >= 7.0) return 'text-orange-500 bg-orange-100';
    if (score >= 4.0) return 'text-yellow-600 bg-yellow-100';
    if (score > 0.0) return 'text-blue-500 bg-blue-100';
    return 'text-gray-500 bg-gray-100';
  };

  return (
    <div className="bg-white shadow-xl rounded-xl p-6 h-full flex flex-col">
      <h2 className="text-2xl font-bold mb-4 text-gray-800 flex items-center">
        <Database className="w-6 h-6 mr-2 text-blue-600" />
        خوراک زنده NVD (5 مورد آخر)
      </h2>

      {loading && <div className="text-center py-4 text-gray-500">در حال بارگذاری...</div>}
      {error && <div className="text-center py-4 text-red-500">خطا: {error}</div>}

      {!loading && !error && latestCves.length === 0 && (
        <div className="text-center py-4 text-gray-500">داده‌ای یافت نشد.</div>
      )}

      <ul className="space-y-4 overflow-y-auto flex-grow">
        {latestCves.map((cve) => (
          <li
            key={cve.cveId}
            className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0 hover:bg-gray-50 p-3 rounded-lg transition duration-150"
          >
            <div className="flex justify-between items-start">
              <Link to={`/nvd/${cve.cveId}`} className="text-blue-600 hover:text-blue-800 font-semibold text-lg transition duration-150">
                {cve.cveId}
              </Link>
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${getSeverityColor(cve.cvssV3Score)}`}>
                {getSeverityText(cve.cvssV3Score)} ({cve.cvssV3Score || 'N/A'})
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {cve.description}
            </p>
            <div className="flex items-center text-xs text-gray-400 mt-2">
              <Clock className="w-3 h-3 mr-1" />
              <span>{formatTimeAgo(cve.publishedDate)}</span>
              <span className="mx-2">•</span>
              <AlertCircle className="w-3 h-3 mr-1" />
              <span>{cve.cvssV3Score ? `CVSS v3: ${cve.cvssV3Score}` : 'امتیاز: N/A'}</span>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4 pt-4 border-t border-gray-100">
        <Link to="/nvd-table" className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center justify-end">
          مشاهده تمام آسیب‌پذیری‌ها
          <ChevronRight className="w-4 h-4 mr-1" />
        </Link>
      </div>
    </div>
  );
};

export default NVDLiveFeed;
