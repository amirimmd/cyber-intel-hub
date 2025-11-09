import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// --- رفع خطا: استفاده از @ alias برای مسیر src ---
import { supabase } from "@/supabaseClient";
import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

// --- ستون‌های جدول ---
export const columns = [
  {
    accessorKey: "ID",
    header: "CVE ID",
    cell: ({ row }) => (
      <a
        href={`https://nvd.nist.gov/vuln/detail/${row.getValue("ID")}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline"
      >
        {row.getValue("ID")}
      </a>
    ),
  },
  {
    accessorKey: "text",
    header: "Description",
    cell: ({ row }) => {
      const description = row.getValue("text");
      return (
        <div className="max-w-md overflow-hidden text-ellipsis whitespace-nowrap" title={description}>
          {description}
        </div>
      );
    },
  },
  {
    accessorKey: "score",
    header: "Base Score",
    cell: ({ row }) => {
      const score = parseFloat(row.getValue("score"));
      let colorClass = "text-gray-600";
      if (score >= 9.0) colorClass = "text-red-700 font-bold";
      else if (score >= 7.0) colorClass = "text-red-500";
      else if (score >= 4.0) colorClass = "text-yellow-600";
      else if (score > 0.0) colorClass = "text-green-600";

      return (
        <span className={`font-medium ${colorClass}`}>
          {score ? score.toFixed(1) : "N/A"}
        </span>
      );
    },
  },
  {
    accessorKey: "baseSeverity",
    header: "Severity",
    cell: ({ row }) => {
      const severity = row.getValue("baseSeverity")?.toUpperCase();
      let colorClass = "";
      switch (severity) {
        case "CRITICAL":
          colorClass = "bg-red-700 text-white";
          break;
        case "HIGH":
          colorClass = "bg-red-500 text-white";
          break;
        case "MEDIUM":
          colorClass = "bg-yellow-500 text-black";
          break;
        case "LOW":
          colorClass = "bg-green-500 text-white";
          break;
        default:
          colorClass = "bg-gray-400 text-black";
      }
      return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colorClass}`}>
          {severity || "N/A"}
        </span>
      );
    },
  },
  {
    accessorKey: "published_date",
    header: "Published Date",
    cell: ({ row }) => {
      const date = new Date(row.getValue("published_date"));
      return date.toLocaleDateString();
    },
  },
  {
    accessorKey: "vectorString",
    header: "CVSS Version",
    cell: ({ row }) => {
      const vector = row.getValue("vectorString");
      if (!vector) return <span className="text-gray-500">Awaiting</span>;
      if (vector.startsWith("CVSS:3.1")) return <span className="text-blue-600">v3.1</span>;
      if (vector.startsWith("CVSS:3.0")) return <span className="text-blue-500">v3.0</span>;
      if (vector.startsWith("CVSS:2.0")) return <span className="text-blue-400">v2.0</span>;
      return <span className="text-gray-500">Unknown</span>;
    },
  },
];

// --- هوک سفارشی برای Debounce ---
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

// --- کامپوننت اصلی جدول ---
export function NVDTable() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [cvssVersionFilter, setCvssVersionFilter] = useState("all"); // <-- State جدید برای فیلتر
  const [pagination, setPagination] = useState({
    pageIndex: 0, // 0-based
    pageSize: 10,
  });

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // --- تابع واکشی داده ---
  const fetchData = useCallback(
    async (pageIndex, pageSize, searchTerm, versionFilter) => {
      setLoading(true);
      setError(null);

      const from = pageIndex * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("vulnerabilities")
        .select("ID, text, score, baseSeverity, published_date, vectorString", { count: "exact" });

      // 1. فیلتر جستجو
      if (searchTerm) {
        query = query.textSearch("text", searchTerm, {
          type: "websearch",
          config: "english",
        });
      }

      // 2. *** فیلتر جدید CVSS ***
      switch (versionFilter) {
        case "v3.1":
          query = query.like("vectorString", "CVSS:3.1%");
          break;
        case "v3.0":
          query = query.like("vectorString", "CVSS:3.0%");
          break;
        case "v2.0":
          query = query.like("vectorString", "CVSS:2.0%");
          break;
        case "awaiting":
          query = query.is("vectorString", null);
          break;
        // 'all' (default) - هیچ فیلتر اضافی اعمال نمی‌شود
      }

      // 3. مرتب‌سازی و صفحه‌بندی
      query = query
        .order("published_date", { ascending: false })
        .range(from, to);

      try {
        const { data, error, count } = await query;

        if (error) throw error;

        setData(data || []);
        setPageCount(Math.ceil(count / pageSize));
      } catch (err) {
        console.error("Error fetching NVD data:", err);
        setError("Failed to fetch vulnerability data. " + err.message);
        setData([]);
        setPageCount(0);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // --- Effect برای واکشی داده‌ها ---
  useEffect(() => {
    fetchData(
      pagination.pageIndex,
      pagination.pageSize,
      debouncedSearchTerm,
      cvssVersionFilter // <-- اضافه شدن به Effect
    );
  }, [
    fetchData,
    pagination.pageIndex,
    pagination.pageSize,
    debouncedSearchTerm,
    cvssVersionFilter, // <-- اضافه شدن به وابستگی‌ها
  ]);

  // --- تنظیمات جدول ---
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount,
    onPaginationChange: setPagination,
    state: {
      pagination,
    },
  });

  return (
    <div className="w-full">
      {/* --- بخش فیلترها --- */}
      <div className="flex flex-col sm:flex-row items-center justify-between py-4 gap-4">
        <Input
          placeholder="Search descriptions..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="w-full sm:w-1/3"
        />
        {/* --- UI فیلتر CVSS --- */}
        <Select
          value={cvssVersionFilter}
          onValueChange={setCvssVersionFilter}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by CVSS Version" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Versions</SelectItem>
            <SelectItem value="v3.1">CVSS v3.1</SelectItem>
            <SelectItem value="v3.0">CVSS v3.0</SelectItem>
            <SelectItem value="v2.0">CVSS v2.0</SelectItem>
            <SelectItem value="awaiting">Awaiting Analysis</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* --- بخش جدول --- */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex justify-center items-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading data...
                  </div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-red-600">
                  {error}
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* --- بخش صفحه‌بندی --- */}
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="text-sm text-muted-foreground">
          Page {pagination.pageIndex + 1} of {table.getPageCount()}
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="ml-1">Previous</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="mr-1">Next</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
