import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components/ui/Sidebar';
import NVDTab from './components/tabs/NVDTab';
import ExploitDBTab from './components/tabs/ExploitDBTab';
import AIModels from './components/ai/AIModels';
import DashboardTab from './components/tabs/DashboardTab';
import { Menu, ShieldCheck } from 'lucide-react';

// ۱. این کامپوننت داخلی است تا به useLocation دسترسی امن داشته باشد
function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // دریافت مسیر فعلی
  const location = useLocation();
  const activeTab = location.pathname.replace('/', '') || 'dashboard';

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-[#050505] text-gray-200 font-mono">
      {/* Background Effect */}
      <div className="cyber-grid"></div>

      {/* Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative z-10 transition-all duration-300 w-full">
        
        {/* Header */}
        <header className="h-16 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-[#1f1f1f] flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden p-2 text-cyan-500 hover:bg-cyan-900/20 rounded transition-colors"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-cyan-400 w-6 h-6" />
              <h1 className="text-xl font-bold tracking-widest text-white">
                VULN<span className="text-cyan-400">SIGHT</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 border border-green-500/30 bg-green-900/10 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">System Online</span>
            </div>
            <div className="w-8 h-8 rounded border border-cyan-500/50 bg-black flex items-center justify-center text-xs font-bold text-cyan-400">
              OP
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 overflow-hidden relative">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardTab />} />
            <Route path="/nvd" element={<NVDTab />} />
            <Route path="/exploitdb" element={<ExploitDBTab />} />
            <Route path="/ai-analysis" element={<AIModels />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

// ۲. کامپوننت اصلی که کپسول روتر را ایجاد می‌کند
export default function App() {
  return (
    <BrowserRouter>
      <MainLayout />
    </BrowserRouter>
  );
}
