import React, { useState } from 'react';
import { supabase } from '@/supabaseClient';
import { 
  BrainCircuit, ShieldAlert, Swords, User, Menu, X
} from 'https://esm.sh/lucide-react@0.395.0'; 

// کامپوننت‌های تفکیک شده
import { Sidebar } from '@/components/ui/Sidebar';
import { AIModels } from '@/components/ai/AIModels';
import { NVDTab } from '@/components/tabs/NVDTab';
import { ExploitDBTab } from '@/components/tabs/ExploitDBTab';
import { LoginTab } from '@/components/tabs/LoginTab';

// تعریف تب‌ها
const TABS = {
  'ai': { 
    component: AIModels, 
    title: 'AI Models', 
    props: {} // پراپ‌ها به صورت پویا پاس داده می‌شوند
  },
  'nvd': { 
    component: NVDTab, 
    title: 'NVD Feed' 
  },
  'exploits': { 
    component: ExploitDBTab, 
    title: 'Exploit Feed' 
  },
  'user': { 
    component: LoginTab, 
    title: 'User Login' 
  },
};

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('ai'); // تب پیش‌فرض
  const [activeModel, setActiveModel] = useState('exbert'); // مدل پیش‌فرض AI

  const ActiveComponent = TABS[activeTab].component;
  const currentTabTitle = TABS[activeTab].title;

  // تابع برای بستن سایدبار در موبایل هنگام انتخاب تب
  const handleTabSelect = (tab) => {
    setActiveTab(tab);
    setSidebarOpen(false); // بستن سایدبار در موبایل
  };

  // تابع برای انتخاب مدل (از سایدبار به اینجا منتقل شد)
  const handleModelSelect = (modelKey) => {
    setActiveModel(modelKey);
  };

  return (
    <>
      {/* Background Grid Effect */}
      <div className="background-grid"></div>
      
      {/* Main App Layout (Full Screen) */}
      <div className="flex h-screen w-full bg-dark-bg text-cyber-text overflow-hidden">
        
        <Sidebar 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen} 
          activeTab={activeTab}
          setActiveTab={handleTabSelect} 
          activeModel={activeModel}
          setActiveModel={handleModelSelect} 
        />

        {/* Main Content Area */}
        <div className="flex flex-col flex-1 h-screen">
          
          {/* [FIX] هدر موبایل با دکمه همبرگری اصلاح شده */}
          <header className="md:hidden flex items-center justify-between p-3 bg-cyber-card border-b border-cyber-cyan/20">
            <button 
              onClick={() => setSidebarOpen(true)} 
              className="cyber-button !w-auto px-3 py-2 rounded-lg" // استایل دکمه بهبود یافت
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            
            <h1 className="text-lg font-bold text-white">{currentTabTitle}</h1>
            
            <div className="w-10"></div> {/* Spacer */}
          </header>

          {/* [FIX] کانتینر اصلی محتوا اصلاح شد.
            - padding (p-4 md:p-8) از اینجا حذف شد.
            - overflow-y-auto (اسکرول) فقط برای تب‌های غیر چت اعمال می‌شود.
          */}
          <main className={`flex-1 ${activeTab === 'ai' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
            <ActiveComponent 
              {...(TABS[activeTab].props || {})}
              // پراپ‌های مورد نیاز کامپوننت AIModels به صورت شرطی پاس داده شد
              {...(activeTab === 'ai' && { activeModel, setActiveTab })}
            />
          </main>
        </div>

      </div>
    </>
  );
}

export default App;
