import React from 'react';
import { 
  LayoutDashboard, ShieldAlert, Database, Bot, 
  X, LogOut, Settings 
} from 'lucide-react';

const NavItem = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`
      w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 border-l-2
      ${active 
        ? 'border-cyan-400 bg-cyan-900/10 text-cyan-400' 
        : 'border-transparent text-gray-500 hover:text-gray-200 hover:bg-white/5'}
    `}
  >
    <Icon size={18} className={active ? 'drop-shadow-[0_0_5px_rgba(0,240,255,0.5)]' : ''} />
    <span className="tracking-wide">{label}</span>
  </button>
);

export const Sidebar = ({ activeTab, setActiveTab, isOpen, setIsOpen }) => {
  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar Panel */}
      <aside 
        className={`
          fixed md:relative inset-y-0 left-0 z-50 w-64 bg-[#0a0a0a] border-r border-[#1f1f1f]
          transform transition-transform duration-300 ease-in-out flex flex-col justify-between
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div>
          <div className="h-16 flex items-center justify-between px-4 border-b border-[#1f1f1f]">
            <span className="text-xs font-bold text-gray-600 uppercase tracking-[0.2em]">Navigation</span>
            <button 
              onClick={() => setIsOpen(false)}
              className="md:hidden text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="mt-4 space-y-1">
            <NavItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            <NavItem icon={ShieldAlert} label="NVD Feed" active={activeTab === 'nvd'} onClick={() => setActiveTab('nvd')} />
            <NavItem icon={Database} label="Exploit DB" active={activeTab === 'exploitdb'} onClick={() => setActiveTab('exploitdb')} />
            <NavItem icon={Bot} label="AI Analysis" active={activeTab === 'ai-analysis'} onClick={() => setActiveTab('ai-analysis')} />
          </nav>
        </div>

        <div className="p-4 border-t border-[#1f1f1f]">
          <div className="mt-4 text-[10px] text-center text-gray-700 font-mono">
            VULNSIGHT CORE v2.1.0
          </div>
        </div>
      </aside>
    </>
  );
};
