// frontend/src/components/NVDTable.jsx
import React, { useState, useEffect, useCallback } from 'react';
// [اصلاح شده] پسوند .js از مسیر حذف شد
import { supabase } from '../supabaseClient';
import { Loader2, Search, Filter, DatabaseZap } from 'lucide-react';

// [حذف شده] فیلتر تاریخ 2024 حذف شد

// Helper for severity badges
const SeverityBadge = ({ severity }) => {
// ... existing code ...
  return <span className={`severity-badge ${badgeClass}`}>{severity || 'N/A'}</span>;
};

const NVDTable = () => {
// ... existing code ...
  
  // [اصلاح شده] مقدار پیش‌فرض فیلتر تاریخ به حالت خالی بازگشت
  const [filters, setFilters] = useState({ 
    keyword: '', 
    severity: 'all', 
    date: '' // بازگشت به حالت پیش‌فرض
  });

  const handleFilterChange = (e) => {
// ... existing code ...
  };

  const fetchData = useCallback(async () => {
// ... existing code ...
    
    let query = supabase
      .from('vulnerabilities')
      .select('ID, text, baseSeverity, score, published_date, vectorString') 
      .order('published_date', { ascending: false })
      .limit(100);

    // [اصلاح شده] فیلتر تاریخ پایه 2024 حذف شد
    // فقط فیلتر تاریخ انتخابی کاربر اعمال می‌شود
    if (filters.date) {
      const userDate = new Date(filters.date).toISOString();
      query = query.gte('published_date', userDate);
    }

    // Apply other filters
    if (filters.keyword) {
// ... existing code ...
    }
    if (filters.severity !== 'all') {
// ... existing code ...
    }

    const { data, error } = await query;

    if (error) {
// ... existing code ...
    } else {
      setVulnerabilities(data);
    }
    setLoading(false);
  }, [filters]); 

  // Initial data fetch on component mount
  useEffect(() => {
    fetchData();
  }, [fetchData]); 

  const handleFilterSubmit = (e) => {
// ... existing code ...
  };

  return (
    <div>
      {/* Filter Form */}
      <form onSubmit={handleFilterSubmit} className="mb-6 space-y-4 md:space-y-0 md:flex md:items-end md:space-x-4 md:gap-4">
// ... existing code ...
        <div>
          <label htmlFor="nvd-date" className="block text-sm font-medium text-gray-400 mb-1">Published After:</label>
          <input 
            type="date" 
            name="date" 
            id="nvd-date" 
            value={filters.date} 
            onChange={handleFilterChange} 
            // [حذف شده] فیلتر min date حذف شد
            className="cyber-input w-full md:w-48" 
          />
        </div>
        <div>
// ... existing code ...
          </button>
        </div>
      </form>

      {/* Results Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-800">
// ... existing code ...
              <tbody className="bg-cyber-card divide-y divide-gray-800">
                {loading && (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-center">
                      <div className="flex justify-center items-center text-cyber-cyan">
                        <Loader2 className="animate-spin h-6 w-6 mr-3" />
                        {/* [اصلاح شده] متن لودینگ عمومی‌تر شد */}
                        <span>LOADING NVD_DATA_STREAM...</span>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && error && (
// ... existing code ...
                )}
                {!loading && !error && vulnerabilities.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-center">
                      <div className="text-gray-500">
                        <DatabaseZap className="w-10 h-10 mx-auto mb-2" />
                        {/* [اصلاح شده] متن عمومی‌تر شد */}
                        <span>NO MATCHING VULNERABILITIES FOUND_</span>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && !error && vulnerabilities.map((cve) => (
// ... existing code ...
                ))}
              </tbody>
            </table>
          </div>
        </div>
  );
};

export default NVDTable;
