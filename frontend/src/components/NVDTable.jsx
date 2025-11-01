import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';
import { Link } from 'react-router-dom';

const NVDTable = () => {
  const [cveData, setCveData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [cvesPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'publishedDate', direction: 'descending' });

  useEffect(() => {
    fetchCveData();
  }, []);

  const fetchCveData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('nvd_cve')
        .select('*');

      if (error) {
        throw error;
      }

      // Pre-sort the data by publishedDate descending initially
      const sortedData = [...data].sort((a, b) => {
        if (a.publishedDate < b.publishedDate) return 1;
        if (a.publishedDate > b.publishedDate) return -1;
        return 0;
      });

      setCveData(sortedData);
    } catch (error) {
      console.error('Error fetching NVD data:', error.message);
      setError('Error fetching NVD data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const requestSort = (key) => {
    let direction = 'ascending';
    if (
      sortConfig.key === key &&
      sortConfig.direction === 'ascending'
    ) {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedCveData = React.useMemo(() => {
    let sortableItems = [...cveData];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [cveData, sortConfig]);

  const filteredCves = sortedCveData.filter(cve =>
    cve.cveId.toLowerCase().includes(search.toLowerCase()) ||
    cve.description.toLowerCase().includes(search.toLowerCase())
  );

  // Pagination logic
  const indexOfLastCve = currentPage * cvesPerPage;
  const indexOfFirstCve = indexOfLastCve - cvesPerPage;
  const currentCves = filteredCves.slice(indexOfFirstCve, indexOfLastCve);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const totalPages = Math.ceil(filteredCves.length / cvesPerPage);

  const renderSortIndicator = (key) => {
    if (sortConfig.key !== key) {
      return null;
    }
    if (sortConfig.direction === 'ascending') {
      return ' 🔼';
    }
    return ' 🔽';
  };

  const getSeverityColor = (score) => {
    if (score >= 9.0) return 'bg-red-600';
    if (score >= 7.0) return 'bg-red-500';
    if (score >= 4.0) return 'bg-yellow-500';
    if (score > 0.0) return 'bg-blue-500';
    return 'bg-gray-500';
  };

  if (loading) return <div className="text-center p-8 text-gray-500">در حال بارگذاری داده‌های NVD...</div>;
  if (error) return <div className="text-center p-8 text-red-500">خطا: {error}</div>;

  return (
    <div className="bg-white shadow-xl rounded-xl p-6 lg:p-8">
      <h2 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-3">جدول آسیب‌پذیری‌های ملی (NVD)</h2>

      <div className="mb-6 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
        <input
          type="text"
          placeholder="جستجو بر اساس CVE ID یا توضیحات..."
          className="p-3 border border-gray-300 rounded-lg w-full md:w-1/3 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out shadow-sm"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1); // Reset to first page on search
          }}
        />
        <div className="text-sm text-gray-600">
          تعداد کل آسیب‌پذیری‌ها: <span className="font-semibold text-gray-800">{filteredCves.length}</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition duration-150"
                onClick={() => requestSort('cveId')}
              >
                شناسه CVE {renderSortIndicator('cveId')}
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition duration-150"
                onClick={() => requestSort('cvssV3Score')}
              >
                امتیاز CVSS v3 {renderSortIndicator('cvssV3Score')}
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                خلاصه توضیحات
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition duration-150"
                onClick={() => requestSort('publishedDate')}
              >
                تاریخ انتشار {renderSortIndicator('publishedDate')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentCves.map((cve) => (
              <tr key={cve.cveId} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-800">
                  <Link to={`/nvd/${cve.cveId}`}>{cve.cveId}</Link>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm">
                  <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full text-white ${getSeverityColor(cve.cvssV3Score)}`}>
                    {cve.cvssV3Score || 'N/A'}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-gray-700 max-w-lg truncate">
                  {cve.description.substring(0, 150)}...
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(cve.publishedDate).toLocaleDateString('fa-IR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex justify-between items-center mt-6">
        <button
          onClick={() => paginate(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 disabled:opacity-50 transition duration-150"
        >
          قبلی
        </button>

        <span className="text-sm text-gray-700">
          صفحه <span className="font-semibold">{currentPage}</span> از <span className="font-semibold">{totalPages}</span>
        </span>

        <button
          onClick={() => paginate(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 disabled:opacity-50 transition duration-150"
        >
          بعدی
        </button>
      </div>
    </div>
  );
};

export default NVDTable;
