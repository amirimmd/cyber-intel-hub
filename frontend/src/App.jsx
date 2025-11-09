// --- App.jsx (کاملاً بازنویسی شده برای چیدمان جدید) ---
import React, { useState } from 'react';
import { 
  Menu, // برای هدر موبایل
  BrainCircuit, ShieldAlert, Swords, User 
} from 'https://esm.sh/lucide-react@0.395.0'; 

// کامپوننت‌های اصلی
import { Sidebar } from '@/components/ui/Sidebar';
import { AIModels } from '@/components/ai/AIModels';
import { NVDTab } from '@/components/tabs/NVDTab';
import { ExploitDBTab } from '@/components/tabs/ExploitDBTab';
import { LoginTab } from '@/components/tabs/LoginTab';

// آبجکت مدل‌ها به اینجا منتقل شد تا هم توسط سایدبار و هم کامپوننت چت استفاده شود
const models = {
  'exbert': { title: 'MODEL::EXBERT_', description: 'Exploitability Probability Analysis' },
  'xai': { title: 'MODEL::EXBERT.XAI_', description: '[SIMULATED] Explainable AI (SHAP)' },
  'other': { title: 'MODEL::GENERAL.PURPOSE_', description: '[SIMULATED] General Purpose Model' },
};

function App() {
  // 'ai' تب پیش‌فرض است
  const [activeTab, setActiveTab] = useState('ai'); 
  // State برای باز/بسته بودن سایدبار در موبایل
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // State برای مدل هوش مصنوعی (از AIModels به اینجا منتقل شد)
  const [activeModel, setActiveModel] = useState('exbert');

  // مپ کردن تب فعال به کامپوننت و عنوان آن
  const TABS = {
    'ai': {
      Component: AIModels,
      Title: "Intelligent Analysis Unit",
      props: { activeModel } // پاس دادن مدل فعال به کامپوننت چت
    },
    'nvd': {
      Component: NVDTab,
      Title: "NVD Feed"
    },
    'exploits': {
      Component: ExploitDBTab,
      Title: "Exploit Feed"
    },
    'user': {
      Component: LoginTab,
      Title: "User Authentication"
    },
  };

  const ActiveComponent = TABS[activeTab].Component;
  const activeTitle = TABS[activeTab].Title;

  return (
    <>
      {/* Background Grid Effect */}
      <div className="background-grid"></div>

      {/* Main Layout Container (Full Screen) */}
      <div className="flex h-screen w-full bg-dark-bg text-cyber-text">
        
        {/* --- Sidebar (New Component) --- */}
        <Sidebar
          models={models}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeModel={activeModel}
          setActiveModel={setActiveModel}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        {/* --- Main Content Area --- */}
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Header (for Mobile Menu Button & Title) */}
          <header className="flex md:hidden items-center justify-between p-3 border-b border-cyber-cyan/20 bg-cyber-card flex-shrink-0">
            <button 
              onClick={() => setSidebarOpen(true)} 
              className="text-cyber-cyan hover:text-cyber-green"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-lg font-bold text-white">{activeTitle}</h2>
            <div className="w-8"></div> {/* Spacer */}
          </header>

          {/* Scrollable Content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            <ActiveComponent {...(TABS[activeTab].props || {})} />
          </main>
        </div>

      </div>
    </>
  );
}

export default App;