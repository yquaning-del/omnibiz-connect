import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, TrendingUp, DollarSign, ShoppingCart, Users, Lock, Crown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Link } from 'react-router-dom';
import { LockedFeatureOverlay } from '@/components/subscription/UpgradePrompt';

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
  const [dateRange, setDateRange] = useState('7');
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
  }, [currentOrganization, dateRange]);

  const fetchReportData = async () => {
    if (!currentOrganization) return;
    setLoading(true);

    try {
      const days = parseInt(dateRange);
      const startDate = startOfDay(subDays(new Date(), days)).toISOString();
      const endDate = endOfDay(new Date()).toISOString();

      // Fetch orders in date range
      const { data: orders } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('organization_id', currentOrganization.id)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: true });

      if (orders) {
        // Calculate daily sales
        const dailySales: Record<string, { total: number; orders: number }> = {};
        
        for (let i = days; i >= 0; i--) {
          const date = format(subDays(new Date(), i), 'MMM dd');
          dailySales[date] = { total: 0, orders: 0 };
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
            const cat = 'Sales'; // Simplified - would need product category
            categories[cat] = (categories[cat] || 0) + Number(item.total_price);
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

  const exportToCSV = () => {
    const headers = ['Date', 'Total Sales', 'Orders'];
    const rows = salesData.map(d => [d.date, d.total.toFixed(2), d.orders]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Reports</h1>
          <p className="text-muted-foreground">Sales analytics and insights</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30" disabled={!hasAdvancedReports}>Last 30 days {!hasAdvancedReports && '🔒'}</SelectItem>
              <SelectItem value="90" disabled={!hasAdvancedReports}>Last 90 days {!hasAdvancedReports && '🔒'}</SelectItem>
            </SelectContent>
          </Select>
          
          {hasDataExport ? (
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          ) : (
            <Button variant="outline" asChild>
              <Link to="/subscription">
                <Lock className="w-4 h-4 mr-2" />
                Export
              </Link>
            </Button>
          )}
        </div>
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
