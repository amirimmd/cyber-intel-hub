import React from 'react';
import { NVDTable } from '../NVDTable';
import NVDLiveFeed from '../NVDLiveFeed';
import { ShieldAlert } from 'lucide-react';

const NVDTab = ({ compact = false, limit = 50 }) => {
  return (
    <div className="flex flex-col h-full w-full p-4 md:p-6 overflow-hidden animate-fade-in">
      
      {!compact && (
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 shrink-0">
          
          {/* Header & Title */}
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-900/10 rounded-xl border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
              <ShieldAlert className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight uppercase">
                NVD Vulnerability Feed
              </h2>
              <p className="text-gray-400 text-xs md:text-sm font-mono mt-1">
                Real-time CVE data retrieval from the National Vulnerability Database.
              </p>
            </div>
          </div>
          
          {/* Live Feed Widget */}
          <div className="flex items-center w-full xl:w-auto">
             <NVDLiveFeed />
          </div>
          
        </div>
      )}
      
      {/* Table Container (Fills remaining space) */}
      <div className="flex-1 min-h-0 w-full relative">
        <NVDTable limit={limit} />
      </div>
      
    </div>
  );
};

export default NVDTab;
