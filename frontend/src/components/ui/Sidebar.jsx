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
        <Icon size={20} className="mr-3" />
        <span className="font-medium">{label}</span>
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
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* [FIX] سایدبار کانتینر
        - h-full به h-screen تغییر کرد.
        - top-0 و left-0 برای موقعیت‌یابی fixed اضافه شد.
      */}
      <div 
        className={`fixed md:relative z-40 flex flex-col flex-shrink-0 w-72 bg-cyber-card border-r border-cyber-cyan/20 transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 top-0 left-0 h-screen`} 
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-cyber-cyan/20 flex-shrink-0">
          <h2 className="text-xl font-bold text-white">C.I.H_</h2>
          <button 
            onClick={() => setSidebarOpen(false)} 
            className="md:hidden text-gray-500 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* [FIX] کانتینر اسکرول برای موبایل */}
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
                    <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Select Model</h3>
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
        
        </div> {/* End Scrollable Container */}
        
      </div>
    </>
  );
};