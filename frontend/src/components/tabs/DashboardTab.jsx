import React from 'react';
import { 
  Database, Cpu, GitMerge, Layers, 
  Activity, ArrowRight, BrainCircuit, 
  Network, Code, Lock, Terminal
} from 'lucide-react';

const MetricBar = ({ label, value, percentage, color }) => (
  <div className="mb-3 group">
    <div className="flex justify-between text-[10px] font-mono mb-1 text-gray-400 group-hover:text-white transition-colors uppercase tracking-wider">
      <span>{label}</span>
      <span>{value}</span>
    </div>
    <div className="h-1.5 bg-[#1f1f1f] rounded-full overflow-hidden border border-white/5">
      <div 
        className={`h-full rounded-full ${color} relative shadow-[0_0_10px_rgba(0,0,0,0.5)]`} 
        style={{ width: `${percentage}%` }}
      >
        <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
      </div>
    </div>
  </div>
);

const PipelineNode = ({ title, sub, icon: Icon, active, step }) => (
  <div className={`relative flex flex-col items-center text-center group ${active ? 'opacity-100' : 'opacity-50'}`}>
    <div className="absolute -top-3 -right-3 w-6 h-6 bg-[#0a0a0a] border border-[#333] rounded-full flex items-center justify-center text-[10px] font-mono text-gray-500">
      {step}
    </div>
    <div className={`w-16 h-16 rounded-xl border flex items-center justify-center mb-3 transition-all duration-500 ${active ? 'bg-cyan-900/10 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.2)]' : 'bg-[#111] border-[#333] text-gray-600'}`}>
      <Icon size={28} />
    </div>
    <h4 className="text-xs font-bold text-white uppercase tracking-wider">{title}</h4>
    <p className="text-[9px] text-gray-500 font-mono mt-1 max-w-[120px]">{sub}</p>
  </div>
);

const Connector = () => (
  <div className="hidden md:flex flex-1 items-center justify-center px-2">
    <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#333] to-transparent relative">
      <div className="absolute top-1/2 left-0 w-2 h-2 bg-cyan-500 rounded-full -translate-y-1/2 animate-ping opacity-20"></div>
      <ArrowRight size={14} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-600" />
    </div>
  </div>
);

export default function DashboardTab() {
  return (
    <div className="h-full overflow-y-auto p-6 space-y-8 pb-20 scrollbar-thin scrollbar-thumb-[#333]">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-[#1f1f1f] pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <BrainCircuit className="text-cyan-400" size={32} />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
              MODEL ARCHITECTURE & METRICS
            </span>
          </h1>
          <p className="text-xs text-gray-500 font-mono mt-2 flex items-center gap-2">
            <Terminal size={12} className="text-green-500" />
            BASED ON "APPLY TRANSFER LEARNING TO CYBERSECURITY" (ExBERT APPROACH)
          </p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 rounded bg-blue-900/20 border border-blue-500/30 text-[10px] text-blue-400 font-mono">
            BERT-BASE-UNCASED
          </span>
          <span className="px-3 py-1 rounded bg-purple-900/20 border border-purple-500/30 text-[10px] text-purple-400 font-mono">
            LSTM-HEAD
          </span>
        </div>
      </div>

      {/* 1. Methodology Pipeline Visualization */}
      <div className="cyber-panel p-8">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-8 border-l-2 border-cyan-500 pl-3">
          End-to-End Training Pipeline
        </h2>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <PipelineNode 
            step="01"
            title="Raw Data" 
            sub="NVD (240k) & ExploitDB" 
            icon={Database} 
            active={true}
          />
          <Connector />
          <PipelineNode 
            step="02"
            title="Domain Adaptation" 
            sub="MLM Fine-Tuning (Phase 1)" 
            icon={Network} 
            active={true}
          />
          <Connector />
          <PipelineNode 
            step="03"
            title="Feature Extraction" 
            sub="ExBERT (BERT + LSTM)" 
            icon={Cpu} 
            active={true}
          />
          <Connector />
          <PipelineNode 
            step="04"
            title="Classification" 
            sub="Exploitability Probability" 
            icon={Lock} 
            active={true}
          />
        </div>
      </div>

      {/* Main Grid: Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Phase 1: Domain Adaptation (BERT MLM) */}
        <div className="cyber-panel p-6 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
          <div className="absolute -right-6 -top-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Activity size={150} />
          </div>
          
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <Code size={20} className="text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wide">Phase 1: Domain Adaptation</h3>
              <p className="text-[10px] text-gray-500 font-mono">Masked Language Modeling (MLM)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-[#0f0f0f] p-3 rounded border border-[#222]">
              <p className="text-[9px] text-gray-500 uppercase tracking-wider">Corpus Size</p>
              <p className="text-lg font-bold text-white font-mono">240,000+</p>
              <p className="text-[9px] text-blue-400">CVE Descriptions</p>
            </div>
            <div className="bg-[#0f0f0f] p-3 rounded border border-[#222]">
              <p className="text-[9px] text-gray-500 uppercase tracking-wider">Perplexity Drop</p>
              <div className="flex items-end gap-2">
                <p className="text-lg font-bold text-red-400 font-mono line-through opacity-50">111.1</p>
                <ArrowRight size={14} className="text-gray-600 mb-1.5" />
                <p className="text-lg font-bold text-green-400 font-mono">5.33</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 font-mono text-[10px]">
            <div className="flex justify-between text-gray-400">
              <span>Epoch 1 (Loss: 4.71)</span>
              <span>Epoch 3 (Loss: 1.67)</span>
            </div>
            <div className="h-2 bg-[#111] rounded-full overflow-hidden flex">
              <div className="w-[10%] bg-red-500/50"></div>
              <div className="w-[30%] bg-yellow-500/50"></div>
              <div className="w-[60%] bg-green-500 shadow-[0_0_10px_rgba(0,255,0,0.5)]"></div>
            </div>
            <p className="text-center text-gray-500">Model successfully learned cybersecurity terminology.</p>
          </div>
        </div>

        {/* Phase 2: Classification (ExBERT) */}
        <div className="cyber-panel p-6 relative overflow-hidden group hover:border-cyan-500/30 transition-colors">
          <div className="absolute -right-6 -top-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Layers size={150} />
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
              <Layers size={20} className="text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wide">Phase 2: Downstream Task</h3>
              <p className="text-[10px] text-gray-500 font-mono">Exploitability Classification (Balanced Dataset)</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-6">
            <div className="bg-gradient-to-br from-cyan-900/20 to-transparent p-2 rounded border border-cyan-500/20 text-center">
              <p className="text-[9px] text-cyan-300 uppercase">Accuracy</p>
              <p className="text-xl font-bold text-white">92.58%</p>
            </div>
            <div className="bg-gradient-to-br from-purple-900/20 to-transparent p-2 rounded border border-purple-500/20 text-center">
              <p className="text-[9px] text-purple-300 uppercase">F1-Score</p>
              <p className="text-xl font-bold text-white">92.65%</p>
            </div>
            <div className="bg-gradient-to-br from-green-900/20 to-transparent p-2 rounded border border-green-500/20 text-center">
              <p className="text-[9px] text-green-300 uppercase">AUC</p>
              <p className="text-xl font-bold text-white">97.72%</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <MetricBar label="Precision (Correctly Identified Exploits)" value="91.77%" percentage={91.77} color="bg-blue-500" />
            <MetricBar label="Recall (Coverage of Real Exploits)" value="93.54%" percentage={93.54} color="bg-cyan-500" />
            <MetricBar label="MCC (Correlation Coefficient)" value="0.8518" percentage={85.18} color="bg-indigo-500" />
          </div>
        </div>
      </div>

      {/* Detailed Architecture Diagram */}
      <div className="cyber-panel p-8 border-t-4 border-t-cyan-500">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-10 text-center">
          Detailed Model Architecture (ExBERT Implementation)
        </h2>
        
        <div className="flex flex-col gap-2 relative max-w-3xl mx-auto">
          
          {/* Layer 1: Input */}
          <div className="flex items-center gap-4 group">
            <div className="w-24 text-[10px] font-mono text-gray-500 text-right uppercase">Input Layer</div>
            <div className="flex-1 h-12 bg-[#111] border border-dashed border-gray-700 rounded flex items-center justify-center text-xs text-gray-400 group-hover:text-white group-hover:border-gray-500 transition-all">
              <span className="font-mono">CVE Description Text (Sequence)</span>
            </div>
          </div>

          {/* Connection */}
          <div className="h-4 border-l border-gray-700 ml-[7.5rem]"></div>

          {/* Layer 2: Tokenizer */}
          <div className="flex items-center gap-4 group">
            <div className="w-24 text-[10px] font-mono text-gray-500 text-right uppercase">Preprocessing</div>
            <div className="flex-1 h-10 bg-[#161b22] border border-gray-700 rounded flex items-center justify-center text-xs text-gray-300">
              <span className="font-mono">BERT Tokenizer (Max Len: 256)</span>
            </div>
          </div>

          {/* Connection */}
          <div className="h-4 border-l border-gray-700 ml-[7.5rem]"></div>

          {/* Layer 3: BERT */}
          <div className="flex items-center gap-4 relative">
            <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full opacity-50"></div>
            <div className="w-24 text-[10px] font-mono text-blue-400 text-right uppercase font-bold">Phase 1 Model</div>
            <div className="flex-1 p-4 bg-gradient-to-r from-blue-900/10 to-indigo-900/10 border border-blue-500/30 rounded flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-grid-white/[0.02]"></div>
              <Cpu className="text-blue-400 mb-2 opacity-80" size={24} />
              <h3 className="text-sm font-bold text-white">BERT Base (Fine-Tuned)</h3>
              <p className="text-[9px] text-blue-300 mt-1">768 Hidden Units • 12 Layers • 12 Heads</p>
            </div>
          </div>

          {/* Connection */}
          <div className="h-4 border-l border-gray-700 ml-[7.5rem]"></div>

          {/* Layer 4: LSTM (The ExBERT Addition) */}
          <div className="flex items-center gap-4 relative">
            <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-500 to-teal-400 rounded-full opacity-50"></div>
            <div className="w-24 text-[10px] font-mono text-cyan-400 text-right uppercase font-bold">Phase 2 Head</div>
            <div className="flex-1 p-3 bg-gradient-to-r from-cyan-900/10 to-teal-900/10 border border-cyan-500/30 rounded flex flex-col items-center justify-center">
              <h3 className="text-xs font-bold text-white">LSTM Layer (256 Units)</h3>
              <p className="text-[9px] text-cyan-300 mt-0.5">Captures Sequential Dependencies</p>
            </div>
          </div>

          {/* Connection */}
          <div className="h-4 border-l border-gray-700 ml-[7.5rem]"></div>

          {/* Layer 5: Classifier */}
          <div className="flex items-center gap-4">
            <div className="w-24 text-[10px] font-mono text-gray-500 text-right uppercase">Output</div>
            <div className="flex-1 flex gap-2">
              <div className="flex-1 h-10 bg-[#111] border border-gray-700 rounded flex items-center justify-center text-[10px] text-gray-400">
                Layer Norm & Dropout (0.2)
              </div>
              <div className="flex-1 h-10 bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 rounded flex items-center justify-center text-xs font-bold text-white shadow-[0_0_15px_rgba(255,0,0,0.1)]">
                Sigmoid Probability
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
