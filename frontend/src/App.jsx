import React, { useState } from 'react';
// [FIX] تغییر به مسیر نسبی
import { supabase } from './supabaseClient.js'; 
import { 
  BrainCircuit, ShieldAlert, Swords, User, Menu, X
} from 'https://esm.sh/lucide-react@0.395.0'; 

// کامپوننت‌های تفکیک شده
// [FIX] تغییر به مسیر نسبی و اضافه کردن .jsx
import { Sidebar } from './components/ui/Sidebar.jsx';
import { AIModels } from './components/ai/AIModels.jsx';
import { NVDTab } from './components/tabs/NVDTab.jsx';
import { ExploitDBTab } from './components/tabs/ExploitDBTab.jsx';
import { LoginTab } from './components/tabs/LoginTab.jsx';

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

  // تابع برای انتخاب مدل
  const handleModelSelect = (modelKey) => {
    setActiveModel(modelKey);
  };

  return (
    <>
      {/* Background Grid Effect (z-index: 0) */}
      <div className="background-grid"></div>
      
      {/* [FIX] استفاده از h-full به جای h-screen برای جلوگیری از پرش کیبورد */}
      <div className="flex h-full w-full bg-dark-bg text-cyber-text">
        
        <Sidebar 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen} 
          activeTab={activeTab}
          setActiveTab={handleTabSelect} 
          activeModel={activeModel}
          setActiveModel={handleModelSelect}
        />

        {/* Main Content Area */}
        {/* [FIX] استفاده از h-full به جای h-screen */}
        <div className="flex flex-col flex-1 h-full">
          
          {/* [FIX] هدر موبایل با z-10 تا روی <main> باشد */}
          <header className="md:hidden relative z-10 flex items-center justify-between p-3 bg-cyber-card border-b border-cyber-cyan/20">
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

          {/* *** [FIX] راه حل اصلی اینجااست ***
            اضافه کردن 'relative' و 'z-0' (یا z-1)
            این کار یک stacking context جدید ایجاد می‌کند و تضمین می‌کند
            که محتوای <main> (شامل باکس چت) *بالای* '.background-grid'
            (که z-index: 0 است) قرار می‌گیرد و قابل کلیک است.
          */}
          <main className={`relative z-0 flex-1 ${activeTab === 'ai' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
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