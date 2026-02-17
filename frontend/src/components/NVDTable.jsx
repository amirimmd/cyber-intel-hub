import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Search, Filter, Bug, Calendar, ExternalLink, AlertOctagon } from 'lucide-react';

export const NVDTable = ({ limit = 50 }) => {
  const [cves, setCves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCVEs();
  }, [limit]);

  const fetchCVEs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('nvd_cves')
        .select('*')
        .order('published_date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setCves(data || []);
    } catch (error) {
      // Fallback for demo
      setCves([
        { cve_id: 'CVE-2024-3094', cvss_score: 10.0, description: 'Malicious code in xz-utils leading to RCE.', published_date: '2024-03-29' },
        { cve_id: 'CVE-2023-4863', cvss_score: 8.8, description: 'Heap buffer overflow in libwebp in Google Chrome.', published_date: '2023-09-12' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (score) => {
    if (score >= 9.0) return 'badge-critical';
    if (score >= 7.0) return 'badge-high';
    if (score >= 4.0) return 'badge-medium';
    return 'badge-low';
  };

  const filtered = cves.filter(cve => cve.cve_id.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search CVE ID..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="cyber-input pl-10"
          />
        </div>
        <button className="cyber-btn flex items-center gap-2">
          <Filter size={14} /> Filter
        </button>
      </div>

      <div className="cyber-panel flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto scrollbar-thin scrollbar-thumb-[#333]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#111] text-gray-400 font-mono text-xs uppercase sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 border-b border-[#333]">ID</th>
                <th className="px-6 py-4 border-b border-[#333]">Score</th>
                <th className="px-6 py-4 border-b border-[#333]">Description</th>
                <th className="px-6 py-4 border-b border-[#333]">Date</th>
                <th className="px-6 py-4 border-b border-[#333] text-right">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f1f]">
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center text-gray-500 animate-pulse">Scanning Database...</td></tr>
              ) : (
                filtered.map((cve, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 font-mono text-cyan-400 group-hover:text-cyan-300">{cve.cve_id}</td>
                    <td className="px-6 py-4">
                      <span className={`severity-badge ${getSeverityColor(cve.cvss_score)}`}>{cve.cvss_score}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs max-w-md truncate">{cve.description}</td>
                    <td className="px-6 py-4 text-gray-500 text-xs font-mono">{cve.published_date}</td>
                    <td className="px-6 py-4 text-right">
                      <ExternalLink size={14} className="ml-auto text-gray-600 hover:text-white cursor-pointer" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
