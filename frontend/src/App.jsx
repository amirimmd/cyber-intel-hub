// --- App.jsx (فایل اصلی و پاکسازی شده) ---
import React, { useState } from 'react';
import { 
  BrainCircuit, ShieldAlert, Swords, User, 
  Rss, FileCode 
} from 'https://esm.sh/lucide-react@0.395.0'; 

// [FIX] Using @ alias for all imports
import { AIModels } from '@/components/ai/AIModels';
import { NVDTab } from '@/components/tabs/NVDTab';
import { ExploitDBTab } from '@/components/tabs/ExploitDBTab';
import { LoginTab } from '@/components/tabs/LoginTab';
import { TabButton } from '@/components/ui/TabButton';

// --- Main App Component (Layout logic updated) ---
function App() {
  // 'ai' is the default tab for both mobile and desktop
  const [activeTab, setActiveTab] = useState('ai'); 
  // [NEW] State for desktop data tabs (NVD vs ExploitDB)
  const [desktopDataTab, setDesktopDataTab] = useState('nvd');

  return (
    <>
      {/* Background Grid Effect */}
      <div className="background-grid"></div>

      {/* Main Container */}
      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8 relative z-10">

        {/* Main Header */}
        <h1 className="text-3xl md:text-5xl font-bold text-center mb-6 md:mb-10 bg-clip-text text-transparent bg-gradient-to-r from-cyber-green to-cyber-cyan section-header break-words">
          ::CYBERNETIC.INTELLIGENCE.HUB::
        </h1>

        {/* --- [START] Desktop Layout (md and up) --- */}
        <div className="hidden md:block">
          {/* AIModels is always visible on top */}
          <AIModels setActiveTab={() => {}} /> 
          
          {/* Desktop Tab Navigation for Data Feeds */}
          <div className="flex space-x-2 mb-6 -mt-6">
            <button 
                onClick={() => setDesktopDataTab('nvd')}
                className={`flex-1 flex items-center justify-center p-3 rounded-lg transition-all ${desktopDataTab === 'nvd' ? 'bg-cyber-card border border-cyber-cyan text-cyber-cyan shadow-lg' : 'bg-gray-900/50 text-gray-500 hover:bg-gray-800'}`}
            >
                <Rss className="w-5 h-5 mr-2" />
                <span className="font-bold text-lg">NVD_FEED_</span>
            </button>
            <button 
                onClick={() => setDesktopDataTab('exploits')}
                className={`flex-1 flex items-center justify-center p-3 rounded-lg transition-all ${desktopDataTab === 'exploits' ? 'bg-cyber-card border border-cyber-red text-cyber-red shadow-lg' : 'bg-gray-900/50 text-gray-500 hover:bg-gray-800'}`}
            >
                <FileCode className="w-5 h-5 mr-2" />
                <span className="font-bold text-lg">EXPLOIT_FEED_</span>
            </button>
            {/* --- [NEW] Login Icon Button for Desktop (FIXED) --- */}
            <button 
                onClick={() => setDesktopDataTab('user')}
                className={`flex-auto w-16 flex items-center justify-center p-3 rounded-lg transition-all ${desktopDataTab === 'user' ? 'bg-cyber-card border border-cyber-green text-cyber-green shadow-lg' : 'bg-gray-900/50 text-gray-500 hover:bg-gray-800'}`}
                title="User Login / Authentication"
            >
                <User className="w-5 h-5" />
            </button>
          </div>
          
          {/* Conditional Rendering for Desktop Tabs (FIXED) */}
          {desktopDataTab === 'nvd' && <NVDTab />}
          {desktopDataTab === 'exploits' && <ExploitDBTab />}
          {desktopDataTab === 'user' && <LoginTab />} {/* <-- [NEW] Added render logic for LoginTab */}
        </div>
        {/* --- [END] Desktop Layout --- */}


        {/* --- [START] Mobile App Layout (below md) --- */}
        <div className="md:hidden pb-20"> 
          
          <div id="mobile-tab-content">
            {/* All tabs now render normally */}
            {activeTab === 'ai' && <AIModels setActiveTab={setActiveTab} />}
            {activeTab === 'nvd' && <NVDTab />}
            {activeTab === 'exploits' && <ExploitDBTab />}
            {activeTab === 'user' && <LoginTab />}
          </div>

          {/* Bottom Navigation Bar */}
          <nav className="fixed bottom-0 left-0 right-0 h-16 bg-cyber-card border-t border-solid border-cyber-cyan/30 z-50 flex justify-around items-center shadow-lg backdrop-blur-sm bg-opacity-90">
            <TabButton 
              icon={BrainCircuit} 
              label="AI Models" 
              isActive={activeTab === 'ai'} 
              onClick={() => setActiveTab('ai')} 
            />
            <TabButton 
              icon={ShieldAlert} 
              label="NVD Feed" 
              isActive={activeTab === 'nvd'} 
              onClick={() => setActiveTab('nvd')} 
            />
            <TabButton 
              icon={Swords} 
              label="Exploits" 
              isActive={activeTab === 'exploits'} 
              onClick={() => setActiveTab('exploits')} 
            />
            <TabButton 
              icon={User} 
              label="User" 
              isActive={activeTab === 'user'} 
              onClick={() => setActiveTab('user')} 
            />
          </nav>
        </div>
        {/* --- [END] Mobile Layout --- */}

      </div>
    </>
  );
}

export default App;