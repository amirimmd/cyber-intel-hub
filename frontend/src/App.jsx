import React, { useState } from 'react';
import { supabase } from './supabaseClient.js'; // [FIX] تغییر به مسیر نسبی
import { 
  BrainCircuit, ShieldAlert, Swords, User, Menu, X
} from 'https://esm.sh/lucide-react@0.395.0'; 

// کامپوننت‌های تفکیک شده
// [FIX] اضافه کردن پسوند .jsx و تغییر به مسیر نسبی
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
      {/* Background Grid Effect */}
      <div className="background-grid"></div>
      
      {/* [FIX] 
        حذف 'overflow-hidden' از این div. 
        فایل index.css قبلاً overflow: hidden را روی html/body اعمال کرده است.
        وجود overflow: hidden در اینجا می‌تواند stacking context ناخواسته‌ای ایجاد کند
        و مانع از قرارگیری صحیح Sidebar (z-40) روی محتوا در موبایل شود.
        
        [FIX 2]
        تغییر h-screen به h-full برای جلوگیری از پرش صفحه در موبایل هنگام باز شدن کیبورد.
      */}
      <div className="flex h-full w-full bg-dark-bg text-cyber-text">
        
        <Sidebar 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen} 
          activeTab={activeTab}
          setActiveTab={handleTabSelect} // تابع جدید پاس داده شد
          activeModel={activeModel}
          setActiveModel={handleModelSelect} // تابع جدید پاس داده شد
        />

        {/* Main Content Area */}
        {/* [FIX] تغییر h-screen به h-full */}
        <div className="flex flex-col flex-1 h-full">
          
          {/* [FIX] 
            اضافه کردن 'relative' و 'z-10' به هدر.
            این تضمین می‌کند که هدر بالای محتوای 'main' (z-auto) قرار می‌گیرد
            اما همچنان زیر Overlay (z-30) و Sidebar (z-40) باقی می‌ماند.
          */}
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

          {/* [FIX] 
            اضافه کردن 'relative' و 'z-0' به تگ main.
            این کار یک stacking context جدید ایجاد می‌کند و تضمین می‌کند
            که محتوای اصلی (شامل باکس چت) بالای '.background-grid'
            (که z-index: 0 دارد) قرار می‌گیرد و قابل کلیک است.
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