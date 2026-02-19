import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Search, Filter, Bug, Calendar, ExternalLink, 
  AlertTriangle, ChevronLeft, ChevronRight, ShieldAlert,
  ListFilter, RefreshCw, Copy, Check, Terminal
} from 'lucide-react';

export const NVDTable = ({ limit = 50 }) => {
  const [cves, setCves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all'); // all, critical, high, medium, low
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Fetch data on dependency change
  useEffect(() => {
    fetchCVEs();
  }, [page, limit, severityFilter]);

  const fetchCVEs = async (isSearch = false) => {
    setLoading(true);
    setErrorMsg(null);
    if (isSearch) setPage(1);

    try {
      // 1. Build Query (Using 'estimated' count to prevent timeouts on large datasets)
      let query = supabase
        .from('vulnerabilities')
        .select('*', { count: 'estimated' });
      
      // 2. Search Filter (Using 'ilike' for case-insensitive search)
      if (searchTerm.trim()) {
        const term = searchTerm.trim();
        query = query.or(`ID.ilike.%${term}%,text.ilike.%${term}%`);
      }

      // 3. Severity Filter
      if (severityFilter !== 'all') {
         if (severityFilter === 'critical') query = query.gte('score', 9.0);
         else if (severityFilter === 'high') query = query.gte('score', 7.0).lt('score', 9.0);
         else if (severityFilter === 'medium') query = query.gte('score', 4.0).lt('score', 7.0);
         else if (severityFilter === 'low') query = query.lt('score', 4.0);
      }

      // 4. Pagination & Ordering
      const currentPage = isSearch ? 1 : page;
      const { data, count, error } = await query
        .order('published_date', { ascending: false })
        .range((currentPage - 1) * limit, currentPage * limit - 1);

      if (error) throw error;
      setTotal(count || 0);
      setCves(data || []);
      
    } catch (error) {
      console.error('Error fetching CVEs:', error);
      setErrorMsg(error.message || 'Connection failed');
      setCves([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      fetchCVEs(true);
    }
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getSeverityBadge = (score) => {
    if (score === null || score === undefined) return <span className="severity-badge badge-unknown">UNKNOWN</span>;
    if (score >= 9.0) return <span className="severity-badge badge-critical animate-pulse">CRITICAL</span>;
    if (score >= 7.0) return <span className="severity-badge badge-high">HIGH</span>;
    if (score >= 4.0) return <span className="severity-badge badge-medium">MEDIUM</span>;
    return <span className="severity-badge badge-low">LOW</span>;
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in-up pb-4 md:pb-0">
      
      {/* 1. Toolbar */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-center bg-[#0a0a0a]/80 backdrop-blur-md p-4 rounded-xl border border-[#1f1f1f] shadow-lg">
        
        {/* Search Input */}
        <div className="relative w-full xl:w-96 group order-2 xl:order-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors group-focus-within:text-cyan-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Search CVE ID or Description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-[#111] border border-[#333] text-gray-200 text-sm rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono placeholder:text-gray-600"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
             <kbd className="hidden sm:inline-block px-1.5 py-0.5 bg-[#222] border border-[#444] rounded text-[10px] text-gray-500 font-mono">Enter</kbd>
          </div>
        </div>
        
        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto order-1 xl:order-2">
           
           {/* Severity Filter */}
           <div className="relative group min-w-[140px] flex-1 sm:flex-none">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 z-10"><ListFilter size={14} /></div>
            <select
              value={severityFilter}
              onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
              className="w-full appearance-none bg-[#111] border border-[#333] text-gray-300 text-xs font-medium rounded-lg pl-9 pr-8 py-2.5 hover:border-cyan-500/30 focus:outline-none focus:border-cyan-500/50 transition-all cursor-pointer"
            >
              <option value="all">All Severity</option>
              <option value="critical">Critical (9+)</option>
              <option value="high">High (7-9)</option>
              <option value="medium">Medium (4-7)</option>
              <option value="low">Low (0-4)</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
              <ChevronLeft size={12} className="-rotate-90" />
            </div>
          </div>

          <button 
            onClick={() => fetchCVEs(true)} 
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-[#111] hover:bg-[#161616] text-gray-300 text-xs font-medium rounded-lg border border-[#333] hover:border-cyan-500/30 transition-all active:scale-95 whitespace-nowrap"
          >
            <Filter size={14} className="text-cyan-500" /> <span>Search</span>
          </button>
          
           <button 
            onClick={() => fetchCVEs(false)}
            className="p-2.5 bg-[#111] hover:bg-[#161616] text-gray-400 hover:text-white rounded-lg border border-[#333] hover:border-green-500/30 transition-all active:scale-95 group"
            title="Refresh Data"
          >
            <RefreshCw size={16} className={`group-hover:text-green-500 transition-transform duration-700 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Table Container */}
      <div className="cyber-panel flex-1 overflow-hidden flex flex-col relative border-cyan-500/10 bg-[#0a0a0a]">
        
        {/* Error State */}
        {errorMsg && (
          <div className="bg-red-900/10 text-red-400 p-3 text-xs text-center border-b border-red-500/20 flex items-center justify-center gap-2 animate-pulse">
            <AlertTriangle size={14} />
            System Error: {errorMsg}
          </div>
        )}

        {/* Scrollable Table */}
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-[#333] scrollbar-track-transparent h-full">
          <table className="w-full text-left text-sm min-w-[800px]">
            <thead className="bg-[#111] text-gray-500 font-mono text-[10px] uppercase tracking-wider sticky top-0 z-10 shadow-lg shadow-black/50">
               <tr>
                <th className="px-4 md:px-6 py-4 border-b border-[#222] font-semibold w-40">CVE ID</th>
                <th className="px-4 md:px-6 py-4 border-b border-[#222] font-semibold w-24">Severity</th>
                <th className="px-4 md:px-6 py-4 border-b border-[#222] font-semibold w-20">Score</th>
                <th className="px-4 md:px-6 py-4 border-b border-[#222] font-semibold">Description</th>
                <th className="px-4 md:px-6 py-4 border-b border-[#222] font-semibold w-32">Date</th>
                <th className="px-4 md:px-6 py-4 border-b border-[#222] text-right w-24">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f1f]">
               {loading ? (
                 // Loading Skeleton
                 [...Array(8)].map((_, i) => (
                   <tr key={i} className="animate-pulse">
                     <td className="px-6 py-4"><div className="h-4 bg-[#1f1f1f] rounded w-24"></div></td>
                     <td className="px-6 py-4"><div className="h-5 bg-[#1f1f1f] rounded w-16"></div></td>
                     <td className="px-6 py-4"><div className="h-4 bg-[#1f1f1f] rounded w-8"></div></td>
                     <td className="px-6 py-4"><div className="h-4 bg-[#1f1f1f] rounded w-3/4 mb-1"></div><div className="h-3 bg-[#1f1f1f] rounded w-1/2"></div></td>
                     <td className="px-6 py-4"><div className="h-4 bg-[#1f1f1f] rounded w-20"></div></td>
                     <td className="px-6 py-4"><div className="h-4 bg-[#1f1f1f] rounded w-8 ml-auto"></div></td>
                   </tr>
                 ))
               ) : cves.length > 0 ? (
                 cves.map((cve, index) => {
                   const uniqueKey = `${cve.ID}-${index}`;
                   return (
                     <tr key={uniqueKey} className="group hover:bg-[#141414] transition-colors border-l-2 border-transparent hover:border-l-cyan-500">
                        
                        {/* CVE ID */}
                        <td className="px-4 md:px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-medium text-cyan-400 text-xs md:text-sm">{cve.ID}</span>
                            <button 
                              onClick={() => handleCopy(cve.ID, uniqueKey + 'id')}
                              className="opacity-100 md:opacity-0 group-hover:opacity-100 text-gray-600 hover:text-white transition-all p-1.5 rounded hover:bg-[#333]"
                              title="Copy ID"
                            >
                              {copiedId === uniqueKey + 'id' ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                            </button>
                          </div>
                        </td>

                        {/* Severity */}
                        <td className="px-4 md:px-6 py-4">{getSeverityBadge(cve.score)}</td>

                        {/* Score */}
                        <td className="px-4 md:px-6 py-4 font-bold text-white font-mono">{cve.score ? cve.score.toFixed(1) : 'N/A'}</td>

                        {/* Description */}
                        <td className="px-4 md:px-6 py-4 relative">
                          <div className="group/desc flex items-start gap-2">
                             <Terminal size={14} className="text-gray-700 mt-1 shrink-0 hidden sm:block" />
                             <p className="text-gray-300 text-xs leading-relaxed line-clamp-2 max-w-xl pr-8 font-sans">
                               {cve.text || 'No description available'}
                             </p>
                             <button 
                               onClick={() => handleCopy(cve.text, uniqueKey + 'desc')}
                               className="absolute right-0 top-1/2 -translate-y-1/2 opacity-100 md:opacity-0 group-hover/desc:opacity-100 text-gray-600 hover:text-white transition-all p-1.5 rounded-md hover:bg-[#333]"
                               title="Copy Description"
                             >
                               {copiedId === uniqueKey + 'desc' ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                             </button>
                          </div>
                        </td>

                        {/* Date */}
                        <td className="px-4 md:px-6 py-4 text-[10px] text-gray-500 font-mono">
                          {cve.published_date ? new Date(cve.published_date).toLocaleDateString() : 'N/A'}
                        </td>

                        {/* Link */}
                        <td className="px-4 md:px-6 py-4 text-right">
                          <a href={`https://nvd.nist.gov/vuln/detail/${cve.ID}`} target="_blank" rel="noreferrer" className="inline-flex p-1.5 rounded hover:bg-[#333] text-gray-500 hover:text-cyan-400 transition-colors">
                            <ExternalLink size={16} />
                          </a>
                        </td>
                     </tr>
                   );
                 })
               ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-4 opacity-40">
                        <Bug size={64} className="text-gray-700" />
                        <p className="text-gray-400 font-mono text-sm">No CVEs match your filters.</p>
                      </div>
                    </td>
                  </tr>
               )}
            </tbody>
          </table>
        </div>

        {/* 3. Pagination Footer (Mobile Fixed) */}
        <div className="mt-auto bg-[#0a0a0a] px-4 py-3 border-t border-[#1f1f1f] flex items-center justify-between shrink-0 sticky bottom-0 z-20">
          <span className="text-[10px] text-gray-600 font-mono">
            Page <span className="text-white font-bold">{page}</span>
          </span>
          
          <div className="flex gap-4">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center justify-center w-10 h-10 rounded-lg border border-[#333] bg-[#111] text-gray-400 hover:text-white hover:border-cyan-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 touch-manipulation"
            >
              <ChevronLeft size={20} />
            </button>
            
            <button 
              onClick={() => setPage(p => p + 1)}
              disabled={cves.length < limit}
              className="flex items-center justify-center w-10 h-10 rounded-lg border border-[#333] bg-[#111] text-gray-400 hover:text-white hover:border-cyan-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 touch-manipulation"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
