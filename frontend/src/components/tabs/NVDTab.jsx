// --- components/tabs/NVDTab.jsx ---
import React from 'react';
import { ShieldAlert } from 'https://esm.sh/lucide-react@0.395.0'; 
// [FIX] اصلاح مسیر import برای استفاده از @ alias
import { NVDTable } from '@/components/NVDTable';

export const NVDTab = () => (
    <section id="nvd-section" className="cyber-card mb-12">
      <div className="flex items-center mb-6">
        <ShieldAlert className="icon-cyan w-8 h-8 mr-3 flex-shrink-0" />
        <h2 className="text-2xl font-semibold text-cyan-300 break-words min-w-0">NVD Vulnerability Feed_</h2>
      </div>
      <NVDTable />
    </section>
);