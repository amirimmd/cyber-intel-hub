import React from 'react';
import { ShieldAlert } from 'https://esm.sh/lucide-react@0.395.0'; 
import { NVDTable } from '@/components/NVDTable';

export const NVDTab = () => (
    // [FIX] اضافه کردن padding به این کامپوننت (که قبلاً در App.jsx بود)
    // h-full و overflow-y-auto برای اسکرول صحیح این تب اضافه شد
    <div className="p-4 md:p-8 h-full overflow-y-auto">
      <section id="nvd-section" className="cyber-card mb-12">
        <div className="flex items-center mb-6">
          <ShieldAlert className="icon-cyan w-8 h-8 mr-3 flex-shrink-0" />
          <h2 className="text-2xl font-semibold text-cyan-300 break-words min-w-0">NVD Vulnerability Feed_</h2>
        </div>
        <NVDTable />
      </section>
    </div>
);
