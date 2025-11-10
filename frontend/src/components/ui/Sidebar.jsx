import React from 'react';
import { 
  BrainCircuit, ShieldAlert, Swords, User, X
} from 'https://esm.sh/lucide-react@0.395.0'; 

// کامپوننت دکمه ناوبری داخلی
const NavButton = ({ icon: Icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center w-full p-3 rounded-lg transition-colors duration-150 ${
      isActive
        ? 'bg-cyber-green/20 text-cyber-green'
        : 'text-cyber-text hover:bg-gray-800/50'
    }`}
  >
    <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-cyber-green' : 'text-gray-500'}`} />
    <span className="font-medium whitespace-nowrap">{label}</span>
  </button>
);

// کامپوننت دکمه انتخاب مدل داخلی
const ModelButton = ({ title, description, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full text-left p-3 rounded-lg transition-colors duration-150 ${
      isActive
        ? 'bg-cyber-green/20 text-cyber-green'
        : 'text-cyber-text hover:bg-gray-800/50'
    }`}
  >
    <span className="font-bold block">{title}</span>
    <span className="text-xs text-gray-400">{description}</span>
  </button>
);

export const Sidebar = ({ 
  sidebarOpen, 
  setSidebarOpen, 
  activeTab, 
  setActiveTab, 
  activeModel, 
  setActiveModel 
}) => {
  
  const models = {
    'exbert': { title: 'MODEL::EXBERT_', description: 'Exploitability Probability Analysis' },
    'xai': { title: 'MODEL::EXBERT.XAI_', description: '[SIMULATED] Explainable AI (SHAP)' },
    'other': { title: 'MODEL::GENERAL.PURPOSE_', description: '[SIMULATED] General Purpose Model' },
  };

  return (
    <>
      {/* Overlay for mobile */}
      <div 
        className={`fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
      ></div>

      {/* Sidebar */}
      {/* [FIX] 
        - Replaced h-full with h-screen for correct mobile height
        - Added top-0 and left-0 for correct mobile positioning
      */}
      <aside 
        className={`fixed md:sticky top-0 left-0 z-40 flex flex-col flex-shrink-0 w-72 bg-cyber-card border-r border-cyber-cyan/20 transition-transform duration-300 ease-in-out md:translate-x-0 h-screen ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-cyber-cyan/20">
          <h2 className="text-xl font-bold text-white">C.I.H</h2>
          <button 
            onClick={() => setSidebarOpen(false)} 
            className="md:hidden text-gray-500 hover:text-white"
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        {/* [FIX] Wrapper for scrolling */}
        <div className="flex-1 overflow-y-auto">
          {/* Main Navigation */}
          <nav className="p-4 space-y-2">
            <NavButton 
              icon={BrainCircuit} 
              label="AI Models" 
              isActive={activeTab === 'ai'} 
              onClick={() => setActiveTab('ai')} 
            />
            <NavButton 
              icon={ShieldAlert} 
              label="NVD Feed" 
              isActive={activeTab === 'nvd'} 
              onClick={() => setActiveTab('nvd')} 
            />
            <NavButton 
              icon={Swords} 
              label="Exploit Feed" 
              isActive={activeTab === 'exploits'} 
              onClick={() => setActiveTab('exploits')} 
            />
            <NavButton 
              icon={User} 
              label="User Login" 
              isActive={activeTab === 'user'} 
              onClick={() => setActiveTab('user')} 
            />
          </nav>

          {/* Model Selector (Conditional) */}
          {activeTab === 'ai' && (
            <div className="p-4 border-t border-cyber-cyan/20">
              <h3 className="text-lg font-bold text-white mb-4">Select Model</h3>
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

        {/* Sidebar Footer (Optional) */}
        <div className="p-4 border-t border-cyber-cyan/20">
          <p className="text-xs text-gray-500">SESSION_STATUS: ACTIVE</p>
        </div>
      </aside>
    </>
  );
};