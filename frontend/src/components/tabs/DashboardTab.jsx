import React from 'react';
import { 
  Database, Cpu, Layers, Activity, ArrowRight, 
  BrainCircuit, Network, Lock, Terminal,
  TrendingUp, Microscope, Zap, CheckCircle2,
  AlertTriangle, BarChart3, ChevronRight
} from 'lucide-react';

// --- Components ---

const SectionHeader = ({ title, icon: Icon, color }) => (
  <div className="flex items-center gap-3 mb-6 border-b border-[#1f1f1f] pb-2">
    <div className={`p-2 rounded-lg bg-${color}-900/10 border border-${color}-500/20`}>
      <Icon size={20} className={`text-${color}-400`} />
    </div>
    <h2 className="text-lg font-bold text-white tracking-wide uppercase">{title}</h2>
  </div>
);

const StatBox = ({ label, value, sub, color }) => (
  <div className="bg-[#0f0f0f] border border-[#222] p-4 rounded-xl relative overflow-hidden group hover:border-[#333] transition-colors">
    <div className={`absolute top-0 right-0 w-16 h-16 bg-${color}-500/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150`}></div>
    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-1">{label}</p>
    <div className="flex items-end gap-2">
      <span className="text-2xl font-bold text-white font-mono">{value}</span>
      {sub && <span className={`text-[10px] mb-1 ${sub.includes('+') ? 'text-green-400' : 'text-gray-600'}`}>{sub}</span>}
    </div>
  </div>
);

const ProgressBar = ({ label, current, max, color }) => (
  <div className="mb-3">
    <div className="flex justify-between text-[10px] font-mono text-gray-400 mb-1">
      <span>{label}</span>
      <span>{current}</span>
    </div>
    <div className="h-1.5 bg-[#1f1f1f] rounded-full overflow-hidden">
      <div 
        className={`h-full rounded-full bg-${color}-500 shadow-[0_0_10px_currentColor] transition-all duration-1000`} 
        style={{ width: `${(parseFloat(current)/max)*100}%` }}
      ></div>
    </div>
  </div>
);

// --- Main Dashboard ---

export default function DashboardTab() {
  return (
    <div className="h-full overflow-y-auto p-6 space-y-10 pb-20 scrollbar-thin scrollbar-thumb-[#333]">
      
      {/* 1. Header & Project Overview */}
      <div className="relative">
        <div className="absolute top-0 right-0 p-4 opacity-20">
          <BrainCircuit size={100} className="text-cyan-500" />
        </div>
        <h1 className="text-4xl font-bold text-white tracking-tight mb-2">
          VULN<span className="text-cyan-400">SIGHT</span> <span className="text-gray-600 text-2xl font-light">| CORE ANALYTICS</span>
        </h1>
        <p className="text-sm text-gray-400 max-w-2xl leading-relaxed font-mono">
          Advanced Exploitability Prediction System based on <span className="text-cyan-400">Transfer Learning</span> & <span className="text-green-400">XAI Optimization</span>.
          Implementation of "ExBERT" architecture enhanced with SHAP-driven retraining loops.
        </p>
        
        <div className="flex gap-3 mt-6">
          <span className="px-3 py-1 bg-blue-900/20 border border-blue-500/30 text-blue-400 text-[10px] font-bold rounded uppercase tracking-wider">Phase 1: Adaptation</span>
          <ArrowRight size={14} className="text-gray-600 self-center" />
          <span className="px-3 py-1 bg-purple-900/20 border border-purple-500/30 text-purple-400 text-[10px] font-bold rounded uppercase tracking-wider">Phase 2: Classification</span>
          <ArrowRight size={14} className="text-gray-600 self-center" />
          <span className="px-3 py-1 bg-green-900/20 border border-green-500/30 text-green-400 text-[10px] font-bold rounded uppercase tracking-wider shadow-[0_0_15px_rgba(74,222,128,0.2)]">Phase 3: Optimization</span>
        </div>
      </div>

      {/* 2. Phase 1: Domain Adaptation (BERT) */}
      <section>
        <SectionHeader title="Phase 1: Knowledge Acquisition (BERT MLM)" icon={Database} color="blue" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="cyber-panel p-6 col-span-1 lg:col-span-1 border-l-4 border-l-blue-500">
            <h3 className="text-sm font-bold text-white mb-4">Training Objectives</h3>
            <ul className="space-y-3 text-xs text-gray-400">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-blue-500 mt-0.5" />
                <span>Adapt <b>BERT-Base</b> to cybersecurity domain.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-blue-500 mt-0.5" />
                <span>Dataset: <b>240,000</b> NVD Vulnerability Descriptions.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-blue-500 mt-0.5" />
                <span>Task: <b>Masked Language Modeling (MLM)</b>.</span>
              </li>
            </ul>
          </div>
          
          <div className="cyber-panel p-6 col-span-1 lg:col-span-2 relative overflow-hidden">
            <h3 className="text-sm font-bold text-white mb-6 flex justify-between">
              <span>Perplexity Reduction (Learning Curve)</span>
              <span className="text-green-400 font-mono">-95.2% Improved</span>
            </h3>
            
            <div className="flex items-end justify-between gap-2 h-32 px-4 border-b border-[#333] relative">
              {/* Graphic representation of loss drop */}
              <div className="w-16 bg-red-500/20 border-t border-r border-l border-red-500/30 rounded-t flex flex-col justify-end items-center relative group" style={{height: '100%'}}>
                <span className="text-[10px] text-red-400 font-mono mb-2 bg-black/50 px-1 rounded">111.1</span>
                <div className="text-[9px] text-gray-500 absolute -bottom-6">Start</div>
              </div>
              <div className="w-16 bg-orange-500/20 border-t border-r border-l border-orange-500/30 rounded-t flex flex-col justify-end items-center relative" style={{height: '40%'}}>
                <span className="text-[10px] text-orange-400 font-mono mb-2">16.7</span>
                <div className="text-[9px] text-gray-500 absolute -bottom-6">Ep 0.5</div>
              </div>
              <div className="w-16 bg-yellow-500/20 border-t border-r border-l border-yellow-500/30 rounded-t flex flex-col justify-end items-center relative" style={{height: '20%'}}>
                <span className="text-[10px] text-yellow-400 font-mono mb-2">6.3</span>
                <div className="text-[9px] text-gray-500 absolute -bottom-6">Ep 1.5</div>
              </div>
              <div className="w-16 bg-green-500/20 border-t border-r border-l border-green-500/50 rounded-t flex flex-col justify-end items-center relative" style={{height: '15%'}}>
                <span className="text-[10px] text-green-400 font-mono font-bold mb-2 shadow-[0_0_10px_rgba(74,222,128,0.5)] bg-green-900/50 px-1 rounded">5.33</span>
                <div className="text-[9px] text-white font-bold absolute -bottom-6">Final</div>
              </div>
              
              {/* Trend Line */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                <path d="M 40 5 L 200 80 L 400 100" fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="5,5" className="opacity-50" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Phase 2: Architecture & Baseline */}
      <section>
        <SectionHeader title="Phase 2: ExBERT Architecture (Baseline)" icon={Layers} color="purple" />
        
        <div className="cyber-panel p-8 mb-6 bg-gradient-to-r from-[#0a0a0a] to-[#111]">
          <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-6 text-xs font-bold font-mono">
            
            <div className="flex flex-col items-center group">
              <div className="w-32 py-3 bg-[#161b22] border border-gray-700 rounded text-center text-gray-300 group-hover:border-white transition-colors">
                CVE Description
              </div>
              <div className="h-6 w-0.5 bg-gray-700 my-1"></div>
              <div className="text-[9px] text-gray-600">Tokenizer</div>
            </div>

            <ArrowRight className="text-gray-600 hidden md:block" />

            <div className="relative p-4 border border-blue-500/30 bg-blue-900/10 rounded-xl text-center group w-48">
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 bg-[#0a0a0a] text-[9px] text-blue-400 border border-blue-500/30 rounded">Phase 1 Weights</div>
              <Cpu className="mx-auto text-blue-400 mb-2 opacity-80" size={24} />
              <div className="text-white">BERT-Base</div>
              <div className="text-[9px] text-blue-300 font-normal mt-1">768 Dim Embeddings</div>
            </div>

            <ArrowRight className="text-gray-600 hidden md:block" />

            <div className="relative p-4 border border-purple-500/30 bg-purple-900/10 rounded-xl text-center group w-48 shadow-[0_0_20px_rgba(168,85,247,0.1)]">
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 bg-[#0a0a0a] text-[9px] text-purple-400 border border-purple-500/30 rounded">Feature Extraction</div>
              <Network className="mx-auto text-purple-400 mb-2 opacity-80" size={24} />
              <div className="text-white">LSTM Layer</div>
              <div className="text-[9px] text-purple-300 font-normal mt-1">256 Hidden Units</div>
            </div>

            <ArrowRight className="text-gray-600 hidden md:block" />

            <div className="flex flex-col items-center">
              <div className="w-32 py-3 bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 rounded text-center text-white shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                Probability
              </div>
            </div>

          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBox label="Baseline Accuracy" value="92.58%" color="gray" />
          <StatBox label="F1-Score" value="92.65%" color="gray" />
          <StatBox label="Precision" value="91.77%" color="gray" />
          <StatBox label="Recall" value="93.54%" color="gray" />
        </div>
      </section>

      {/* 4. Phase 3: XAI Optimization (The Star Show) */}
      <section>
        <SectionHeader title="Phase 3: XAI-Driven Optimization Results" icon={Zap} color="green" />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Method Comparison Table */}
          <div className="lg:col-span-2 cyber-panel overflow-hidden p-0 border-green-500/30">
            <div className="p-4 bg-green-900/10 border-b border-green-500/20 flex justify-between items-center">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Microscope size={16} className="text-green-400" />
                Methodology Benchmarking
              </h3>
              <span className="text-[10px] text-gray-400 font-mono">Test Set (8,521 Samples)</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#111] text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3">Strategy</th>
                    <th className="px-4 py-3">Accuracy</th>
                    <th className="px-4 py-3">F1-Score</th>
                    <th className="px-4 py-3 text-cyan-400 font-bold">Recall (TPR)</th>
                    <th className="px-4 py-3">AUC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222]">
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-gray-400">Baseline</td>
                    <td className="px-4 py-3">92.58%</td>
                    <td className="px-4 py-3">92.65%</td>
                    <td className="px-4 py-3">93.54%</td>
                    <td className="px-4 py-3">97.72%</td>
                  </tr>
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-gray-300">Method 1 (Progressive)</td>
                    <td className="px-4 py-3">93.50%</td>
                    <td className="px-4 py-3">93.57%</td>
                    <td className="px-4 py-3">94.69%</td>
                    <td className="px-4 py-3">97.51%</td>
                  </tr>
                  <tr className="bg-green-900/20 hover:bg-green-900/30 transition-colors border-l-2 border-green-500">
                    <td className="px-4 py-3 text-white font-bold flex items-center gap-2">
                      Method 2 (Reverse)
                      <span className="px-1.5 py-0.5 bg-green-500 text-black text-[9px] rounded font-bold">WINNER</span>
                    </td>
                    <td className="px-4 py-3 text-white font-bold">93.84%</td>
                    <td className="px-4 py-3 text-white font-bold">93.91%</td>
                    <td className="px-4 py-3 text-green-400 font-bold shadow-[0_0_10px_rgba(74,222,128,0.2)]">95.02%</td>
                    <td className="px-4 py-3 text-white font-bold">98.16%</td>
                  </tr>
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-gray-300">Method 3 (Limited)</td>
                    <td className="px-4 py-3">93.33%</td>
                    <td className="px-4 py-3">93.44%</td>
                    <td className="px-4 py-3">95.00%</td>
                    <td className="px-4 py-3">98.13%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Key Improvements Card */}
          <div className="flex flex-col gap-4">
            <div className="cyber-panel p-5 bg-gradient-to-br from-green-900/10 to-transparent border-green-500/20">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Why Method 2?</h4>
              <p className="text-xs text-gray-300 leading-relaxed mb-4">
                By unfreezing layers in <b>reverse order (12 -> 6 -> 0)</b> while applying SHAP weights, the model retained its high-level semantic knowledge while fine-tuning specific feature extraction capabilities for hard samples.
              </p>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Accuracy Gain</span>
                  <span className="text-green-400 font-mono font-bold">+1.26%</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Recall Gain</span>
                  <span className="text-green-400 font-mono font-bold">+1.48%</span>
                </div>
                <div className="w-full bg-[#111] h-1 rounded-full mt-1">
                  <div className="w-full h-full bg-green-500 animate-pulse"></div>
                </div>
              </div>
            </div>

            <div className="cyber-panel p-5 border-l-4 border-yellow-500 flex items-start gap-3">
              <AlertTriangle className="text-yellow-500 shrink-0" size={20} />
              <div>
                <h4 className="text-xs font-bold text-white uppercase">Critical Insight</h4>
                <p className="text-[10px] text-gray-400 mt-1">
                  High <b>Recall (95.02%)</b> is crucial in cybersecurity. It means our model misses fewer than 5% of actual exploits, significantly reducing false negatives.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}
