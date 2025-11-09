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
    props: {}
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

  const handleTabSelect = (tab) => {
    setActiveTab(tab);
    setSidebarOpen(false); // بستن سایدبار در موبایل
  };

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
          setActiveTab={handleTabSelect} // تابع جدید پاس داده شد
          activeModel={activeModel}
          setActiveModel={handleModelSelect} // تابع جدید پاس داده شد
        />

        {/* Main Content Area */}
        <div className="flex flex-col flex-1 h-screen">
          
          {/* [FIX] هدر موبایل با دکمه همبرگری اصلاح شده */}
          <header className="md:hidden flex items-center justify-between p-3 bg-cyber-card border-b border-cyber-cyan/20">
            {/* دکمه همبرگری با استایل بهتر */}
            <button 
              onClick={() => setSidebarOpen(true)} 
              className="cyber-button !w-auto px-3 py-2 rounded-lg" // استایل دکمه اصلاح شد
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            
            <h1 className="text-lg font-bold text-white">{currentTabTitle}</h1>
            
            <div className="w-10"></div> {/* Spacer برای تراز وسط */}
          </header>

          {/* کانتینر اصلی محتوا (اصلاح شده در مکالمه قبلی) */}
          <main className={`flex-1 ${activeTab === 'ai' ? 'overflow-hidden p-4 md:p-8' : 'overflow-y-auto p-4 md:p-8'}`}>
            <ActiveComponent 
              {...(TABS[activeTab].props || {})}
              {...(activeTab === 'ai' && { activeModel, setActiveTab })}
            />
          </main>
        </div>

      </div>
    </>
  );
}

export default App;