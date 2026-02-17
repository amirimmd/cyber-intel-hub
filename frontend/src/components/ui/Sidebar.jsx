import React from 'react';
import { 
  LayoutDashboard, ShieldAlert, Swords, BrainCircuit, 
  LogOut, Settings, X, Hexagon 
} from 'lucide-react';

const NavItem = ({ icon: Icon, label, active, onClick, delay }) => (
  <button
    onClick={onClick}
    className={`
      group relative flex items-center w-full p-3 rounded-xl mb-2 transition-all duration-300 ease-out
      ${active 
        ? 'bg-gradient-to-r from-cyan-900/40 to-transparent text-white border-l-2 border-cyber-cyan' 
        : 'text-gray-400 hover:text-white hover:bg-white/5'}
    `}
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className={`
      absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300
      bg-gradient-to-r from-cyan-500/10 to-transparent
    `}></div>
    
    <Icon 
      className={`w-5 h-5 mr-3 z-10 transition-colors duration-300 ${active ? 'text-cyber-cyan drop-shadow-[0_0_5px_rgba(0,255,255,0.5)]' : 'group-hover:text-cyber-cyan'}`} 
    />
    <span className="z-10 text-sm font-medium tracking-wide">{label}</span>
    
    {active && (
      <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-cyber-cyan shadow-[0_0_8px_#00ffff]"></div>
    )}
  </button>
);

export const Sidebar = ({ activeTab, setActiveTab, sidebarOpen, setSidebarOpen }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'nvd', label: 'NVD Feed', icon: ShieldAlert },
    { id: 'exploitdb', label: 'Exploit DB', icon: Swords },
    { id: 'ai-analysis', label: 'AI Analysis', icon: BrainCircuit },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar Container */}
      <aside 
        className={`
          fixed md:relative top-0 left-0 z-50 h-screen w-72 
          bg-[#0d1117]/95 backdrop-blur-xl border-r border-white/10
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          flex flex-col
        `}
      >
        {/* Logo Area */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Hexagon className="w-8 h-8 text-cyber-cyan animate-pulse" />
              <div className="absolute inset-0 bg-cyber-cyan/20 blur-lg rounded-full"></div>
            </div>
            <div>
              <h1 className="font-bold text-white text-lg tracking-wider">VULN<span className="text-cyber-cyan">SIGHT</span></h1>
              <p className="text-[10px] text-gray-500 font-mono tracking-widest">INTEL.HUB v2.0</p>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-4">
          <p className="text-xs font-mono text-gray-600 mb-4 px-2 uppercase">Main Modules</p>
          {menuItems.map((item, index) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.id}
              onClick={() => {
                setActiveTab(item.id);
                setSidebarOpen(false);
              }}
              delay={index * 50}
            />
          ))}
        </nav>

        {/* User Profile / Footer */}
        <div className="p-4 border-t border-white/5 bg-black/20">
          <button className="flex items-center w-full p-3 rounded-lg hover:bg-white/5 transition-colors group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyber-cyan to-blue-600 p-[1px]">
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-xs font-bold text-white">
                AD
              </div>
            </div>
            <div className="ml-3 text-left">
              <p className="text-sm text-white font-medium group-hover:text-cyber-cyan transition-colors">Admin User</p>
              <p className="text-xs text-gray-500">Security Analyst</p>
            </div>
            <Settings className="ml-auto w-4 h-4 text-gray-500 group-hover:rotate-90 transition-transform duration-500" />
          </button>
        </div>
      </aside>
    </>
  );
};
