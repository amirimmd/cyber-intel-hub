// --- components/ui/Sidebar.jsx ---
// (کامپوننت جدید برای نوار کناری اصلی)

import React from 'react';
import { 
  BrainCircuit, ShieldAlert, Swords, User, X, 
  Rss, FileCode // (آیکون‌های قبلی App.jsx به اینجا منتقل شدند)
} from 'https://esm.sh/lucide-react@0.395.0';

// کامپوننت دکمه نویگیشن سایدبار
const NavButton = ({ icon: Icon, label, isActive, onClick, colorClass = 'cyan' }) => {
  const activeClasses = colorClass === 'cyan' 
    ? 'bg-cyber-cyan/10 text-cyber-cyan border-l-2 border-cyber-cyan' 
    : 'bg-cyber-red/10 text-cyber-red border-l-2 border-cyber-red';
  
  return (
    <button
      onClick={onClick}
      className={`flex items-center w-full p-3 text-sm font-medium transition-colors duration-150 ${
        isActive 
          ? activeClasses 
          : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
      }`}
    >
      <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
};

// کامپوننت دکمه انتخاب مدل (از AIModels.jsx)
const ModelButton = ({ title, description, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full text-left p-3 rounded-lg transition-colors duration-150 ${
      isActive 
        ? 'bg-cyber-green/20 text-cyber-green' 
        : 'text-cyber-text hover:bg-gray-800/50'
    }`}
  >
    <span className="font-bold block text-sm">{title}</span>
    <span className="text-xs text-gray-400">{description}</span>
  </button>
);


export const Sidebar = ({ 
  models, 
  activeTab, 
  setActiveTab, 
  activeModel, 
  setActiveModel, 
  sidebarOpen, 
  setSidebarOpen 
}) => {

  const handleNavClick = (tab) => {
    setActiveTab(tab);
    setSidebarOpen(false); // بستن سایدبار در موبایل پس از کلیک
  };

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar Container */}
      <div 
        className={`fixed md:relative z-40 flex flex-col flex-shrink-0 w-72 h-full bg-cyber-card border-r border-cyber-cyan/20 transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-cyber-cyan/20 flex-shrink-0">
          <h1 className="text-xl font-bold text-white whitespace-nowrap bg-clip-text text-transparent bg-gradient-to-r from-cyber-green to-cyber-cyan">
            C.I.H
          </h1>
          <button onClick={() => setSidebarOpen(false)} className="text-gray-500 hover:text-white md:hidden">
            <X size={20} />
          </button>
        </div>

        {/* Main Navigation */}
        <nav className="flex-shrink-0 py-4 border-b border-cyber-cyan/20">
          <NavButton 
            icon={BrainCircuit} 
            label="AI Models"
            isActive={activeTab === 'ai'}
            onClick={() => handleNavClick('ai')}
            colorClass="cyan"
          />
          <NavButton 
            icon={ShieldAlert} 
            label="NVD Feed"
            isActive={activeTab === 'nvd'}
            onClick={() => handleNavClick('nvd')}
            colorClass="cyan"
          />
          <NavButton 
            icon={Swords} 
            label="Exploit Feed"
            isActive={activeTab === 'exploits'}
            onClick={() => handleNavClick('exploits')}
            colorClass="red"
          />
          <NavButton 
            icon={User} 
            label="User Login"
            isActive={activeTab === 'user'}
            onClick={() => handleNavClick('user')}
            colorClass="cyan"
          />
        </nav>

        {/* Conditional Model Selector (فقط زمانی که تب AI فعال است) */}
        {activeTab === 'ai' && (
          <div className="flex-1 flex flex-col p-4 overflow-y-auto">
            <h3 className="text-sm font-medium text-gray-400 mb-2 uppercase">Select Model</h3>
            <div className="flex flex-col space-y-2">
              {Object.keys(models).map(key => (
                <ModelButton
                  key={key}
                  title={models[key].title}
                  description={models[key].description}
                  isActive={activeModel === key}
                  onClick={() => setActiveModel(key)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};