import React, { useState } from 'react';
import Sidebar from './components/ui/Sidebar';
import NVDTab from './components/tabs/NVDTab';
import ExploitDBTab from './components/tabs/ExploitDBTab';
import AIModels from './components/ai/AIModels';
import { Menu, Shield } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-800">Dashboard Overview</h2>
              <span className="text-sm text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
                Last Sync: {new Date().toLocaleDateString()}
              </span>
            </div>
            
            {/* Quick Stats / Summary Cards can go here */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                <h3 className="text-blue-100 text-sm font-medium mb-1">Total Vulnerabilities</h3>
                <p className="text-3xl font-bold">240,000+</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-slate-500 text-sm font-medium mb-1">High Risk Exploits</h3>
                <p className="text-3xl font-bold text-slate-800">12,450</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-slate-500 text-sm font-medium mb-1">AI Accuracy</h3>
                <p className="text-3xl font-bold text-indigo-600">93.9%</p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-700">Recent NVD Entries</h3>
                  <button onClick={() => setActiveTab('nvd')} className="text-sm text-blue-600 hover:underline">View All</button>
                </div>
                <div className="h-[400px] overflow-hidden relative">
                   {/* Pass compact prop to limit view */}
                   <NVDTab compact={true} />
                   <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-700">Exploit-DB Feed</h3>
                  <button onClick={() => setActiveTab('exploitdb')} className="text-sm text-blue-600 hover:underline">View All</button>
                </div>
                <div className="h-[400px] overflow-hidden relative">
                   <ExploitDBTab compact={true} />
                   <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'nvd':
        return <NVDTab />;
      case 'exploitdb':
        return <ExploitDBTab />;
      case 'ai-analysis':
        return <AIModels />;
      default:
        return <NVDTab />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar for Desktop */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar activeTab={activeTab} setActiveTab={(tab) => { setActiveTab(tab); setIsSidebarOpen(false); }} />
      </aside>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full w-full">
        {/* Top Navbar */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 z-10 sticky top-0">
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2 md:hidden">
              <Shield className="w-6 h-6 text-blue-600" />
              <span className="font-bold text-lg text-slate-800">VulnSight</span>
            </div>
            <h1 className="hidden md:block text-xl font-bold text-slate-800 capitalize tracking-tight">
              {activeTab.replace('-', ' ')}
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-100">
               <span className="relative flex h-2 w-2">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
               </span>
               System Operational
             </div>
             <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md ring-2 ring-white">
               AD
             </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto pb-10">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
