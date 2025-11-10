import React from 'react';
import { 
  BrainCircuit, ShieldAlert, Swords, User, X
} from 'https://esm.sh/lucide-react@0.395.0'; 

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

  const navItems = [
    { key: 'ai', label: 'AI Models', icon: BrainCircuit },
    { key: 'nvd', label: 'NVD Feed', icon: ShieldAlert },
    { key: 'exploits', label: 'Exploit Feed', icon: Swords },
    { key: 'user', label: 'User Login', icon: User },
  ];

  return (
    <>
      {/* Overlay for mobile */}
      <div 
        className={`fixed inset-0 bg-black/60 z-30 md:hidden transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
      ></div>

      {/* Sidebar */}
      {/* [FIX] 
        - موقعیت‌یابی موبایل: fixed top-0 left-0 h-screen اضافه شد.
        - انیمیشن موبایل: transform و -translate-x-full اضافه شد.
        - موقعیت‌یابی دسکتاپ: relative h-auto (برای پر کردن flex)
      */}
      <aside 
        className={`
          flex flex-col flex-shrink-0 w-72 bg-cyber-card border-r border-cyber-cyan/20 z-40
          transition-transform duration-300 ease-in-out
          md:relative md:h-auto md:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          fixed top-0 left-0 h-screen
        `}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-cyber-cyan/30">
          <h2 className="text-xl font-bold text-white">:: C.I.H ::</h2>
          <button 
            onClick={() => setSidebarOpen(false)} 
            className="md:hidden text-gray-500 hover:text-white"
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        {/* [FIX] کانتینر اسکرول برای موبایل */}
        <div className="flex-1 overflow-y-auto">
          {/* Main Navigation */}
          <nav className="p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Analysis</h3>
            <ul className="space-y-2">
              {navItems.map(item => (
                <li key={item.key}>
                  <button
                    onClick={() => setActiveTab(item.key)}
                    className={`
                      w-full flex items-center space-x-3 p-3 rounded-lg transition-colors duration-150
                      ${activeTab === item.key ? 'bg-cyber-green/20 text-cyber-green' : 'text-cyber-text hover:bg-gray-800/50'}
                    `}
                  >
                    <item.icon className={`w-5 h-5 ${activeTab === item.key ? 'text-cyber-green' : 'text-cyber-cyan/70'}`} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Model Selection (Conditional) */}
          {activeTab === 'ai' && (
            <div className="p-4 border-t border-cyber-cyan/30">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Select Model</h3>
              <div className="flex flex-col space-y-2">
                {Object.keys(models).map(key => (
                  <button
                    key={key}
                    onClick={() => setActiveModel(key)}
                    className={`w-full text-left p-3 rounded-lg transition-colors duration-150 ${activeModel === key ? 'bg-cyber-green/20 text-cyber-green' : 'text-cyber-text hover:bg-gray-800/50'}`}
                  >
                    <span className="font-bold block">{models[key].title}</span>
                    <span className="text-xs text-gray-400">{models[key].description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

      </aside>
    </>
  );
};