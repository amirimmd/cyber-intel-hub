import React, { useState, useEffect } from 'react';
import { Loader2, ExternalLink, ShieldCheck } from 'lucide-react';

const AIModels = () => {
  const [isLoading, setIsLoading] = useState(true);

  // شبیه‌سازی زمان بارگذاری اولیه برای iframe
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

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

      {/* ناحیه نمایش iframe */}
      <div className="flex-1 relative bg-[#000]">
        
        {/* لودینگ اسکرین (Overlay) */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050505] z-20 transition-opacity duration-500">
            <Loader2 size={48} className="text-cyan-500 animate-spin mb-4" />
            <p className="text-xs text-gray-400 font-mono tracking-widest animate-pulse">
              INITIALIZING NEURAL NETWORKS...
            </p>
            <div className="mt-4 w-48 h-1 bg-[#1f1f1f] rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500 animate-[shimmer_1s_infinite] w-1/2"></div>
            </div>
          </div>
        )}

        {/* فریم اصلی برنامه Streamlit */}
        <iframe
          src="https://amirimmd-exbert-classifier-inference.hf.space/?embedded=true"
          className="w-full h-full border-none"
          title="VulnSight AI Engine"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; microphone; camera"
          sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-downloads"
        />
        
      </div>
    </div>
  );
};

export default AIModels;
