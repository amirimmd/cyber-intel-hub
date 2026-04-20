import React from 'react';
import { 
  Database, Cpu, Layers, ArrowRight, 
  BrainCircuit, Network, Terminal,
  TrendingUp, Microscope, Zap, 
  AlertTriangle, ShieldCheck, 
  Activity, FileCode, CheckCircle, Code
} from 'lucide-react';

// --- Components ---

const SectionHeader = ({ title, icon: Icon, color, delay }) => (
  <div 
    className="flex items-center gap-3 mb-6 border-b border-[#1f1f1f] pb-3 pt-2 opacity-0 animate-slide-in-left"
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
      <span className="text-2xl lg:text-3xl font-bold text-white font-mono tracking-tight">{value}</span>
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
    className={`flex flex-col items-center text-center w-full sm:w-auto sm:max-w-[140px] relative z-10 opacity-0 animate-fade-in-up group`}
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

const SessionCard = ({ session, layers, acc, delta, active }) => (
  <div className={`flex items-center gap-4 p-3 rounded-lg border transition-all duration-300 ${active ? 'bg-green-900/10 border-green-500/30' : 'bg-[#1a1a1a] border-[#333] opacity-60'}`}>
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${active ? 'bg-green-500 text-black' : 'bg-gray-700 text-gray-400'}`}>
      {session}
    </div>
    <div className="flex-1">
      <div className="flex justify-between items-center mb-1">
        <span className={`text-xs font-bold ${active ? 'text-white' : 'text-gray-500'}`}>Unfreeze Layers {layers}</span>
        <span className={`text-xs font-mono ${active ? 'text-green-400' : 'text-gray-500'}`}>{acc}</span>
      </div>
      <div className="w-full h-1 bg-[#111] rounded-full overflow-hidden">
        <div className={`h-full ${active ? 'bg-green-500' : 'bg-gray-600'}`} style={{width: delta}}></div>
      </div>
    </div>
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
        
        {/* Connection Line - Hidden on smaller screens to prevent overlap */}
        <div className="hidden lg:block absolute top-[4.5rem] left-[10%] right-[10%] h-0.5 bg-[#222] -z-0">
          <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 opacity-30"></div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between relative z-10 gap-8 sm:gap-4">
          <PipelineStep step="01" title="Data Ingestion" desc="NVD (240k) + ExploitDB" active={true} delay={400} icon={Database} />
          <PipelineStep step="02" title="Domain Adaptation" desc="BERT MLM Fine-Tuning" active={true} delay={600} icon={Cpu} />
          <PipelineStep step="03" title="Feature Extraction" desc="ExBERT (BERT+LSTM)" active={true} delay={800} icon={Layers} />
          <PipelineStep step="04" title="XAI Optimization" desc="SHAP-Driven Weights" active={true} delay={1000} icon={Microscope} />
          <PipelineStep step="05" title="Deployment" desc="Real-time Inference" active={true} delay={1200} icon={Zap} />
        </div>
      </div>

      {/* Grid Layout for Phases - gap-y-24 ensures large safe vertical spacing on mobile */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-8 gap-y-24 xl:gap-y-16 mt-8">
        
        {/* 3. Phase 1: Knowledge Acquisition */}
        <section className="flex flex-col h-full">
          <SectionHeader title="Phase 1: Knowledge Acquisition" icon={Database} color="blue" delay={1400} />
          <div className="cyber-panel p-6 border-l-4 border-l-blue-500 flex-1 opacity-0 animate-fade-in-up flex flex-col" style={{ animationDelay: '1500ms' }}>
            
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
            <div className="flex-1 bg-[#0a0a0a] rounded-xl border border-[#222] p-5 relative overflow-hidden flex flex-col justify-end min-h-[220px]">
              <div className="absolute inset-0 bg-gradient-to-b from-blue-900/5 to-transparent"></div>
              
              <div className="flex items-end justify-around h-32 gap-2 relative z-10 w-full mb-8 mt-6">
                {/* Bars */}
                <div className="w-full max-w-[40px] bg-red-500/20 border border-red-500/30 rounded-t relative transition-all h-full flex justify-center group">
                  <span className="absolute -top-6 text-[10px] text-red-400 font-mono bg-[#111] px-1 rounded">111</span>
                  <span className="absolute -bottom-6 text-[9px] text-gray-500 uppercase tracking-wider font-mono">Ep 0</span>
                </div>
                
                <div className="w-full max-w-[40px] bg-orange-500/20 border border-orange-500/30 rounded-t relative h-[40%] flex justify-center group"></div>
                <div className="w-full max-w-[40px] bg-yellow-500/20 border border-yellow-500/30 rounded-t relative h-[25%] flex justify-center group"></div>
                
                <div className="w-full max-w-[40px] bg-blue-500/20 border border-blue-500/30 rounded-t relative h-[15%] flex justify-center group">
                   <span className="absolute -top-6 text-[10px] text-blue-400 font-mono bg-[#111] px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">16.7</span>
                </div>
                
                <div className="w-full max-w-[40px] bg-blue-500/20 border border-blue-500/30 rounded-t relative h-[10%] flex justify-center group"></div>
                
                <div className="w-full max-w-[40px] bg-green-500/40 border border-green-500/60 rounded-t relative h-[5%] shadow-[0_0_15px_rgba(34,197,94,0.4)] flex justify-center group">
                  <span className="absolute -top-7 text-xs text-green-400 font-bold font-mono bg-black/80 px-1.5 py-0.5 rounded border border-green-500/30">5.3</span>
                  <span className="absolute -bottom-6 text-[9px] text-green-400 font-bold uppercase tracking-wider font-mono">Final</span>
                </div>
              </div>

              <div className="border-t border-[#222] pt-3 relative z-10 text-center">
                <p className="text-[10px] text-gray-500">Model successfully adapted to cybersecurity terminology.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Phase 2: Supervised Fine-Tuning (NEW) */}
        <section className="flex flex-col h-full">
          <SectionHeader title="Phase 2: Supervised Fine-Tuning" icon={Code} color="orange" delay={1600} />
          <div className="cyber-panel p-6 border-l-4 border-l-orange-500 flex-1 opacity-0 animate-fade-in-up flex flex-col" style={{ animationDelay: '1700ms' }}>
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                  <Cpu size={14} className="text-orange-400" />
                  ExBERT Training (Labeled Data)
                </h3>
                <p className="text-[10px] text-gray-500 font-mono mt-1">Dataset: 56,804 samples (Train: 70%, Val: 15%, Test: 15%)</p>
              </div>
              <span className="px-2 py-1 bg-orange-900/30 text-orange-400 text-[9px] font-bold rounded border border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.2)]">
                COMPLETED
              </span>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <StatBox label="Test Acc" value="92.58%" color="orange" delay={1800} />
              <StatBox label="Test F1" value="92.65%" color="orange" delay={1900} />
              <StatBox label="Test AUC" value="97.72%" color="orange" delay={2000} />
            </div>

            {/* Code Snippet Window */}
            <div className="bg-[#050505] rounded-lg border border-[#222] overflow-hidden mb-4 flex-1 flex flex-col">
              <div className="bg-[#111] px-4 py-2 border-b border-[#222] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <FileCode size={12} className="text-gray-500" />
                  <span className="text-[10px] font-mono text-gray-400">train_classifier.py</span>
                </div>
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
                </div>
              </div>
              <div className="p-4 overflow-y-auto h-32 scrollbar-thin scrollbar-thumb-[#333] flex-1">
                <pre className="text-[9px] text-cyan-100/70 font-mono whitespace-pre-wrap break-all leading-relaxed">
{`# ExBERT Training Pipeline
model = ExBERT_Classifier(
    phase1_model_path=paths['phase1_model_path'],
    pooling_strategy='cls',
    use_multi_layer=True,
    dropout_rate=0.2
)

trainer = FinalTrainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_train_dataset,
    eval_dataset=tokenized_val_dataset,
    compute_metrics=compute_metrics,
)

train_result = trainer.train()
# Evaluating on Test Set...`}
                </pre>
              </div>
            </div>

            {/* Terminal Output Window */}
            <div className="bg-[#050505] rounded-lg border border-[#222] overflow-hidden shrink-0">
               <div className="bg-[#111] px-4 py-1.5 border-b border-[#222] flex items-center gap-2">
                   <Terminal size={12} className="text-gray-500" />
                   <span className="text-[10px] font-mono text-gray-400">Terminal Output</span>
               </div>
               <div className="p-3 overflow-x-auto scrollbar-thin scrollbar-thumb-[#333]">
                 <pre className="text-[9px] text-green-400 font-mono whitespace-pre">
{`--- 📋 FINAL MODEL PERFORMANCE ---
Total Training Time: 4544.45 seconds
---------------------------------
    Metric  Training Set  Validation Set  Test Set
  Accuracy        0.9559          0.9210    0.9258
  F1-Score        0.9563          0.9221    0.9265
 Precision        0.9459          0.9093    0.9177
    Recall        0.9669          0.9352    0.9354
       MCC        0.9120          0.8424    0.8518
       AUC        0.9912          0.9771    0.9772`}
                 </pre>
               </div>
            </div>

          </div>
        </section>

        {/* 5. Phase 3: XAI Optimization (Spans 2 columns on extra large screens) */}
        <section className="xl:col-span-2 flex flex-col h-full">
          <SectionHeader title="Phase 3: XAI-Driven Results" icon={TrendingUp} color="green" delay={2000} />
          <div className="cyber-panel p-6 border-l-4 border-l-green-500 flex-1 overflow-hidden opacity-0 animate-fade-in-up flex flex-col xl:flex-row gap-8" style={{ animationDelay: '2200ms' }}>
            
            {/* Logic Flow & Sessions */}
            <div className="flex-1 space-y-6">
              <div className="relative">
                <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                  <CheckCircle size={14} className="text-green-400" />
                  SHAP Retraining Loop
                </h3>
                
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center text-[10px] font-mono relative z-10">
                  <div className="bg-[#1a1a1a] p-3 rounded-lg border border-red-500/30 w-full sm:w-1/3">
                    <AlertTriangle className="mx-auto text-red-500 mb-2" size={16} />
                    <div className="text-red-300 font-bold">Misclassified</div>
                  </div>
                  
                  <ArrowRight className="text-gray-600 rotate-90 sm:rotate-0 shrink-0" size={16} />
                  
                  <div className="bg-[#1a1a1a] p-3 rounded-lg border border-blue-500/30 w-full sm:w-1/3">
                    <Microscope className="mx-auto text-blue-500 mb-2" size={16} />
                    <div className="text-blue-300 font-bold">SHAP Weights</div>
                  </div>

                  <ArrowRight className="text-gray-600 rotate-90 sm:rotate-0 shrink-0" size={16} />

                  <div className="bg-green-900/10 p-3 rounded-lg border border-green-500/50 w-full sm:w-1/3 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                    <Zap className="mx-auto text-green-500 mb-2" size={16} />
                    <div className="text-green-300 font-bold">Retraining</div>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#222] pt-4">
                <h3 className="text-white font-bold text-sm mb-3">Evolution of Method 2 (Reverse Unfreezing)</h3>
                <div className="space-y-2">
                  <SessionCard session="1" layers="12 (Top)" acc="92.79%" delta="20%" active={false} />
                  <SessionCard session="2" layers="6 → 12" acc="93.06%" delta="50%" active={false} />
                  <SessionCard session="3" layers="0 → 12 (All)" acc="93.84%" delta="100%" active={true} />
                </div>
              </div>
            </div>

            {/* Results Table */}
            <div className="flex-1 flex flex-col justify-end">
              <div className="bg-[#111] rounded-xl border border-[#222] overflow-hidden">
                <div className="bg-[#0c0c0c] p-3 border-b border-[#222] flex justify-between items-center">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Performance Comparison</span>
                  <span className="text-[9px] font-mono text-green-500 flex items-center gap-1 bg-green-900/20 px-2 py-0.5 rounded border border-green-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    Method 2 Winner
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[10px] sm:text-xs font-mono min-w-[300px]">
                    <thead className="bg-[#161616] text-gray-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3 font-medium">Strategy</th>
                        <th className="px-4 py-3 font-medium text-right">Acc</th>
                        <th className="px-4 py-3 font-medium text-right">Recall</th>
                        <th className="px-4 py-3 font-medium text-right">Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1f1f1f]">
                      <tr className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 text-gray-400">Baseline (Ph2)</td>
                        <td className="px-4 py-3 text-right">92.58%</td>
                        <td className="px-4 py-3 text-right text-gray-400">93.54%</td>
                        <td className="px-4 py-3 text-right text-red-400">7.42%</td>
                      </tr>
                      
                      {/* Highlighted Method 2 */}
                      <tr className="bg-green-900/10 hover:bg-green-900/20 transition-colors relative group">
                        <td className="px-4 py-4 text-white font-bold flex items-center gap-2">
                          <div className="w-1 h-3 bg-green-500 rounded-full"></div>
                          Method 2 (Rev)
                        </td>
                        <td className="px-4 py-4 text-right text-white font-bold">93.84%</td>
                        <td className="px-4 py-4 text-right text-green-400 font-bold">95.02%</td>
                        <td className="px-4 py-4 text-right text-white">6.16%</td>
                      </tr>

                      <tr className="hover:bg-white/5 transition-colors opacity-60">
                        <td className="px-4 py-3 text-gray-500">Method 1 / 3</td>
                        <td className="px-4 py-3 text-right">~93.4%</td>
                        <td className="px-4 py-3 text-right">~94.8%</td>
                        <td className="px-4 py-3 text-right">~6.6%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
          </div>
        </section>

      </div>

      {/* 6. Detailed Architecture (ExBERT) */}
      <section className="pb-10 pt-4 flex flex-col">
        <SectionHeader title="System Architecture (ExBERT Implementation)" icon={Layers} color="purple" delay={2400} />
        <div className="cyber-panel p-6 sm:p-10 bg-[#0b0b0b] relative overflow-hidden opacity-0 animate-fade-in-up flex-1" style={{ animationDelay: '2600ms' }}>
          <div className="absolute inset-0 bg-opacity-20 bg-grid-white/[0.05]"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black opacity-80"></div>

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-center gap-4 text-xs font-mono">
            
            {/* Input */}
            <div className="flex flex-col justify-center items-center gap-2 group w-full lg:w-auto">
              <div className="w-full lg:w-32 py-4 bg-[#1a1a1a] border border-gray-700 rounded-xl text-center text-gray-400 group-hover:border-white transition-colors shadow-lg">Input Text</div>
              <ArrowRight className="rotate-90 lg:rotate-0 text-gray-600 animate-pulse" />
            </div>

            {/* Tokenizer */}
            <div className="flex flex-col justify-center items-center gap-2 group w-full lg:w-auto">
              <div className="w-full lg:w-32 py-4 bg-[#1a1a1a] border border-gray-700 rounded-xl text-center text-gray-400 group-hover:text-white transition-colors">Tokenizer</div>
              <ArrowRight className="rotate-90 lg:rotate-0 text-gray-600 animate-pulse" />
            </div>

            {/* BERT */}
            <div className="flex-1 border-2 border-blue-500/30 bg-blue-900/5 rounded-2xl p-6 flex flex-col items-center justify-center text-center w-full lg:min-w-[200px] relative overflow-hidden group hover:border-blue-500/60 transition-all duration-500">
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
            <div className="flex-1 border-2 border-purple-500/30 bg-purple-900/5 rounded-2xl p-6 flex flex-col items-center justify-center text-center w-full lg:min-w-[200px] relative overflow-hidden group hover:border-purple-500/60 transition-all duration-500">
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
            <div className="flex flex-col justify-center items-center gap-2 w-full lg:w-auto">
              <div className="w-full lg:w-32 py-4 bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/40 rounded-xl text-center text-white shadow-[0_0_20px_rgba(239,68,68,0.3)] font-bold animate-pulse">
                Exploitability
              </div>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
