import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  Users,
  ShoppingCart,
  TrendingUp,
  Activity,
  Building2,
  Calendar,
} from "lucide-react";

interface AnalyticsData {
  dau: number;
  wau: number;
  mau: number;
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
}

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30d");
  const [verticalFilter, setVerticalFilter] = useState("all");
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    dau: 0,
    wau: 0,
    mau: 0,
    totalOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
  });

  // Mock data for charts
  const userActivityData = [
    { date: "Mon", active: 1200 },
    { date: "Tue", active: 1400 },
    { date: "Wed", active: 1100 },
    { date: "Thu", active: 1600 },
    { date: "Fri", active: 1800 },
    { date: "Sat", active: 2200 },
    { date: "Sun", active: 1900 },
  ];

  const ordersByVertical = [
    { name: "Restaurant", value: 4500, color: "hsl(14, 100%, 57%)" },
    { name: "Hotel", value: 2300, color: "hsl(262, 83%, 58%)" },
    { name: "Pharmacy", value: 1800, color: "hsl(142, 71%, 45%)" },
    { name: "Retail", value: 3200, color: "hsl(199, 89%, 48%)" },
  ];

  const growthData = Array.from({ length: 12 }, (_, i) => ({
    month: new Date(2024, i, 1).toLocaleString("default", { month: "short" }),
    organizations: Math.floor(50 + i * 15 + Math.random() * 20),
    users: Math.floor(200 + i * 50 + Math.random() * 50),
  }));

  const featureUsage = [
    { feature: "POS", usage: 95 },
    { feature: "Inventory", usage: 78 },
    { feature: "Reservations", usage: 65 },
    { feature: "Reports", usage: 58 },
    { feature: "Kitchen Display", usage: 45 },
    { feature: "Pharmacy Rx", usage: 32 },
  ];

  const peakHours = Array.from({ length: 24 }, (_, hour) => ({
    hour: `${hour}:00`,
    activity:
      hour >= 9 && hour <= 21
        ? Math.floor(50 + Math.sin((hour - 9) * 0.5) * 50 + Math.random() * 20)
        : Math.floor(10 + Math.random() * 10),
  }));

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange, verticalFilter]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch total orders
      let ordersQuery = supabase.from("orders").select("total_amount, vertical");

      if (verticalFilter !== "all" && ["restaurant", "hotel", "pharmacy", "retail"].includes(verticalFilter)) {
        ordersQuery = ordersQuery.eq("vertical", verticalFilter as "restaurant" | "hotel" | "pharmacy" | "retail");
      }

      const { data: orders } = await ordersQuery;

      const totalOrders = orders?.length || 0;
      const totalRevenue =
        orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

      // Fetch user counts (mock DAU/WAU/MAU for now)
      const { count: userCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      setAnalytics({
        dau: Math.floor((userCount || 0) * 0.3),
        wau: Math.floor((userCount || 0) * 0.6),
        mau: userCount || 0,
        totalOrders,
        totalRevenue,
        avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Platform Analytics
            </h1>
            <p className="text-muted-foreground">
              Insights into platform usage and performance
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="12m">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
            <Select value={verticalFilter} onValueChange={setVerticalFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Verticals</SelectItem>
                <SelectItem value="restaurant">Restaurant</SelectItem>
                <SelectItem value="hotel">Hotel</SelectItem>
                <SelectItem value="pharmacy">Pharmacy</SelectItem>
                <SelectItem value="retail">Retail</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminStatCard
            title="Daily Active Users"
            value={analytics.dau.toLocaleString()}
            subtitle="DAU"
            trend={{ value: 8, label: "vs yesterday" }}
            icon={<Users className="h-6 w-6" />}
            variant="primary"
          />
          <AdminStatCard
            title="Weekly Active Users"
            value={analytics.wau.toLocaleString()}
            subtitle="WAU"
            trend={{ value: 12, label: "vs last week" }}
            icon={<Activity className="h-6 w-6" />}
            variant="default"
          />
          <AdminStatCard
            title="Total Orders"
            value={analytics.totalOrders.toLocaleString()}
            trend={{ value: 15, label: "vs last period" }}
            icon={<ShoppingCart className="h-6 w-6" />}
            variant="success"
          />
          <AdminStatCard
            title="Avg Order Value"
            value={`$${analytics.avgOrderValue.toFixed(2)}`}
            trend={{ value: 5, label: "vs last period" }}
            icon={<TrendingUp className="h-6 w-6" />}
            variant="default"
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">User Activity (Weekly)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={userActivityData}>
                    <defs>
                      <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="hsl(173, 80%, 40%)"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="hsl(173, 80%, 40%)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(217, 33%, 17%)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(215, 20%, 65%)"
                      fontSize={12}
                    />
                    <YAxis stroke="hsl(215, 20%, 65%)" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(222, 47%, 9%)",
                        border: "1px solid hsl(217, 33%, 17%)",
                        borderRadius: "8px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="active"
                      stroke="hsl(173, 80%, 40%)"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorActive)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Orders by Vertical */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Orders by Vertical</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ordersByVertical}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {ordersByVertical.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(222, 47%, 9%)",
                        border: "1px solid hsl(217, 33%, 17%)",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Growth Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Platform Growth
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growthData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(217, 33%, 17%)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      stroke="hsl(215, 20%, 65%)"
                      fontSize={12}
                    />
                    <YAxis stroke="hsl(215, 20%, 65%)" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(222, 47%, 9%)",
                        border: "1px solid hsl(217, 33%, 17%)",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="organizations"
                      stroke="hsl(173, 80%, 40%)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="users"
                      stroke="hsl(262, 83%, 58%)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-primary" />
                  <span className="text-sm text-muted-foreground">
                    Organizations
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-accent" />
                  <span className="text-sm text-muted-foreground">Users</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feature Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Feature Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={featureUsage} layout="vertical">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(217, 33%, 17%)"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      stroke="hsl(215, 20%, 65%)"
                      fontSize={12}
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <YAxis
                      type="category"
                      dataKey="feature"
                      stroke="hsl(215, 20%, 65%)"
                      fontSize={12}
                      width={100}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(222, 47%, 9%)",
                        border: "1px solid hsl(217, 33%, 17%)",
                        borderRadius: "8px",
                      }}
                      formatter={(value) => [`${value}%`, "Usage"]}
                    />
                    <Bar
                      dataKey="usage"
                      fill="hsl(173, 80%, 40%)"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Peak Hours Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Peak Activity Hours (Today)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peakHours}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(217, 33%, 17%)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="hour"
                    stroke="hsl(215, 20%, 65%)"
                    fontSize={10}
                    interval={2}
                  />
                  <YAxis stroke="hsl(215, 20%, 65%)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(222, 47%, 9%)",
                      border: "1px solid hsl(217, 33%, 17%)",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar
                    dataKey="activity"
                    fill="hsl(173, 80%, 40%)"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
