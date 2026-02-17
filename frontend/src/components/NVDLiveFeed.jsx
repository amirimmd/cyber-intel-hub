import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Radio, AlertCircle } from 'lucide-react';

const NVDLiveFeed = () => {
  const [latestCVE, setLatestCVE] = useState(null);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    // 1. Fetch Initial Data
    const fetchLatest = async () => {
      try {
        const { data } = await supabase
          .from('nvd_cves')
          .select('*')
          .order('published_date', { ascending: false })
          .limit(1)
          .single();
        if (data) setLatestCVE(data);
      } catch (e) {
        // Fallback for demo if DB is empty
        setLatestCVE({
            cve_id: 'CVE-2024-LIVE-DEMO',
            description: 'Real-time monitoring system active. Waiting for incoming vulnerability streams...'
        });
      }
    };

    fetchLatest();

    // 2. Subscribe to Real-time Updates
    const subscription = supabase
      .channel('nvd_feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'nvd_cves' }, payload => {
        setLatestCVE(payload.new);
        // Flash effect
        setIsLive(false);
        setTimeout(() => setIsLive(true), 100);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div className={`
      flex items-center gap-3 px-4 py-2 rounded-full border transition-all duration-500
      ${isLive 
        ? 'bg-red-900/10 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]' 
        : 'bg-red-500/20 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.4)]'}
    `}>
      <div className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
      </div>
      
      <div className="flex flex-col min-w-0 max-w-[120px] sm:max-w-xs">
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-red-400 font-bold uppercase tracking-widest leading-none">LIVE FEED</span>
          <span className="text-[9px] text-gray-600 font-mono hidden sm:inline-block">| SYNCING...</span>
        </div>
        
        {latestCVE ? (
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-[10px] text-white font-bold font-mono shrink-0">{latestCVE.cve_id}</span>
            <span className="text-[10px] text-gray-500 truncate font-mono hidden sm:block">
              {latestCVE.description}
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-gray-500 font-mono">Initializing stream...</span>
        )}
      </div>
      
      <Radio className="text-red-500 opacity-50 ml-auto sm:ml-2 shrink-0 animate-pulse" size={14} />
    </div>
  );
};

export default NVDLiveFeed;
