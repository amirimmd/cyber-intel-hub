import React from 'react';
import { Shield, Server, Globe, Terminal, Cpu, Activity } from 'lucide-react';

const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className="cyber-panel p-5 relative overflow-hidden group">
    <div className={`absolute -right-4 -top-4 opacity-10 transition-transform group-hover:scale-110 duration-500 ${color}`}>
      <Icon size={100} />
    </div>
    <div className="flex items-center gap-3 mb-2">
      <Icon size={18} className={color.replace('text-', 'text-opacity-80 ')} />
      <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{label}</span>
    </div>
    <div className="text-2xl font-bold text-white font-mono">{value}</div>
    <div className="w-full h-0.5 bg-gray-800 mt-4 overflow-hidden">
      <div className={`h-full w-1/2 ${color.replace('text-', 'bg-')} animate-pulse`}></div>
    </div>
  </div>
);

const TerminalLog = () => {
  const logs = [
    { time: '10:00:01', level: 'INFO', msg: 'System kernel initialized.' },
    { time: '10:00:05', level: 'OK', msg: 'Secure connection established to DB_NODE_01.' },
    { time: '10:01:23', level: 'WARN', msg: 'High latency detected on NVD API feed.' },
    { time: '10:02:45', level: 'OK', msg: 'AI Model loaded: ExBERT_Phase3.' },
    { time: '10:05:12', level: 'INFO', msg: 'Scanning for new exploit signatures...' },
  ];

  return (
    <div className="cyber-panel p-4 h-full flex flex-col font-mono text-xs">
      <div className="flex items-center justify-between mb-4 border-b border-[#333] pb-2">
        <span className="text-gray-400">root@vulnsight:~# tail -f /var/log/syslog</span>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
        </div>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto max-h-[200px] scrollbar-none">
        {logs.map((log, i) => (
          <div key={i} className="flex gap-2 opacity-80 hover:opacity-100 transition-opacity">
            <span className="text-gray-600">[{log.time}]</span>
            <span className={`${
              log.level === 'OK' ? 'text-green-400' : 
              log.level === 'WARN' ? 'text-yellow-400' : 'text-blue-400'
            }`}>
              {log.level}
            </span>
            <span className="text-gray-300">{log.msg}</span>
          </div>
        ))}
        <div className="flex items-center gap-1 mt-2">
          <span className="text-green-500">➜</span>
          <span className="w-2 h-4 bg-green-500 animate-pulse"></span>
        </div>
      </div>
    </div>
  );
};

export default function DashboardTab() {
  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div className="flex items-end justify-between border-b border-[#1f1f1f] pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Mission Control</h2>
          <p className="text-xs text-gray-500 font-mono mt-1">OPERATIONAL STATUS: NOMINAL</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total CVEs" value="241,053" icon={Shield} color="text-blue-500" />
        <StatCard label="Exploits" value="45,210" icon={Terminal} color="text-red-500" />
        <StatCard label="AI Accuracy" value="93.8%" icon={Cpu} color="text-purple-500" />
        <StatCard label="Uptime" value="99.99%" icon={Server} color="text-green-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TerminalLog />
        </div>
        <div className="cyber-panel p-6 flex flex-col items-center justify-center text-center">
          <Activity size={48} className="text-cyan-500 mb-4 animate-pulse" />
          <h3 className="text-lg font-bold text-white">System Load</h3>
          <p className="text-xs text-gray-500 mt-2">Optimal Performance</p>
        </div>
      </div>
    </div>
  );
}
