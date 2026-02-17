import React from 'react';
import { 
  Database, Cpu, Layers, Activity, ArrowRight, 
  BrainCircuit, Network, Lock, Terminal,
  TrendingUp, Microscope, Zap, CheckCircle2,
  AlertTriangle, BarChart3, ChevronRight, GitCommit,
  ShieldCheck
} from 'lucide-react';

// --- Components ---

const SectionHeader = ({ title, icon: Icon, color, delay }) => (
  <div 
    className="flex items-center gap-3 mb-6 border-b border-[#1f1f1f] pb-2 pt-4 opacity-0 animate-slide-in-left"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className={`p-2 rounded-lg bg-${color}-900/10 border border-${color}-500/20 shadow-[0_0_15px_rgba(0,0,0,0.5)]`}>
      <Icon size={20} className={`text-${color}-400`} />
    </div>
    <h2 className="text-lg font-bold text-white tracking-wide uppercase flex items-center gap-2">
      {title}
      <div className={`h-1 w-1 rounded-full bg-${color}-500 animate-pulse`}></div>
    </h2>
  </div>
);

const StatBox = ({ label, value, sub, color, delay }) => (
  <div 
    className="bg-[#0f0f0f] border border-[#222] p-4 rounded-xl relative overflow-hidden group hover:border-[#333] transition-colors opacity-0 animate-zoom-in"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className={`absolute top-0 right-0 w-20 h-20 bg-${color}-500/5 rounded-bl-full -mr-10 -mt-10 transition-transform duration-500 group-hover:scale-150`}></div>
    <div className={`absolute bottom-0 left-0 w-full h-0.5 bg-${color}-500/20 scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-left`}></div>
    
    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-2 flex items-center gap-1">
      <div className={`w-1 h-1 bg-${color}-500 rounded-full`}></div>
      {label}
    </p>
    <div className="flex flex-col">
      <span className="text-3xl font-bold text-white font-mono tracking-tight">{value}</span>
      {sub && (
        <span className={`text-[10px] font-mono mt-1 ${sub.includes('+') || sub.includes('-') ? `text-${color}-400` : 'text-gray-600'}`}>
          {sub}
        </span>
      )}
    </div>
  </div>
);

const PipelineStep = ({ step, title, desc, active, delay, icon: Icon }) => (
  <div 
    className={`flex flex-col items-center text-center max-w-[140px] relative z-10 opacity-0 animate-fade-in-up group`}
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className={`
      w-12 h-12 rounded-2xl border-2 flex items-center justify-center text-lg font-bold mb-4 transition-all duration-500 relative
      ${active ? 'border-cyan-500 bg-cyan-900/10 text-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.2)] group-hover:shadow-[0_0_30px_rgba(0,240,255,0.4)] group-hover:scale-110' : 'border-gray-700 bg-[#111] text-gray-600'}
    `}>
      {Icon ? <Icon size={20} /> : step}
      {active && <div className="absolute inset-0 border-2 border-cyan-400 rounded-2xl animate-ping opacity-20"></div>}
    </div>
    <h4 className={`text-xs font-bold uppercase transition-colors ${active ? 'text-white' : 'text-gray-600'}`}>{title}</h4>
    <p className="text-[9px] text-gray-500 mt-1 leading-tight">{desc}</p>
  </div>
);

// --- Main Dashboard ---

export default function DashboardTab() {
  return (
    <div className="h-full overflow-y-auto p-6 space-y-12 pb-20 scrollbar-thin scrollbar-thumb-[#333]">
      
      {/* 1. Cinematic Header */}
      <div className="relative opacity-0 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <div className="absolute top-0 right-0 p-4 opacity-10 animate-[pulse_4s_infinite]">
          <BrainCircuit size={150} className="text-cyan-500" />
        </div>
        
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-gradient-to-br from-cyan-600 to-blue-700 rounded-2xl shadow-lg shadow-cyan-500/20">
            <ShieldCheck size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight">
              VULN<span className="text-cyan-400">SIGHT</span> 
              <span className="text-gray-600 text-2xl font-light ml-2">CORE ANALYTICS</span>
            </h1>
            <p className="text-xs text-cyan-500 font-mono tracking-widest mt-1">SYSTEM VERSION 2.1.0 // AUTHORIZED ACCESS</p>
          </div>
        </div>

        <p className="text-sm text-gray-400 max-w-3xl leading-relaxed font-mono border-l-2 border-cyan-500/50 pl-4 bg-gradient-to-r from-cyan-900/5 to-transparent py-2">
          An advanced implementation of <b>Transfer Learning (ExBERT)</b> enhanced by <b>Explainable AI (SHAP)</b>.
          <br/>
          This system bridges the gap between raw vulnerability descriptions and precise exploitability prediction.
        </p>
      </div>

      {/* 2. Scientific Pipeline Visualization */}
      <div className="cyber-panel p-10 relative overflow-hidden opacity-0 animate-zoom-in border-t-2 border-t-cyan-500" style={{ animationDelay: '300ms' }}>
        <div className="absolute inset-0 bg-opacity-5 bg-grid-white/[0.05]"></div>
        
        {/* Connection Line */}
        <div className="absolute top-[4.5rem] left-[10%] right-[10%] h-0.5 bg-[#222] -z-0">
          <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 opacity-30"></div>
        </div>

        <div className="flex justify-between relative z-10 flex-wrap gap-4">
          <PipelineStep step="01" title="Data Ingestion" desc="NVD (240k) + ExploitDB" active={true} delay={400} icon={Database} />
          <PipelineStep step="02" title="Domain Adaptation" desc="BERT MLM Fine-Tuning" active={true} delay={600} icon={Cpu} />
          <PipelineStep step="03" title="Feature Extraction" desc="ExBERT (BERT+LSTM)" active={true} delay={800} icon={Layers} />
          <PipelineStep step="04" title="XAI Optimization" desc="SHAP-Driven Weights" active={true} delay={1000} icon={Microscope} />
          <PipelineStep step="05" title="Deployment" desc="Real-time Inference" active={true} delay={1200} icon={Zap} />
        </div>
      </div>

      {/* Grid Layout for Phases */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* 3. Phase 1: Knowledge Acquisition */}
        <section>
          <SectionHeader title="Phase 1: Knowledge Acquisition" icon={Database} color="blue" delay={1400} />
          <div className="cyber-panel p-6 border-l-4 border-l-blue-500 h-auto opacity-0 animate-fade-in-up flex flex-col" style={{ animationDelay: '1500ms' }}>
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                  <Terminal size={14} className="text-blue-400" />
                  BERT Domain Adaptation
                </h3>
                <p className="text-[10px] text-gray-500 font-mono mt-1">Task: Masked Language Modeling (MLM)</p>
              </div>
              <span className="px-2 py-1 bg-blue-900/30 text-blue-400 text-[9px] font-bold rounded border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                COMPLETED
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <StatBox label="Start Perplexity" value="111.1" sub="High Confusion" color="red" delay={1600} />
              <StatBox label="Final Perplexity" value="5.33" sub="-95.2% Optimization" color="green" delay={1700} />
            </div>

            {/* Custom Chart for Phase 1 */}
            <div className="flex-1 bg-[#0a0a0a] rounded-xl border border-[#222] p-5 relative overflow-hidden group min-h-[160px]">
              <div className="absolute inset-0 bg-gradient-to-b from-blue-900/5 to-transparent"></div>
              
              <div className="flex items-end justify-between h-32 gap-2 relative z-10">
                {/* Bars */}
                <div className="w-12 bg-red-500/20 border border-red-500/30 rounded-t relative group-hover:bg-red-500/40 transition-all h-full">
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-red-400 font-mono">111</div>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 -rotate-90 text-[9px] text-gray-500 uppercase tracking-widest whitespace-nowrap origin-center">Epoch 0</div>
                </div>
                
                <div className="w-12 bg-orange-500/20 border border-orange-500/30 rounded-t relative h-[40%]"></div>
                <div className="w-12 bg-yellow-500/20 border border-yellow-500/30 rounded-t relative h-[25%]"></div>
                <div className="w-12 bg-blue-500/20 border border-blue-500/30 rounded-t relative h-[15%]">
                   <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-blue-400 font-mono">16.7</div>
                </div>
                <div className="w-12 bg-blue-500/20 border border-blue-500/30 rounded-t relative h-[10%]"></div>
                
                <div className="w-12 bg-green-500/40 border border-green-500/60 rounded-t relative h-[5%] shadow-[0_0_15px_rgba(34,197,94,0.4)]">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-green-400 font-bold font-mono bg-black/80 px-1 rounded">5.3</div>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 -rotate-90 text-[9px] text-white font-bold uppercase tracking-widest whitespace-nowrap origin-center">Final</div>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-gray-500 mt-3 text-center">Model successfully adapted to cybersecurity terminology.</p>
          </div>
        </section>

        {/* 4. Phase 3: XAI Optimization */}
        <section>
          <SectionHeader title="Phase 3: XAI-Driven Results" icon={TrendingUp} color="green" delay={1400} />
          <div className="cyber-panel p-0 border-l-4 border-l-green-500 overflow-hidden h-auto opacity-0 animate-fade-in-up flex flex-col" style={{ animationDelay: '1600ms' }}>
            
            <div className="bg-[#111] p-4 border-b border-[#222] flex justify-between items-center">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Benchmarking Strategy</span>
              <span className="text-[10px] font-mono text-green-500 flex items-center gap-1 bg-green-900/20 px-2 py-1 rounded border border-green-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                Method 2 Selected
              </span>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#0c0c0c] text-gray-500 uppercase border-b border-[#222]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Model Strategy</th>
                    <th className="px-4 py-3 font-medium text-right">Accuracy</th>
                    <th className="px-4 py-3 font-medium text-right">Recall</th>
                    <th className="px-4 py-3 font-medium text-right">AUC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f1f1f]">
                  <tr className="hover:bg-white/5 transition-colors group">
                    <td className="px-4 py-3 text-gray-400 flex items-center gap-2">
                      <div className="w-1 h-4 bg-gray-600 rounded-full group-hover:bg-gray-400 transition-colors"></div>
                      Baseline (Phase 2)
                    </td>
                    <td className="px-4 py-3 text-right">92.58%</td>
                    <td className="px-4 py-3 text-right text-gray-400">93.54%</td>
                    <td className="px-4 py-3 text-right">97.72%</td>
                  </tr>
                  
                  {/* Highlighted Row */}
                  <tr className="bg-green-900/10 hover:bg-green-900/20 transition-colors relative overflow-hidden group">
                    <td className="px-4 py-4 text-white font-bold flex items-center gap-2 relative z-10">
                      <div className="w-1 h-4 bg-green-500 rounded-full shadow-[0_0_10px_#22c55e]"></div>
                      <Zap size={14} className="text-green-400" />
                      Method 2 (Reverse)
                    </td>
                    <td className="px-4 py-4 text-right text-white font-bold relative z-10">
                      93.84% <span className="text-[9px] text-green-500 ml-1">+1.2%</span>
                    </td>
                    <td className="px-4 py-4 text-right relative z-10">
                      <span className="text-green-400 font-bold bg-green-900/30 px-1.5 py-0.5 rounded border border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.2)]">95.02%</span>
                    </td>
                    <td className="px-4 py-4 text-right text-white relative z-10">98.16%</td>
                    
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </tr>

                  <tr className="hover:bg-white/5 transition-colors group opacity-60">
                    <td className="px-4 py-3 text-gray-500 flex items-center gap-2">
                      <div className="w-1 h-4 bg-yellow-700 rounded-full group-hover:bg-yellow-600"></div>
                      Method 1 / 3
                    </td>
                    <td className="px-4 py-3 text-right">~93.4%</td>
                    <td className="px-4 py-3 text-right">~94.8%</td>
                    <td className="px-4 py-3 text-right">~97.8%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-gradient-to-t from-green-900/10 to-transparent border-t border-[#222]">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-yellow-500 shrink-0 mt-0.5 animate-pulse" size={16} />
                <div>
                  <h4 className="text-xs font-bold text-white uppercase">Critical Analysis</h4>
                  <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                    Method 2 (Reverse Unfreezing) yielded the highest <b>Recall (95.02%)</b>. In cybersecurity, minimizing False Negatives is critical. This method correctly identified 5% more exploits than the baseline.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* 5. Detailed Architecture (ExBERT) */}
      <section className="pb-10">
        <SectionHeader title="System Architecture (ExBERT Implementation)" icon={Layers} color="purple" delay={1800} />
        <div className="cyber-panel p-10 bg-[#0b0b0b] relative overflow-hidden opacity-0 animate-fade-in-up" style={{ animationDelay: '2000ms' }}>
          <div className="absolute inset-0 bg-opacity-20 bg-grid-white/[0.05]"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black opacity-80"></div>

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-center gap-4 text-xs font-mono">
            
            {/* Input */}
            <div className="flex flex-col justify-center items-center gap-2 group">
              <div className="w-32 py-4 bg-[#1a1a1a] border border-gray-700 rounded-xl text-center text-gray-400 group-hover:border-white transition-colors shadow-lg">Input Text</div>
              <ArrowRight className="rotate-90 lg:rotate-0 text-gray-600 animate-pulse" />
            </div>

            {/* Tokenizer */}
            <div className="flex flex-col justify-center items-center gap-2 group">
              <div className="w-32 py-4 bg-[#1a1a1a] border border-gray-700 rounded-xl text-center text-gray-400 group-hover:text-white transition-colors">Tokenizer</div>
              <ArrowRight className="rotate-90 lg:rotate-0 text-gray-600 animate-pulse" />
            </div>

            {/* BERT */}
            <div className="flex-1 border-2 border-blue-500/30 bg-blue-900/5 rounded-2xl p-6 flex flex-col items-center justify-center text-center min-w-[200px] relative overflow-hidden group hover:border-blue-500/60 transition-all duration-500">
              <div className="absolute inset-0 bg-blue-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
              <Cpu size={40} className="text-blue-500 mb-3 opacity-80 relative z-10" />
              <h4 className="text-white font-bold text-sm relative z-10">BERT-Base</h4>
              <p className="text-[10px] text-blue-300 mt-1 relative z-10">12 Layers • 768 Hidden</p>
              <div className="mt-3 text-[9px] bg-blue-500/20 px-2 py-0.5 rounded text-blue-300 border border-blue-500/30 relative z-10">Phase 1 Weights</div>
            </div>

            {/* Connector */}
            <div className="flex items-center justify-center">
              <ArrowRight className="rotate-90 lg:rotate-0 text-gray-600 animate-pulse" />
            </div>

            {/* LSTM */}
            <div className="flex-1 border-2 border-purple-500/30 bg-purple-900/5 rounded-2xl p-6 flex flex-col items-center justify-center text-center min-w-[200px] relative overflow-hidden group hover:border-purple-500/60 transition-all duration-500">
              <div className="absolute inset-0 bg-purple-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
              <Network size={40} className="text-purple-500 mb-3 opacity-80 relative z-10" />
              <h4 className="text-white font-bold text-sm relative z-10">LSTM Layer</h4>
              <p className="text-[10px] text-purple-300 mt-1 relative z-10">256 Units • Sequential</p>
              <div className="mt-3 text-[9px] bg-purple-500/20 px-2 py-0.5 rounded text-purple-300 border border-purple-500/30 relative z-10">Feature Extraction</div>
            </div>

            {/* Connector */}
            <div className="flex items-center justify-center">
              <ArrowRight className="rotate-90 lg:rotate-0 text-gray-600 animate-pulse" />
            </div>

            {/* Output */}
            <div className="flex flex-col justify-center items-center gap-2">
              <div className="w-32 py-4 bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/40 rounded-xl text-center text-white shadow-[0_0_20px_rgba(239,68,68,0.3)] font-bold animate-pulse">
                Exploitability
              </div>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
