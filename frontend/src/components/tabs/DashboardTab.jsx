import React from 'react';
import { 
  Activity, Database, Shield, Server, 
  Cpu, Globe, Terminal, Clock 
} from 'lucide-react';

const StatCard = ({ title, value, subtext, icon: Icon, color }) => (
  <div className="cyber-card relative overflow-hidden group hover:border-opacity-100 transition-all duration-300">
    <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
      <Icon size={64} />
    </div>
    <div className="relative z-10">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={18} className={color} />
        <h3 className="text-gray-400 text-xs font-mono uppercase tracking-widest">{title}</h3>
      </div>
      <p className="text-3xl font-bold text-white mb-1 font-mono">{value}</p>
      <p className="text-xs text-gray-500 flex items-center gap-1">
        <Activity size={10} className="text-emerald-500 animate-pulse" />
        {subtext}
      </p>
    </div>
    {/* Decorative Line */}
    <div className={`absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-500 ${color.replace('text-', 'bg-')}`}></div>
  </div>
);

const SystemLog = () => {
  const logs = [
    { time: '10:42:01', type: 'INFO', msg: 'System initialized successfully.' },
    { time: '10:42:05', type: 'SUCCESS', msg: 'Connected to Supabase Node [US-EAST].' },
    { time: '10:43:12', type: 'WARN', msg: 'NVD Feed rate limit detected. Throttling...' },
    { time: '10:43:15', type: 'SUCCESS', msg: 'NVD Sync resumed. Batch #402 processed.' },
    { time: '10:45:00', type: 'INFO', msg: 'AI Model [ExBERT] loaded in memory.' },
    { time: '10:48:30', type: 'SUCCESS', msg: 'Exploit-DB index updated (12 new entries).' },
  ];

  return (
    <div className="cyber-card h-full font-mono text-xs">
      <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-2">
        <h3 className="text-cyber-cyan flex items-center gap-2">
          <Terminal size={14} />
          SYSTEM_KERNEL_LOGS
        </h3>
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      </div>
      <div className="space-y-2 overflow-y-auto max-h-[200px] scrollbar-thin scrollbar-thumb-gray-700">
        {logs.map((log, i) => (
          <div key={i} className="flex gap-3 hover:bg-white/5 p-1 rounded px-2 transition-colors">
            <span className="text-gray-500">[{log.time}]</span>
            <span className={`${
              log.type === 'SUCCESS' ? 'text-emerald-400' : 
              log.type === 'WARN' ? 'text-yellow-400' : 'text-blue-400'
            }`}>
              {log.type}
            </span>
            <span className="text-gray-300">{log.msg}</span>
          </div>
        ))}
        <div className="flex gap-2 animate-pulse mt-2">
          <span className="text-emerald-500">➜</span>
          <span className="typing-cursor bg-emerald-500 w-2 h-4 block"></span>
        </div>
      </div>
    </div>
  );
};

export const DashboardTab = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight section-header">
            OPERATIONAL DASHBOARD
          </h1>
          <p className="text-gray-400 text-sm mt-1 font-mono">
            REAL-TIME INTELLIGENCE & SYSTEM MONITORING
          </p>
        </div>
        <div className="flex items-center gap-3 bg-black/30 p-2 rounded-lg border border-white/10 backdrop-blur-md">
          <Globe className="text-cyber-cyan animate-pulse" size={20} />
          <div className="text-right">
            <p className="text-[10px] text-gray-400 font-mono uppercase">Network Status</p>
            <p className="text-xs font-bold text-emerald-400">SECURE_ENCRYPTED</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total CVEs" 
          value="241,053" 
          subtext="Updated 2m ago" 
          icon={Database} 
          color="text-blue-500" 
        />
        <StatCard 
          title="Active Exploits" 
          value="45,210" 
          subtext="Syncing..." 
          icon={Shield} 
          color="text-red-500" 
        />
        <StatCard 
          title="AI Predictions" 
          value="93.8%" 
          subtext="Accuracy Rate" 
          icon={Cpu} 
          color="text-purple-500" 
        />
        <StatCard 
          title="Uptime" 
          value="99.9%" 
          subtext="System Healthy" 
          icon={Server} 
          color="text-emerald-500" 
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        {/* Logs Section (Takes 2 columns) */}
        <div className="lg:col-span-2">
          <SystemLog />
        </div>

        {/* Status Panel (Takes 1 column) */}
        <div className="cyber-card flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-xs font-mono text-gray-400 uppercase mb-4 flex items-center gap-2">
              <Clock size={14} />
              Active Processes
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white">NVD Data Stream</span>
                  <span className="text-emerald-400">IDLE</span>
                </div>
                <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-full opacity-20"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white">ExploitDB Sync</span>
                  <span className="text-blue-400">RUNNING</span>
                </div>
                <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-2/3 animate-scanline"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white">AI Model Inference</span>
                  <span className="text-purple-400">STANDBY</span>
                </div>
                <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 w-full opacity-20"></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-800">
            <button className="cyber-button w-full text-xs py-2">
              GENERATE FULL REPORT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
