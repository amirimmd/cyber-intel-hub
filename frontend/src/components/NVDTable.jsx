// frontend/src/components/NVDTable.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, Search, Filter, DatabaseZap } from 'lucide-react';

// Helper for severity badges
const SeverityBadge = ({ severity }) => {
  let badgeClass = 'badge-unknown';
  switch (String(severity).toUpperCase()) {
    case 'CRITICAL': badgeClass = 'badge-critical'; break;
    case 'HIGH': badgeClass = 'badge-high'; break;
    case 'MEDIUM': badgeClass = 'badge-medium'; break;
    case 'LOW': badgeClass = 'badge-low'; break;
  }
  return <span className={`severity-badge ${badgeClass}`}>{severity || 'UNKNOWN'}</span>;
};

const NVDTable = () => {
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ keyword: '', severity: 'all', date: '' });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    let query = supabase
      .from('vulnerabilities')
      .select('*')
      .order('published_date', { ascending: false })
      .limit(100); // Limit to 100 results for performance

    // Apply filters
    if (filters.keyword) {
      // [اصلاح شده] استفاده از نام ستون‌های صحیح ID و text
      query = query.or(`ID.ilike.%${filters.keyword}%,text.ilike.%${filters.keyword}%`);
    }
    if (filters.severity !== 'all') {
      // [اصلاح شده] استفاده از نام ستون صحیح baseSeverity
      query = query.eq('baseSeverity', filters.severity.toUpperCase());
    }
    if (filters.date) {
      query = query.gte('published_date', new Date(filters.date).toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching NVD data:', error);
      setError(error.message);
    } else {
      setVulnerabilities(data);
    }
    setLoading(false);
  }, [filters]); // Re-run when filters change

  // Initial data fetch on component mount
  useEffect(() => {
    fetchData();
  }, []); // Only on mount

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  return (
    <div>
      {/* Filter Form */}
      <form onSubmit={handleFilterSubmit} className="mb-6 space-y-4 md:space-y-0 md:flex md:items-end md:space-x-4 md:gap-4">
        <div className="flex-grow">
          <label htmlFor="nvd-keyword" className="block text-sm font-medium text-gray-400 mb-1">Keyword / CVE ID:</label>
          <input type="text" name="keyword" id="nvd-keyword" value={filters.keyword} onChange={handleFilterChange} placeholder="e.g., SQLI, RCE, Apache..." className="cyber-input" />
        </div>
        <div>
          <label htmlFor="nvd-severity" className="block text-sm font-medium text-gray-400 mb-1">Severity:</label>
          <select name="severity" id="nvd-severity" value={filters.severity} onChange={handleFilterChange} className="cyber-select w-full md:w-48">
            <option value="all">::ALL::</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
        </div>
        <div>
          <label htmlFor="nvd-date" className="block text-sm font-medium text-gray-400 mb-1">Published After:</label>
          <input type="date" name="date" id="nvd-date" value={filters.date} onChange={handleFilterChange} className="cyber-input w-full md:w-48" />
        </div>
        <div>
          <button type="submit" className="cyber-button" disabled={loading}>
            <Filter className="w-5 h-5 mr-2" />
            FILTER_
          </button>
        </div>
      </form>

      {/* Results Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="min-w-full divide-y divide-gray-800">
          <thead className="bg-gray-800/50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyber-cyan uppercase tracking-wider">CVE ID</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyber-cyan uppercase tracking-wider">Description</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyber-cyan uppercase tracking-wider">Severity</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyber-cyan uppercase tracking-wider">Score</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyber-cyan uppercase tracking-wider">Published</th>
              {/* [حذف شده] ستون CWE چون در اسکیما نبود
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyber-cyan uppercase tracking-wider">CWE</th>
              */}
            </tr>
          </thead>
          <tbody className="bg-cyber-card divide-y divide-gray-800">
            {loading && (
              <tr>
                {/* [اصلاح شده] colSpan به 5 */}
                <td colSpan="5" className="px-6 py-10 text-center">
                  <div className="flex justify-center items-center text-cyber-cyan">
                    <Loader2 className="animate-spin h-6 w-6 mr-3" />
                    <span>LOADING NVD_DATA_STREAM...</span>
                  </div>
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                {/* [اصلاح شده] colSpan به 5 */}
                <td colSpan="5" className="px-6 py-10 text-center">
                  <div className="text-cyber-red">
                    <DatabaseZap className="w-10 h-10 mx-auto mb-2" />
                    <span>ERROR: {error}</span>
                  </div>
                </td>
              </tr>
            )}
            {!loading && !error && vulnerabilities.length === 0 && (
              <tr>
                {/* [اصلاح شده] colSpan به 5 */}
                <td colSpan="5" className="px-6 py-10 text-center">
                  <div className="text-gray-500">
                    <DatabaseZap className="w-10 h-10 mx-auto mb-2" />
                    <span>NO MATCHING VULNERABILITIES FOUND_</span>
                  </div>
                </td>
              </tr>
            )}
            {!loading && !error && vulnerabilities.map((cve) => (
              // [اصلاح شده] استفاده از نام ستون‌های صحیح
              <tr key={cve.ID} className="hover:bg-gray-800/50 transition-colors duration-150">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-cyber-cyan"><a href={`https://nvd.nist.gov/vuln/detail/${cve.ID}`} target="_blank" rel="noopener noreferrer" className="hover:underline">{cve.ID}</a></td>
                <td className="px-6 py-4 text-sm text-cyber-text max-w-md truncate" title={cve.text}>{cve.text}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm"><SeverityBadge severity={cve.baseSeverity} /></td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-white">{cve.score}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(cve.published_date).toLocaleDateString()}</td>
                {/* [حذف شده] ستون CWE
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cve.cwe}</td>
                */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NVDTable;

