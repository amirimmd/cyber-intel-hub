import { useState, useEffect } from "react";
// --- رفع خطا: استفاده از @ alias برای مسیرهای src ---
import { supabase } from "@/supabaseClient";
import { NVDTable } from "@/components/NVDTable";
import { ExploitDBTable } from "@/components/ExploitDBTable";
import { NVDLiveFeed } from "@/components/NVDLiveFeed";
import { AIModelCard } from "@/components/AIModelCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bug, ShieldCheck, Activity, Brain } from "lucide-react";

function App() {
  const [stats, setStats] = useState({
    totalVulnerabilities: 0,
    totalExploits: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // این تابع برای آمار هدر باقی می‌ماند
  useEffect(() => {
    async function fetchStats() {
      setLoadingStats(true);
      try {
        const { count: vulnCo } = await supabase
          .from("vulnerabilities")
          .select("*", { count: "exact", head: true });

        const { count: exploitCo } = await supabase
          .from("exploits")
          .select("*", { count: "exact", head: true });

        setStats({
          totalVulnerabilities: vulnCo || 0,
          totalExploits: exploitCo || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoadingStats(false);
      }
    }
    fetchStats();
  }, []);

  // تمام منطق‌های جدول NVD و ExploitDB از اینجا حذف شده‌اند
  // و به کامپوننت‌های فرزند خود منتقل شده‌اند.

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* هدر و عنوان */}
        <header className="mb-6">
          <h1 className="text-4xl font-bold text-gray-800">Cyber Intel Hub</h1>
          <p className="text-lg text-gray-600">
            Real-time Vulnerability & Exploit Intelligence Dashboard
          </p>
        </header>

        {/* کارت‌های آمار */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Vulnerabilities (NVD)
              </CardTitle>
              <Bug className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loadingStats ? "..." : stats.totalVulnerabilities.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Confirmed Exploits (EDB)
              </CardTitle>
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loadingStats ? "..." : stats.totalExploits.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          
          {/* این کارت‌ها از کامپوننت‌های جداگانه می‌آیند */}
          <NVDLiveFeed />
          <AIModelCard />

        </div>

        {/* بخش اصلی محتوا با تب‌ها */}
        <Tabs defaultValue="nvd" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="nvd">NVD Vulnerabilities</TabsTrigger>
            <TabsTrigger value="exploitdb">ExploitDB Ground Truth</TabsTrigger>
          </TabsList>
          
          {/* تب NVD */}
          <TabsContent value="nvd">
            <Card>
              <CardHeader>
                <CardTitle>NVD Vulnerability Database</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Search, filter, and browse all vulnerabilities from the NVD.
                </p>
              </CardHeader>
              <CardContent>
                {/* پاکسازی:
                  تمام منطق جدول، فیلترها، و صفحه‌بندی
                  اکنون در داخل کامپوننت NVDTable قرار دارد.
                */}
                <NVDTable />
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* تب ExploitDB */}
          <TabsContent value="exploitdb">
            <Card>
              <CardHeader>
                <CardTitle>ExploitDB Ground Truth</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Vulnerabilities confirmed to have a public exploit.
                </p>
              </CardHeader>
              <CardContent>
                {/* پاکسازی:
                  تمام منطق جدول و صفحه‌بندی
                  اکنون در داخل کامپوننت ExploitDBTable قرار دارد.
                */}
                <ExploitDBTable />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
