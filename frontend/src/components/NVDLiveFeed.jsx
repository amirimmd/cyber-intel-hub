import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Radio } from 'lucide-react';

const NVDLiveFeed = () => {
  const [latestCVE, setLatestCVE] = useState(null);

  useEffect(() => {
    // دریافت آخرین CVE
    const fetchLatest = async () => {
      const { data } = await supabase
        .from('nvd_cves')
        .select('*')
        .order('published_date', { ascending: false })
        .limit(1)
        .single();
      if (data) setLatestCVE(data);
    };

    fetchLatest();

    // اشتراک در تغییرات Real-time (اختیاری اگر Supabase Realtime فعال باشد)
    const subscription = supabase
      .channel('nvd_feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'nvd_cves' }, payload => {
        setLatestCVE(payload.new);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="flex items-center gap-3 bg-red-900/20 border border-red-900/50 px-4 py-2 rounded-full animate-in fade-in duration-700">
      <div className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest leading-none mb-0.5">LIVE FEED</span>
        {latestCVE ? (
          <span className="text-xs font-mono text-gray-200">
            <span className="text-white font-bold mr-2">{latestCVE.cve_id}</span>
            <span className="text-gray-500 truncate max-w-[150px] inline-block align-bottom">
              {latestCVE.description?.substring(0, 30)}...
            </span>
          </span>
        ) : (
          <span className="text-xs text-gray-500 font-mono">Waiting for stream...</span>
        )}
      </div>
      <Radio className="text-red-500 opacity-50 ml-2" size={16} />
    </div>
  );
};

export default NVDLiveFeed;
