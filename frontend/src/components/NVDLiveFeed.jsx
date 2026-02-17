import React from 'react';
import { Radio } from 'lucide-react';

const NVDLiveFeed = () => {
  return (
    <div className="flex items-center gap-3 bg-red-900/10 border border-red-900/30 px-4 py-2 rounded-full">
      <div className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest leading-none mb-0.5">LIVE FEED</span>
        <span className="text-xs font-mono text-gray-400">Monitoring...</span>
      </div>
      <Radio className="text-red-500 opacity-50 ml-2" size={16} />
    </div>
  );
};

export default NVDLiveFeed;
