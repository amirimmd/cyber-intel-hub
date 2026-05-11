import React from 'react';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { AIModelCard } from '../AIModelCard';

const model = {
  id: "Baseline",
  title: "ExBERT Classifier",
  description: "ارزیابی متون آسیب‌پذیری با هوش مصنوعی — ExBERT v2.1",
  badge: "v2.1",
};

const AIModels = () => {
  return (
    <div className="w-full h-full flex flex-col bg-[#050505] relative overflow-hidden">

      {/* هدر اختصاصی تب هوش مصنوعی */}
      <div className="h-14 border-b border-[#1f1f1f] bg-[#0a0a0a] flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-purple-900/20 rounded-lg border border-purple-500/30">
            <ShieldCheck size={18} className="text-purple-400" />
          </div>
          <h2 className="text-sm font-bold text-white tracking-wide uppercase">
            AI Inference Engine <span className="text-gray-600">|</span> <span className="text-cyan-400">ExBERT v2.1</span>
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 px-3 py-1 bg-[#111] rounded-full border border-[#222]">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-[10px] text-gray-400 font-mono uppercase">System Online</span>
          </span>
          <a
            href="https://amirimmd-exbert-classifier-inference.hf.space"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-white transition-colors"
            title="Open in new tab"
          >
            <ExternalLink size={16} />
          </a>
        </div>
      </div>

      {/* کارت مستقیم AI — بدون iframe */}
      <div className="flex-1 p-6 overflow-hidden">
        <AIModelCard model={model} />
      </div>

    </div>
  );
};

export default AIModels;
