// frontend/src/components/NVDLiveFeed.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient.js'; // [اصلاح شده] اضافه کردن پسوند .js برای رفع مشکل import
import { Loader2, DatabaseZap, ShieldCheck } from 'lucide-react';

// Helper for severity badges (copied from NVDTable.jsx for consistency)
const SeverityBadge = ({ severity }) => {
  let badgeClass = 'badge-unknown';
  switch (String(severity).toUpperCase()) {
    case 'CRITICAL': badgeClass = 'badge-critical'; break;
    case 'HIGH': badgeClass = 'badge-high'; break;
    case 'MEDIUM': badgeClass = 'badge-medium'; break;
    case 'LOW': badgeClass = 'badge-low'; break;
  }
  return <span className={`severity-badge ${badgeClass}`}>{severity || 'UNKNOWN'}</span>;
};

const NVDLiveFeed = () => {
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const lastFetchTimestamp = useRef(null);
  const listRef = useRef(null);
  const intervalRef = useRef(null);

  // Fetch initial 10 items
  const fetchInitialData = async () => {
    setLoading(true);
    // Querying columns based on sync_nvd.js schema + user's request for vectorString
    const { data, error } = await supabase
      .from('vulnerabilities')
      .select('id, description, vectorString, base_score, severity, published_date')
      .order('published_date', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching initial NVD feed:', error);
      setError(error.message);
    } else if (data && data.length > 0) {
      setVulnerabilities(data.reverse()); // Reverse to show oldest at top, newest at bottom
      lastFetchTimestamp.current = data[0].published_date; // The newest date from the initial fetch
    }
    setLoading(false);
  };

  // Fetch the next item (older than the last one we added)
  const fetchNextData = async () => {
    if (isPaused || !lastFetchTimestamp.current) return;

    // We fetch items published *before* the last timestamp we fetched
    // This simulates scrolling through historical data
    const { data, error } = await supabase
      .from('vulnerabilities')
      .select('id, description, vectorString, base_score, severity, published_date')
      .lt('published_date', lastFetchTimestamp.current)
      .order('published_date', { ascending: false })
      .limit(1);

    if (error) {
      console.warn('Error fetching next NVD item:', error.message);
      // Stop interval if error occurs (e.g., rate limit)
      if (intervalRef.current) clearInterval(intervalRef.current);
    } else if (data && data.length > 0) {
      const newItem = data[0];
      setVulnerabilities(prev => {
        const newArray = [...prev.slice(1), newItem]; // Remove first (oldest), add new item to end
        return newArray;
      });
      // Update last timestamp to the new item's date
      lastFetchTimestamp.current = newItem.published_date;

      // Scroll to bottom
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    } else {
      // No more data, or gap in data. We can stop polling.
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  };

  // Effect for initial fetch
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Effect for setting up the interval
  useEffect(() => {
    if (!loading && !error) {
      intervalRef.current = setInterval(fetchNextData, 3000); // 3 seconds
    }

    // Clear interval on component unmount
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loading, error, isPaused]); // Re-run if loading/error state changes, or if paused

  return (
    <div 
      className="h-80 bg-dark-bg p-4 rounded-lg border border-cyber-cyan/30 overflow-hidden relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {loading && (
        <div className="flex justify-center items-center h-full text-cyber-cyan">
          <Loader2 className="animate-spin h-6 w-6 mr-3" />
          <span>ACCESSING_NVD_STREAM...</span>
        </div>
      )}
      {!loading && error && (
        <div className="flex justify-center items-center h-full text-cyber-red">
          <DatabaseZap className="w-10 h-10 mx-auto mb-2" />
          <span>ERROR: {error}</span>
        </div>
      )}
      {!loading && !error && (
        <ul ref={listRef} className="h-full overflow-y-auto space-y-3 pr-2 live-feed-list">
          {vulnerabilities.map((cve) => (
            <li key={cve.id} className="live-feed-item p-3 bg-cyber-card/50 rounded-md border border-gray-800/50 text-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-cyber-green">{cve.id}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-white font-bold text-base">{cve.base_score || 'N/A'}</span>
                  <SeverityBadge severity={cve.severity} />
                </div>
              </div>
              {/* Display vectorString only if it exists */}
              {cve.vectorString && (
                 <p className="text-cyber-yellow text-xs truncate mb-1" title={cve.vectorString}>
                   {cve.vectorString}
                 </p>
              )}
              <p className="text-cyber-text/80 text-xs leading-relaxed line-clamp-2" title={cve.description}>
                {cve.description}
              </p>
            </li>
          ))}
        </ul>
      )}
      {isPaused && (
        <div className="absolute inset-0 bg-dark-bg/80 flex justify-center items-center text-cyber-yellow font-bold text-lg backdrop-blur-sm z-10">
          :: PAUSED ::
        </div>
      )}
    </div>
  );
};

export default NVDLiveFeed;

