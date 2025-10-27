// frontend/src/App.jsx
import React from 'react';
// [اصلاح شده] پسوند .jsx به ایمپورت ها اضافه شد
import NVDTable from './components/NVDTable.jsx'; 
import AIModelCard from './components/AIModelCard.jsx'; 
import ExploitDBTable from './components/ExploitDBTable.jsx'; 
import { BrainCircuit, ShieldAlert, Swords } from 'lucide-react'; 

function App() {
  return (
    <>
      {/* Background Grid Effect */}
      <div className="background-grid"></div>

      <div className="container mx-auto p-4 md:p-8 relative z-10">

        {/* Main Header */}
        <h1 className="text-3xl md:text-5xl font-bold text-center mb-10 bg-clip-text text-transparent bg-gradient-to-r from-cyber-green to-cyber-cyan section-header">
          ::CYBERNETIC.INTELLIGENCE.HUB::
        </h1>

        {/* Section 1: NVD Table (Existing) */}
        <section id="nvd-section" className="cyber-card mb-12">
          <div className="flex items-center mb-6">
            <ShieldAlert className="icon-cyan w-8 h-8 mr-3" />
            <h2 className="text-2xl font-semibold text-cyan-300">NVD Vulnerability Feed_</h2>
          </div>

          {/* [حذف شده] فید زنده NVD از اینجا حذف شد */}
          
          {/* جدول فیلتردار NVD همچنان باقی است */}
          <NVDTable />
        </section>

        {/* Section 2: AI Models */}
        <section id="ai-models-section" className="cyber-card mb-12">
          <div className="flex items-center mb-6">
            <BrainCircuit className="icon-green w-8 h-8 mr-3" />
            <h2 className="text-2xl font-semibold text-green-300">INTELLIGENT.ANALYSIS.UNIT_</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <AIModelCard 
              title="MODEL::EXBERT_"
              description="Base BERT model for security context evaluation."
              placeholder="INITIATE_EXBERT_QUERY..."
              modelId="exbert"
            />
            <AIModelCard 
              title="MODEL::EXBERT.XAI_"
              description="Explainable AI (XAI) for transparent threat assessment."
              placeholder="INITIATE_XAI_QUERY..."
              modelId="xai"
            />
            <AIModelCard 
              title="MODEL::GENERAL.PURPOSE_"
              description="Versatile language processing for auxiliary tasks."
              placeholder="INITIATE_GENERAL_QUERY..."
              modelId="other"
            />
          </div>
        </section>

        {/* Section 3: Exploit DB */}
        <section id="exploit-db-section" className="cyber-card">
          <div className="flex items-center mb-6">
            <Swords className="icon-red w-8 h-8 mr-3" />
            <h2 className="text-2xl font-semibold text-red-300">EXPLOIT.DB.LATEST_</h2>
          </div>
          <ExploitDBTable />
       </section>

      </div>
    </>
  );
}

export default App;
