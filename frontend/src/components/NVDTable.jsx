import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { AlertTriangle, ExternalLink, Calendar, Bug, Search, ChevronLeft, ChevronRight, Filter, AlertOctagon } from 'lucide-react';

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
      // دریافت تعداد کل برای صفحه‌بندی
      const { count } = await supabase
        .from('nvd_cves')
        .select('*', { count: 'exact', head: true });
      setTotal(count || 0);

      // دریافت داده‌ها
      const { data, error } = await supabase
        .from('nvd_cves')
        .select('*')
        .order('published_date', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;
      setCves(data || []);
    } catch (error) {
      console.error('Error fetching CVEs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (score) => {
    if (!score) return 'badge-unknown';
    if (score >= 9.0) return 'badge-critical';
    if (score >= 7.0) return 'badge-high';
    if (score >= 4.0) return 'badge-medium';
    return 'badge-low';
  };

  const filteredCVEs = cves.filter(cve => 
    cve.cve_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cve.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* نوار جستجو و فیلتر */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#161b22]/50 p-4 rounded-xl border border-white/5">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Search CVE ID or Description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="cyber-input pl-10"
          />
        </div>
        <div className="flex gap-2">
          <button className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg border border-white/10 transition-colors">
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* جدول داده‌ها */}
      <div className="bg-[#161b22]/80 backdrop-blur-sm border border-gray-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-[#0d1117] text-gray-200 uppercase font-mono text-xs">
              <tr>
                <th className="px-6 py-4 border-b border-gray-800">CVE ID</th>
                <th className="px-6 py-4 border-b border-gray-800">Severity</th>
                <th className="px-6 py-4 border-b border-gray-800">CVSS</th>
                <th className="px-6 py-4 border-b border-gray-800 w-1/3">Description</th>
                <th className="px-6 py-4 border-b border-gray-800">Published</th>
                <th className="px-6 py-4 border-b border-gray-800 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-800 rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-5 bg-gray-800 rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-800 rounded w-8"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-800 rounded w-full"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-800 rounded w-24"></div></td>
                    <td className="px-6 py-4"></td>
                  </tr>
                ))
              ) : filteredCVEs.length > 0 ? (
                filteredCVEs.map((cve) => (
                  <tr key={cve.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 font-mono font-medium text-white group-hover:text-cyber-cyan transition-colors">
                      <div className="flex items-center gap-2">
                        <Bug size={14} className="text-gray-600 group-hover:text-cyber-cyan" />
                        {cve.cve_id}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`severity-badge ${getSeverityColor(cve.cvss_score)}`}>
                        {cve.cvss_score >= 9 ? 'CRITICAL' : cve.cvss_score >= 7 ? 'HIGH' : cve.cvss_score >= 4 ? 'MEDIUM' : 'LOW'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-white">
                      {cve.cvss_score || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <p className="line-clamp-2 text-xs text-gray-400 group-hover:text-gray-300">
                        {cve.description || 'No description available.'}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-500">
                      <div className="flex items-center gap-2">
                        <Calendar size={12} />
                        {new Date(cve.published_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <a 
                        href={`https://nvd.nist.gov/vuln/detail/${cve.cve_id}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-cyber-cyan hover:text-white transition-colors inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider border border-transparent hover:border-cyber-cyan/50 px-2 py-1 rounded"
                      >
                        Details <ExternalLink size={12} />
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <AlertOctagon size={48} className="text-gray-700" />
                      <p>No vulnerabilities found matching your criteria.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* صفحه‌بندی */}
        <div className="bg-[#0d1117] px-6 py-4 border-t border-gray-800 flex items-center justify-between">
          <span className="text-xs text-gray-500 font-mono">
            Showing <span className="text-white">{(page - 1) * limit + 1}</span> to <span className="text-white">{Math.min(page * limit, total)}</span> of <span className="text-white">{total}</span>
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={() => setPage(p => p + 1)}
              disabled={page * limit >= total}
              className="p-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
