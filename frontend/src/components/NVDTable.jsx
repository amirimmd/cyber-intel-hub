// --- components/NVDTable.jsx ---
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, DatabaseZap, Filter } from 'https://esm.sh/lucide-react@0.395.0'; 
import { CopyButton } from './CopyButton';

// --- NVDTable Component ---
const DEFAULT_ROWS_TO_SHOW = 10;
const INITIAL_DATE_FILTER = ''; 
const EARLIEST_MANUAL_DATA_YEAR = '2016-01-01'; 
const DEFAULT_START_DATE_FILTER = '2024-01-01'; 

const SeverityBadge = ({ severity }) => {
  let badgeClass = 'badge-unknown';
  switch (String(severity).toUpperCase()) {
    case 'CRITICAL': badgeClass = 'badge-critical'; break;
    case 'HIGH': badgeClass = 'badge-high'; break;
    case 'MEDIUM': badgeClass = 'badge-medium'; break;
    case 'LOW': badgeClass = 'badge-low'; break;
    case 'NONE': badgeClass = 'badge-low'; break; 
    default: badgeClass = 'badge-unknown'; break;
  }
  return <span className={`severity-badge ${badgeClass}`}>{severity || 'N/A'}</span>;
};

const extractYearFromCveId = (cveId) => {
    const match = cveId?.match(/CVE-(\d{4})-\d+/);
    return match ? parseInt(match[1], 10) : null;
};

export const NVDTable = () => {
  const [allData, setAllData] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [filters, setFilters] = useState({ 
    keyword: '', 
    severity: 'all', 
    date: INITIAL_DATE_FILTER 
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value === 'all_dates' ? INITIAL_DATE_FILTER : value }));
  };

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
        const { data, error: fetchError } = await supabase
        .from('vulnerabilities') 
        .select('ID, text, baseSeverity, score, published_date, vectorString') 
        .order('ID', { ascending: false }) 
        .limit(5000); 

        if (fetchError) throw fetchError;
        setAllData(data || []);
    } catch (err) {
        console.error('Error fetching NVD data:', err.message);
        setError(`Database Error: ${err.message}. Check Supabase connection and table column names.`);
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]); 

  const filteredVulnerabilities = useMemo(() => {
    if (loading || error) return [];

    let filtered = allData;
    const { keyword, severity, date } = filters;
    
    const isFilteredOrSearched = keyword.toLowerCase().trim() || severity !== 'all' || date; 

    const lowerKeyword = keyword.toLowerCase().trim();
    if (lowerKeyword) {
        filtered = filtered.filter(cve => 
            cve.ID?.toLowerCase().includes(lowerKeyword) || 
            cve.text?.toLowerCase().includes(lowerKeyword)
        );
    }
    
    if (severity !== 'all') {
        filtered = filtered.filter(cve => 
            String(cve.baseSeverity).toUpperCase() === severity.toUpperCase()
        );
    }

    if (date) {
        const minDate = new Date(date).getTime();

        filtered = filtered.filter(cve => {
            let itemDate = null;
            if (cve.published_date) {
                itemDate = new Date(cve.published_date).getTime();
            } else {
                const cveYear = extractYearFromCveId(cve.ID);
                if (cveYear) {
                    itemDate = new Date(`${cveYear}-01-01T00:00:00Z`).getTime();
                } else {
                    return false; 
                }
            }
            return itemDate >= minDate;
        });
    }
    
    if (!isFilteredOrSearched) {
        return filtered.slice(0, DEFAULT_ROWS_TO_SHOW);
    }

    return filtered;
  }, [allData, loading, error, filters]);
  
  const truncateText = (text) => {
    if (!text) return { display: 'N/A', needsCopy: false };
    const limit = (typeof window !== 'undefined' && window.innerWidth < 640) ? 40 : 150; 
    const needsCopy = text.length > limit;

    if (needsCopy) {
        return { 
            display: text.substring(0, limit) + '...', 
            needsCopy: true 
        };
    }
    return { display: text, needsCopy: false };
  }

  return (
    <div>
      {/* Filter Form */}
      <form onSubmit={(e) => e.preventDefault()} className="mb-6 space-y-4 md:space-y-0 md:flex md:items-end md:space-x-4 md:gap-4">
        <div className="flex-grow">
          <label htmlFor="nvd-keyword" className="block text-sm font-medium text-gray-400 mb-1">Keyword / CVE ID:</label>
          <input 
            type="text" 
            name="keyword" 
            id="nvd-keyword" 
            value={filters.keyword} 
            onChange={handleFilterChange} 
            placeholder="e.g., SQLI, RCE, Apache..." 
            className="cyber-input" 
            disabled={loading || !!error}
          />
        </div>
        <div>
          <label htmlFor="nvd-severity" className="block text-sm font-medium text-gray-400 mb-1">Severity:</label>
          <select 
            name="severity" 
            id="nvd-severity" 
            value={filters.severity} 
            onChange={handleFilterChange} 
            className="cyber-select w-full md:w-48"
            disabled={loading || !!error}
          >
            <option value="all">::ALL::</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
            <option value="NONE">NONE</option>
          </select>
        </div>
        {/* Date Filter */}
        <div>
            <label htmlFor="nvd-date" className="block text-sm font-medium text-gray-400 mb-1">Published After (Estimated):</label>
            {filters.date ? (
                <input 
                    type="date" 
                    name="date" 
                    id="nvd-date" 
                    value={filters.date} 
                    onChange={handleFilterChange} 
                    min={EARLIEST_MANUAL_DATA_YEAR}
                    className="cyber-input w-full md:w-48" 
                    disabled={loading || !!error}
                />
            ) : (
                <select
                    name="date"
                    id="nvd-date"
                    value={INITIAL_DATE_FILTER} 
                    onChange={handleFilterChange}
                    className="cyber-select w-full md:w-48"
                    disabled={loading || !!error}
                >
                    <option value={INITIAL_DATE_FILTER}>::ALL VULNERABILITIES::</option>
                    <option value={DEFAULT_START_DATE_FILTER}>SELECT DATE...</option>
                </select>
            )}
            
            {filters.date === INITIAL_DATE_FILTER && (
                 <button
                    type="button"
                    onClick={() => setFilters(prev => ({ ...prev, date: DEFAULT_START_DATE_FILTER }))} 
                    className="mt-1 text-xs text-cyber-cyan hover:underline"
                 >
                    - Select a specific date -
                 </button>
            )}
            {filters.date !== INITIAL_DATE_FILTER && (
                 <button
                    type="button"
                    onClick={() => setFilters(prev => ({ ...prev, date: INITIAL_DATE_FILTER }))}
                    className="mt-1 text-xs text-cyber-cyan hover:underline"
                 >
                    - Show All -
                 </button>
            )}

        </div>
        <div className="md:flex-shrink-0">
          <button type="button" className="cyber-button w-full md:w-auto flex items-center justify-center bg-gray-600 text-dark-bg cursor-default" disabled={true}>
             <Filter className="w-5 h-5 mr-2" />
             FILTER_APPLIED_
          </button>
        </div>
      </form>

      {/* Message if default limit is applied */}
      {filteredVulnerabilities.length === DEFAULT_ROWS_TO_SHOW && allData.length > DEFAULT_ROWS_TO_SHOW && filters.keyword === '' && filters.severity === 'all' && filters.date === INITIAL_DATE_FILTER && (
          <p className="text-sm text-cyber-cyan/80 mb-4 p-2 bg-cyan-900/10 rounded border border-cyan-500/30 text-center">
             DISPLAYING TOP {DEFAULT_ROWS_TO_SHOW} VULNERABILITIES. USE FILTERS TO SEE ALL {allData.length} RECORDS._
          </p>
      )}

      {/* Horizontal scroll hint for mobile */}
      <p className="md:hidden text-xs text-center text-cyber-cyan/70 mb-2">
        &lt;-- To see more columns, drag the table sideways --&gt;
      </p>

      {/* Results Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="min-w-full divide-y divide-gray-800">
          <thead className="bg-gray-800/50">
            <tr>
              <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-cyber-cyan uppercase tracking-wider min-w-[100px]">CVE ID</th>
              <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-cyber-cyan uppercase tracking-wider min-w-[200px]">Description</th>
              <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-cyber-cyan uppercase tracking-wider">Severity</th>
              <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-cyber-cyan uppercase tracking-wider">Score</th>
              <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-cyber-cyan uppercase tracking-wider min-w-[150px]">Vector</th>
              <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-cyber-cyan uppercase tracking-wider min-w-[100px]">Published</th>
            </tr>
          </thead>
          <tbody className="bg-cyber-card divide-y divide-gray-800">
            {loading && (
              <tr>
                <td colSpan="6" className="px-3 sm:px-6 py-10 text-center">
                  <div className="flex justify-center items-center text-cyber-cyan">
                    <Loader2 className="animate-spin h-6 w-6 mr-3" />
                    <span>LOADING NVD_DATA_STREAM...</span>
                  </div>
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan="6" className="px-3 sm:px-6 py-10 text-center">
                  <div className="text-cyber-red">
                    <DatabaseZap className="w-10 h-10 mx-auto mb-2" />
                    <span>ERROR: {error}</span>
                  </div>
                </td>
              </tr>
            )}
            {!loading && !error && filteredVulnerabilities.length === 0 && (
              <tr>
                <td colSpan="6" className="px-3 sm:px-6 py-10 text-center">
                  <div className="text-gray-500">
                    <DatabaseZap className="w-10 h-10 mx-auto mb-2" />
                    <span>NO MATCHING VULNERABILITIES FOUND_</span>
                  </div>
                </td>
              </tr>
            )}
            {!loading && !error && filteredVulnerabilities.map((cve) => {
              const { display: truncatedText, needsCopy } = truncateText(cve.text);
              return (
                <tr key={cve.ID} className="hover:bg-gray-800/50 transition-colors duration-150">
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-cyber-cyan">
                    <div className="flex items-center space-x-1">
                        <a href={`https://nvd.nist.gov/vuln/detail/${cve.ID}`} target="_blank" rel="noopener noreferrer" className="hover:underline">{cve.ID}</a>
                        <CopyButton textToCopy={cve.ID} isId={true} />
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 text-sm text-cyber-text max-w-xs min-w-40" title={cve.text}>
                      <div className="flex items-start justify-between flex-nowrap">
                          <p className="flex-grow">{truncatedText}</p>
                          {needsCopy && <CopyButton textToCopy={cve.text} />}
                      </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm"><SeverityBadge severity={cve.baseSeverity} /></td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-bold text-white">{cve.score ? cve.score.toFixed(1) : 'N/A'}</td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500" title={cve.vectorString}>{cve.vectorString ? cve.vectorString.substring(0, 30) + (cve.vectorString.length > 30 ? '...' : '') : 'N/A'}</td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {/* Date format changed to en-US */}
                    {cve.published_date ? new Date(cve.published_date).toLocaleDateString('en-US') : `(Est) ${extractYearFromCveId(cve.ID) || 'N/A'}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
