import React from 'react';
import { User } from 'https://esm.sh/lucide-react@0.395.0'; 

export const LoginTab = () => (
    // [FIX] اضافه کردن padding به این کامپوننت (که قبلاً در App.jsx بود)
    // h-full و overflow-y-auto برای اسکرول صحیح این تب اضافه شد
    <div className="p-4 md:p-8 h-full overflow-y-auto">
      <section id="user-section" className="cyber-card mb-12">
          <div className="flex items-center mb-6">
              <User className="icon-cyan w-8 h-8 mr-3 flex-shrink-0" />
              <h2 className="text-2xl font-semibold text-cyan-300 break-words min-w-0">USER.AUTHENTICATION_</h2>
          </div>
          <div className="text-center py-10">
              <p className="text-cyber-text/80">User login and profile management interface.</p>
              <p className="text-gray-500 text-sm mt-2">(Feature under development)</p>
              <button className="cyber-button mt-6 w-full max-w-xs mx-auto">
                  LOGIN_WITH_PROVIDER_
              </button>
          </div>
      </section>
    </div>
);
