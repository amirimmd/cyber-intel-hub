import React from 'react';
import { 
  Database, Cpu, GitMerge, Layers, 
  Activity, CheckCircle, BarChart2, Zap, 
  ArrowRight, BrainCircuit, Terminal 
} from 'lucide-react';

const MetricBar = ({ label, value, percentage, color }) => (
  <div className="mb-4 group">
    <div className="flex justify-between text-xs font-mono mb-1 text-gray-400 group-hover:text-white transition-colors">
      <span>{label}</span>
      <span>{value}</span>
    </div>
    <div className="h-2 bg-[#1f1f1f] rounded-full overflow-hidden border border-white/5">
      <div 
        className={`h-full rounded-full ${color} relative`} 
        style={{ width: `${percentage}%` }}
      >
        <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
      </div>
    </div>
  </div>
);

const PipelineStep = ({ number, title, desc, icon: Icon }) => (
  <div className="relative flex-1 p-4 border border-[#333] bg-[#0a0a0a]/50 rounded-xl hover:border-cyan-500/50 transition-all group">
    <div className="absolute -top-3 -left-3 w-8 h-8 bg-[#111] border border-cyan-500/30 rounded-full flex items-center justify-center text-cyan-400 font-bold text-xs shadow-[0_0_10px_rgba(0,240,255,0.2)]">
      {number}
    </div>
    <div className="mb-3 text-cyan-500 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300">
      <Icon size={24} />
    </div>
    <h3 className="text-sm font-bold text-white mb-1 tracking-wide">{title}</h3>
    <p className="text-[10px] text-gray-500 font-mono leading-relaxed">{desc}</p>
  </div>
);

export default function DashboardTab() {
  return (
    <div className="h-full overflow-y-auto p-6 space-y-8 pb-20">
      
      {/* Header Section */}
      <div className="border-b border-[#1f1f1f] pb-6">
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <BrainCircuit className="text-cyan-400" size={32} />
          PROJECT ARCHITECTURE <span className="text-gray-600"> & </span> PERFORMANCE
        </h1>
        <p className="text-sm text-gray-500 font-mono mt-2 pl-1">
          IMPLEMENTATION OF "APPLY TRANSFER LEARNING TO CYBERSECURITY" (ExBERT METHODOLOGY)
        </p>
      </div>

      {/* 1. Methodology Pipeline */}
      <div>
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
          <GitMerge size={14} /> Training Pipeline
        </h2>
        <div className="flex flex-col md:flex-row gap-4 relative">
          <PipelineStep 
            number="01" 
            title="Data Collection" 
            desc="Aggregated 240,000+ CVE descriptions from NVD & Verified Exploits from Exploit-DB." 
            icon={Database} 
          />
          <div className="hidden md:flex items-center justify-center text-gray-700">
            <ArrowRight size={20} className="animate-pulse" />
          </div>
          <PipelineStep 
            number="02" 
            title="Domain Adaptation" 
            desc="Phase 1: Fine-tuned BERT-Base on NVD text to learn cybersecurity semantics (MLM)." 
            icon={Cpu} 
          />
          <div className="hidden md:flex items-center justify-center text-gray-700">
            <ArrowRight size={20} className="animate-pulse" />
          </div>
          <PipelineStep 
            number="03" 
            title="Classification" 
            desc="Phase 2: Trained ExBERT (BERT+LSTM) on 56k balanced samples for exploit prediction." 
            icon={Layers} 
          />
        </div>
      </div>

      {/* Main Grid: Phase 1 & Phase 2 Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Phase 1: Domain Adaptation Stats */}
        <div className="cyber-panel p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Cpu size={120} />
          </div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              PHASE 1: Domain Adaptation
            </h3>
            <span className="px-2 py-1 bg-blue-900/20 text-blue-400 text-[10px] font-bold border border-blue-500/30 rounded">
              COMPLETED
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-black/40 p-3 rounded border border-[#333]">
              <p className="text-[10px] text-gray-500 uppercase">Dataset Size</p>
              <p className="text-xl font-bold text-blue-400 font-mono">240,000</p>
              <p className="text-[10px] text-gray-600">NVD Descriptions</p>
            </div>
            <div className="bg-black/40 p-3 rounded border border-[#333]">
              <p className="text-[10px] text-gray-500 uppercase">Training Epochs</p>
              <p className="text-xl font-bold text-blue-400 font-mono">3.0</p>
              <p className="text-[10px] text-gray-600">Full Passes</p>
            </div>
          </div>

          <div className="bg-[#0f0f0f] p-4 rounded border border-[#333] font-mono text-xs">
            <p className="text-gray-400 mb-2 border-b border-[#333] pb-2">Training Logs (Perplexity Reduction):</p>
            <div className="flex justify-between items-center mb-1">
              <span>Step 250 (Start)</span>
              <span className="text-red-400">111.09</span>
            </div>
            <div className="w-full bg-[#111] h-1.5 rounded-full mb-3">
              <div className="w-full h-full bg-red-500/50 rounded-full"></div>
            </div>
            
            <div className="flex justify-between items-center mb-1">
              <span>Step 5000 (Mid)</span>
              <span className="text-yellow-400">5.99</span>
            </div>
            <div className="w-full bg-[#111] h-1.5 rounded-full mb-3">
              <div className="w-[10%] h-full bg-yellow-500/50 rounded-full"></div>
            </div>

            <div className="flex justify-between items-center mb-1">
              <span>Step 10000 (Final)</span>
              <span className="text-green-400 font-bold">5.33</span>
            </div>
            <div className="w-full bg-[#111] h-1.5 rounded-full">
              <div className="w-[5%] h-full bg-green-500 rounded-full shadow-[0_0_10px_#00ff00]"></div>
            </div>
          </div>
        </div>

        {/* Phase 2: Classification Performance */}
        <div className="cyber-panel p-6 relative overflow-hidden border-cyan-500/30">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Activity size={120} />
          </div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></span>
              PHASE 2: Exploit Prediction
            </h3>
            <span className="px-2 py-1 bg-cyan-900/20 text-cyan-400 text-[10px] font-bold border border-cyan-500/30 rounded">
              BEST MODEL
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-6 text-center">
            <div className="bg-cyan-900/10 p-2 rounded border border-cyan-500/20">
              <p className="text-[10px] text-cyan-300">Accuracy</p>
              <p className="text-lg font-bold text-white">92.58%</p>
            </div>
            <div className="bg-cyan-900/10 p-2 rounded border border-cyan-500/20">
              <p className="text-[10px] text-cyan-300">F1-Score</p>
              <p className="text-lg font-bold text-white">92.65%</p>
            </div>
            <div className="bg-cyan-900/10 p-2 rounded border border-cyan-500/20">
              <p className="text-[10px] text-cyan-300">AUC</p>
              <p className="text-lg font-bold text-white">97.72%</p>
            </div>
          </div>

          <div className="space-y-2">
            <MetricBar label="Precision (True Positives)" value="91.77%" percentage={91.77} color="bg-purple-500" />
            <MetricBar label="Recall (Sensitivity)" value="93.54%" percentage={93.54} color="bg-pink-500" />
            <MetricBar label="MCC (Correlation)" value="0.8518" percentage={85.18} color="bg-indigo-500" />
          </div>

          <div className="mt-4 pt-4 border-t border-[#333] flex justify-between items-center text-xs font-mono text-gray-500">
            <span>Dataset: 56,804 Samples</span>
            <span>Balanced (50/50)</span>
          </div>
        </div>
      </div>

      {/* Model Architecture Visualization */}
      <div className="cyber-panel p-8">
        <h2 className="text-center text-sm font-bold text-gray-400 uppercase tracking-widest mb-8">ExBERT Architecture (The Engine)</h2>
        
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-xs font-bold font-mono">
          
          {/* Input */}
          <div className="flex flex-col items-center">
            <div className="w-32 h-10 bg-[#111] border border-gray-600 rounded flex items-center justify-center text-gray-400">
              Input Text
            </div>
            <div className="h-6 w-0.5 bg-gray-600"></div>
            <div className="text-[10px] text-gray-600 my-1">Tokenizer</div>
            <div className="h-6 w-0.5 bg-gray-600"></div>
          </div>

          {/* BERT */}
          <div className="p-4 border-2 border-dashed border-blue-500/30 rounded-xl bg-blue-900/5 relative group">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0a0a0a] px-2 text-blue-400">Phase 1</div>
            <div className="w-40 h-24 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow-lg shadow-blue-500/20 flex items-center justify-center text-white text-center p-2">
              <Cpu size={24} className="mx-auto mb-2 opacity-80" />
              BERT Base<br/>(Fine-Tuned)
            </div>
          </div>

          <ArrowRight className="text-gray-600 hidden md:block" />
          <div className="h-6 w-0.5 bg-gray-600 md:hidden"></div>

          {/* LSTM */}
          <div className="p-4 border-2 border-dashed border-cyan-500/30 rounded-xl bg-cyan-900/5 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0a0a0a] px-2 text-cyan-400">Phase 2</div>
            <div className="flex flex-col gap-2">
              <div className="w-40 h-12 bg-[#222] border border-cyan-500/50 rounded flex items-center justify-center text-cyan-400">
                LSTM Layer
              </div>
              <div className="w-40 h-10 bg-[#111] border border-[#333] rounded flex items-center justify-center text-gray-400">
                Dense / Dropout
              </div>
            </div>
          </div>

          <ArrowRight className="text-gray-600 hidden md:block" />
          <div className="h-6 w-0.5 bg-gray-600 md:hidden"></div>

          {/* Output */}
          <div className="flex flex-col items-center">
            <div className="w-32 h-12 bg-gradient-to-r from-red-500 to-orange-500 rounded flex items-center justify-center text-white shadow-lg shadow-red-500/20">
              Exploit Probability
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
