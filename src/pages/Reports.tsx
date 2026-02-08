import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Download, TrendingUp, DollarSign, ShoppingCart, Users, Lock, Crown, Printer, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Link } from 'react-router-dom';
import { LockedFeatureOverlay } from '@/components/subscription/UpgradePrompt';
import { exportToCSV, printContent, generateHTMLTable, type ExportColumn } from '@/lib/export';

interface SalesData {
  date: string;
  total: number;
  orders: number;
}

interface CategoryData {
  name: string;
  value: number;
}

export default function Reports() {
  const { currentOrganization } = useAuth();
  const { canAccess, isExpired } = useSubscription();
  const hasAdvancedReports = !isExpired && canAccess('advanced_reports');
  const hasDataExport = !isExpired && canAccess('data_export');
  const [loading, setLoading] = useState(true);
  
  // Date range state - default to last 30 days
  const defaultStartDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
  const defaultEndDate = format(new Date(), 'yyyy-MM-dd');
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    totalCustomers: 0,
  });

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--info))'];

  useEffect(() => {
    if (!currentOrganization) return;
    fetchReportData();
  }, [currentOrganization]);

  const fetchReportData = async () => {
    if (!currentOrganization) return;
    setLoading(true);

    try {
      const startDateISO = startOfDay(new Date(startDate)).toISOString();
      const endDateISO = endOfDay(new Date(endDate)).toISOString();
      
      // Calculate days difference for chart initialization
      const days = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));

      // Fetch orders in date range
      const { data: orders } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('organization_id', currentOrganization.id)
        .gte('created_at', startDateISO)
        .lte('created_at', endDateISO)
        .order('created_at', { ascending: true });

      if (orders) {
        // Calculate daily sales
        const dailySales: Record<string, { total: number; orders: number }> = {};
        
        // Initialize all dates in range
        const currentDate = new Date(startDate);
        const endDateObj = new Date(endDate);
        while (currentDate <= endDateObj) {
          const dateKey = format(currentDate, 'MMM dd');
          dailySales[dateKey] = { total: 0, orders: 0 };
          currentDate.setDate(currentDate.getDate() + 1);
        }

        orders.forEach(order => {
          const date = format(new Date(order.created_at), 'MMM dd');
          if (dailySales[date]) {
            dailySales[date].total += Number(order.total_amount);
            dailySales[date].orders += 1;
          }
        });

        setSalesData(Object.entries(dailySales).map(([date, data]) => ({
          date,
          total: data.total,
          orders: data.orders,
        })));

        // Calculate stats
        const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
        const totalOrders = orders.length;
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        setStats(prev => ({
          ...prev,
          totalRevenue,
          totalOrders,
          avgOrderValue,
        }));

        // Calculate category breakdown from order items
        const categories: Record<string, number> = {};
        orders.forEach(order => {
          const items = order.order_items as any[];
          items?.forEach(item => {
            const cat = item.product_category || item.category || 'Uncategorized';
            categories[cat] = (categories[cat] || 0) + Number(item.total_price || 0);
          });
        });

        setCategoryData(Object.entries(categories).map(([name, value]) => ({ name, value })));
      }

      // Fetch customers count
      const { count } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrganization.id);

      setStats(prev => ({ ...prev, totalCustomers: count || 0 }));
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const columns: ExportColumn<SalesData>[] = [
      { header: 'Date', accessor: (row) => row.date },
      { header: 'Total Sales', accessor: (row) => row.total.toFixed(2) },
      { header: 'Orders', accessor: (row) => row.orders },
    ];
    
    const filename = `sales-report-${startDate}-to-${endDate}`;
    exportToCSV(filename, columns, salesData);
  };

  const handlePrint = () => {
    const columns: ExportColumn<SalesData>[] = [
      { header: 'Date', accessor: (row) => row.date },
      { header: 'Total Sales', accessor: (row) => `$${row.total.toFixed(2)}` },
      { header: 'Orders', accessor: (row) => row.orders },
    ];
    
    const tableHTML = generateHTMLTable(columns, salesData);
    const title = `Sales Report - ${format(new Date(startDate), 'MMM dd, yyyy')} to ${format(new Date(endDate), 'MMM dd, yyyy')}`;
    printContent(title, tableHTML);
  };

  const handleFilter = () => {
    fetchReportData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Reports</h1>
            <p className="text-muted-foreground">Sales analytics and insights</p>
          </div>
        </div>

        {/* Date Range Filter */}
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    max={endDate}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    max={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleFilter} variant="default">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
                {hasDataExport ? (
                  <>
                    <Button variant="outline" onClick={handleExportCSV}>
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button variant="outline" onClick={handlePrint}>
                      <Printer className="w-4 h-4 mr-2" />
                      Print
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" asChild>
                      <Link to="/subscription">
                        <Lock className="w-4 h-4 mr-2" />
                        Export CSV
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link to="/subscription">
                        <Lock className="w-4 h-4 mr-2" />
                        Print
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-foreground">${stats.totalRevenue.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalOrders}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Order Value</p>
                <p className="text-2xl font-bold text-foreground">${stats.avgOrderValue.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Customers</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalCustomers}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg">Sales Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Orders Chart */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg">Orders Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="orders" 
                    stroke="hsl(var(--accent))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--accent))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Reports Section - Locked for Starter */}
      {!hasAdvancedReports && (
        <Card className="border-border/50 bg-card/50 relative overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              Advanced Analytics
              <Badge variant="outline" className="text-xs">
                <Crown className="w-3 h-3 mr-1" />
                Professional
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 opacity-50 blur-[2px] pointer-events-none">
              <div className="p-4 rounded-lg bg-muted/30 h-40" />
              <div className="p-4 rounded-lg bg-muted/30 h-40" />
              <div className="p-4 rounded-lg bg-muted/30 h-40" />
            </div>
          </CardContent>
          <LockedFeatureOverlay feature="advanced_reports" requiredTier="Professional" />
        </Card>
      )}
    </div>
  );
}
