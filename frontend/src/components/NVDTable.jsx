import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Search, Filter, Bug, Calendar, ExternalLink, 
  AlertTriangle, ChevronLeft, ChevronRight, ShieldAlert 
} from 'lucide-react';

export const NVDTable = ({ limit = 50 }) => {
  const [cves, setCves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchCVEs();
  }, [page, limit]);

  const fetchCVEs = async () => {
    setLoading(true);
    try {
      // Get total count for pagination
      const { count } = await supabase
        .from('nvd_cves')
        .select('*', { count: 'exact', head: true });
      setTotal(count || 0);

      // Fetch data
      const { data, error } = await supabase
        .from('nvd_cves')
        .select('*')
        .order('published_date', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;
      setCves(data || []);
    } catch (error) {
      console.error('Error fetching CVEs:', error);
      // Fallback data for demo purposes if Supabase fails
      setCves([
        { cve_id: 'CVE-2024-3094', cvss_score: 10.0, description: 'Malicious code in xz-utils (liblzma) leading to RCE.', published_date: '2024-03-29' },
        { cve_id: 'CVE-2023-4863', cvss_score: 8.8, description: 'Heap buffer overflow in libwebp in Google Chrome.', published_date: '2023-09-12' },
        { cve_id: 'CVE-2023-24488', cvss_score: 6.1, description: 'Citrix ADC Cross-Site Scripting (Reflected).', published_date: '2023-07-10' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (score) => {
    if (!score) return <span className="severity-badge badge-unknown">UNKNOWN</span>;
    if (score >= 9.0) return <span className="severity-badge badge-critical animate-pulse">CRITICAL</span>;
    if (score >= 7.0) return <span className="severity-badge badge-high">HIGH</span>;
    if (score >= 4.0) return <span className="severity-badge badge-medium">MEDIUM</span>;
    return <span className="severity-badge badge-low">LOW</span>;
  };

  const filteredCVEs = cves.filter(cve => 
    cve.cve_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cve.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full space-y-4">
      
      {/* 1. Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#0f0f0f] p-4 rounded-xl border border-[#222]">
        <div className="relative w-full sm:w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 group-focus-within:text-cyan-400 transition-colors" />
          <input
            type="text"
            placeholder="Search CVE ID or Keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="cyber-input pl-10 bg-[#1a1a1a] border-gray-700 text-white focus:border-cyan-500/50"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button className="cyber-btn flex items-center gap-2 justify-center w-full sm:w-auto text-xs py-2 px-3 !bg-[#1a1a1a] !border-gray-700 hover:!border-cyan-500/50 hover:!text-cyan-400">
            <Filter size={14} /> 
            <span>Advanced Filter</span>
          </button>
          <div className="hidden sm:block w-px h-6 bg-gray-700 mx-1"></div>
          <div className="text-[10px] text-gray-500 font-mono hidden sm:block">
            {total.toLocaleString()} Records
          </div>
        </div>
      </div>

      {/* 2. Table Container */}
      <div className="cyber-panel flex-1 overflow-hidden flex flex-col relative border-cyan-500/10">
        
        {/* Table Header (Sticky) */}
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-[#333]">
          <table className="w-full text-left text-sm min-w-[800px]">
            <thead className="bg-[#111] text-gray-400 font-mono text-[10px] uppercase tracking-wider sticky top-0 z-10 shadow-sm shadow-black">
              <tr>
                <th className="px-6 py-4 border-b border-[#222] font-semibold w-40">CVE ID</th>
                <th className="px-6 py-4 border-b border-[#222] font-semibold w-24">Severity</th>
                <th className="px-6 py-4 border-b border-[#222] font-semibold w-20">Score</th>
                <th className="px-6 py-4 border-b border-[#222] font-semibold">Description</th>
                <th className="px-6 py-4 border-b border-[#222] font-semibold w-32">Published</th>
                <th className="px-6 py-4 border-b border-[#222] text-right w-24">Action</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-[#1f1f1f] bg-[#0a0a0a]">
              {loading ? (
                // Skeleton Loader
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-[#222] rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-5 bg-[#222] rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-[#222] rounded w-8"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-[#222] rounded w-3/4 mb-1"></div><div className="h-3 bg-[#222] rounded w-1/2"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-[#222] rounded w-20"></div></td>
                    <td className="px-6 py-4"></td>
                  </tr>
                ))
              ) : filteredCVEs.length > 0 ? (
                filteredCVEs.map((cve) => (
                  <tr key={cve.cve_id} className="group hover:bg-[#161b22] transition-colors border-l-2 border-l-transparent hover:border-l-cyan-500">
                    
                    {/* ID */}
                    <td className="px-6 py-4 font-mono font-medium text-cyan-400 group-hover:text-cyan-300 transition-colors">
                      <div className="flex items-center gap-2">
                        <Bug size={14} className="text-gray-600 group-hover:text-cyan-500" />
                        {cve.cve_id}
                      </div>
                    </td>

                    {/* Severity Badge */}
                    <td className="px-6 py-4">
                      {getSeverityBadge(cve.cvss_score)}
                    </td>

                    {/* CVSS Score */}
                    <td className="px-6 py-4 font-mono font-bold text-white text-xs">
                      {cve.cvss_score || 'N/A'}
                    </td>

                    {/* Description */}
                    <td className="px-6 py-4">
                      <p className="line-clamp-2 text-xs text-gray-400 group-hover:text-gray-300 leading-relaxed max-w-xl">
                        {cve.description || 'No description provided.'}
                      </p>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 text-[10px] font-mono text-gray-500">
                      <div className="flex items-center gap-2">
                        <Calendar size={12} />
                        {new Date(cve.published_date).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Action */}
                    <td className="px-6 py-4 text-right">
                      <a 
                        href={`https://nvd.nist.gov/vuln/detail/${cve.cve_id}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="opacity-60 group-hover:opacity-100 text-cyan-400 hover:text-white transition-all inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider border border-transparent hover:border-cyan-500/30 hover:bg-cyan-500/10 px-2 py-1 rounded"
                      >
                        View <ExternalLink size={10} />
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 opacity-50">
                      <ShieldAlert size={48} className="text-gray-600" />
                      <p className="text-gray-400 font-mono text-sm">No vulnerabilities found matching your search.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 3. Pagination Footer */}
        <div className="mt-auto bg-[#0f0f0f] px-6 py-3 border-t border-[#222] flex items-center justify-between shrink-0">
          <span className="text-[10px] text-gray-500 font-mono hidden sm:block">
            Showing <span className="text-gray-300 font-bold">{(page - 1) * limit + 1}</span> to <span className="text-gray-300 font-bold">{Math.min(page * limit, total)}</span> of {total}
          </span>
          
          <div className="flex gap-2 w-full sm:w-auto justify-center">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-gray-700 bg-[#1a1a1a] text-gray-400 hover:text-white hover:border-cyan-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-4 py-1.5 text-xs font-mono text-gray-400 bg-[#1a1a1a] border border-gray-700 rounded-lg flex items-center">
              Page {page}
            </span>
            <button 
              onClick={() => setPage(p => p + 1)}
              disabled={page * limit >= total}
              className="p-1.5 rounded-lg border border-gray-700 bg-[#1a1a1a] text-gray-400 hover:text-white hover:border-cyan-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
