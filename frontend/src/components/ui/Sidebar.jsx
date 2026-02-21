import React from 'react';
import { Link } from 'react-router-dom';
import { 
  LayoutDashboard, ShieldAlert, Database, Bot, 
  X, LogOut, Settings 
} from 'lucide-react';

const NavItem = ({ icon: Icon, label, to, active, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`
      w-full flex items-center gap-4 px-6 py-4 text-base font-medium transition-all duration-200 border-l-4
      ${active 
        ? 'border-cyan-400 bg-cyan-900/10 text-cyan-400 shadow-[inset_10px_0_20px_-10px_rgba(0,240,255,0.1)]' 
        : 'border-transparent text-gray-400 hover:text-gray-100 hover:bg-white/5'}
    `}
  >
    <Icon size={22} className={active ? 'drop-shadow-[0_0_5px_rgba(0,240,255,0.5)]' : ''} />
    <span className="tracking-wide uppercase">{label}</span>
  </Link>
);

export const Sidebar = ({ activeTab, isOpen, setIsOpen }) => {
  return (
    <>
      {/* Mobile Overlay with Blur Effect */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar Panel */}
      <aside 
        className={`
          fixed md:relative inset-y-0 left-0 z-50 w-72 bg-[#0a0a0a] border-r border-[#1f1f1f] shadow-2xl
          transform transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1) flex flex-col justify-between
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div>
          {/* Header Area */}
          <div className="h-20 flex items-center justify-between px-6 border-b border-[#1f1f1f]">
            <span className="text-sm font-bold text-gray-500 uppercase tracking-[0.25em]">Navigation</span>
            <button 
              onClick={() => setIsOpen(false)}
              className="md:hidden p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="mt-6 space-y-2">
            <NavItem icon={LayoutDashboard} label="Dashboard" to="/dashboard" active={activeTab === 'dashboard'} onClick={() => setIsOpen(false)} />
            <NavItem icon={ShieldAlert} label="NVD Feed" to="/nvd" active={activeTab === 'nvd'} onClick={() => setIsOpen(false)} />
            <NavItem icon={Database} label="Exploit DB" to="/exploitdb" active={activeTab === 'exploitdb'} onClick={() => setIsOpen(false)} />
            <NavItem icon={Bot} label="AI Analysis" to="/ai-analysis" active={activeTab === 'ai-analysis'} onClick={() => setIsOpen(false)} />
          </nav>
        </div>

        {/* Footer Area */}
        <div className="p-6 border-t border-[#1f1f1f] bg-[#0f0f0f]">
          <div className="flex items-center gap-3 px-4 py-3 text-sm text-gray-400 hover:text-cyan-400 cursor-pointer transition-colors rounded-lg hover:bg-white/5">
            <Settings size={18} />
            <span>System Config</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 text-sm text-gray-400 hover:text-red-400 cursor-pointer transition-colors rounded-lg hover:bg-white/5 mt-1">
            <LogOut size={18} />
            <span>Secure Logout</span>
          </div>
          <div className="mt-6 text-[11px] text-center text-gray-600 font-mono tracking-widest">
            VULNSIGHT CORE v2.1.0
          </div>
        </div>
      </aside>
    </>
  );
};
