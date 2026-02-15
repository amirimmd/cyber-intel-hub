import React from 'react';
import NVDTable from '../NVDTable';
import NVDLiveFeed from '../NVDLiveFeed';
import { ShieldAlert } from 'lucide-react';

const NVDTab = ({ compact = false, limit = 50 }) => {
  return (
    <div className={`space-y-6 ${compact ? '' : 'animate-in fade-in duration-500'}`}>
      {!compact && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-blue-500" />
              فید آسیب‌پذیری‌های NVD
            </h2>
            <p className="text-slate-500 mt-1">دریافت لحظه‌ای داده‌های CVE از پایگاه داده ملی آسیب‌پذیری‌ها.</p>
          </div>
          <NVDLiveFeed />
        </div>
      )}

      <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden ${compact ? 'shadow-none border-0' : 'shadow-sm'}`}>
        <NVDTable limit={limit} />
      </div>
    </div>
  );
};

export default NVDTab;
