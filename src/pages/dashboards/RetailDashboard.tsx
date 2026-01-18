import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { StatCard } from '@/components/dashboard/StatCard';
import { SalesChart } from '@/components/charts/SalesChart';
import { PieBreakdown } from '@/components/charts/PieBreakdown';
import { BarChartCard } from '@/components/charts/BarChartCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Tag,
  Receipt,
  Clock,
} from 'lucide-react';

interface TopProduct {
  id: string;
  name: string;
  sales: number;
  revenue: number;
}

interface SalesStats {
  today: number;
  yesterday: number;
  week: number;
  transactions: number;
}

interface DailySales {
  name: string;
  value: number;
}

interface CategorySales {
  name: string;
  value: number;
  color: string;
}

interface HourlyData {
  name: string;
  value: number;
}

export default function RetailDashboard() {
  const navigate = useNavigate();
  const { currentOrganization, currentLocation } = useAuth();
  const [loading, setLoading] = useState(true);
  const [salesStats, setSalesStats] = useState<SalesStats>({ today: 0, yesterday: 0, week: 0, transactions: 0 });
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [avgTransaction, setAvgTransaction] = useState(0);
  const [weeklySales, setWeeklySales] = useState<DailySales[]>([]);
  const [categorySales, setCategorySales] = useState<CategorySales[]>([]);
  const [hourlyTraffic, setHourlyTraffic] = useState<HourlyData[]>([]);

  useEffect(() => {
    if (!currentOrganization?.id) return;
    fetchDashboardData();
  }, [currentOrganization, currentLocation]);

  const fetchDashboardData = async () => {
    if (!currentOrganization?.id) return;
    setLoading(true);

    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Today's sales with hourly breakdown
      const { data: todayOrders } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .eq('organization_id', currentOrganization.id)
        .gte('created_at', todayStr + 'T00:00:00')
        .lte('created_at', todayStr + 'T23:59:59');

      const todaySales = todayOrders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
      const transactions = todayOrders?.length || 0;

      // Hourly traffic
      const hourlyData: Record<number, number> = {};
      todayOrders?.forEach(order => {
        const hour = new Date(order.created_at).getHours();
        hourlyData[hour] = (hourlyData[hour] || 0) + 1;
      });

      const hourlyChartData: HourlyData[] = [];
      for (let i = 8; i <= 20; i++) {
        hourlyChartData.push({
          name: `${i}:00`,
          value: hourlyData[i] || 0,
        });
      }
      setHourlyTraffic(hourlyChartData);

      // Yesterday's sales
      const { data: yesterdayOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('organization_id', currentOrganization.id)
        .gte('created_at', yesterdayStr + 'T00:00:00')
        .lte('created_at', yesterdayStr + 'T23:59:59');

      const yesterdaySales = yesterdayOrders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;

      // Weekly sales trend
      const weeklyData: DailySales[] = [];
      let weekTotal = 0;
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = date.toLocaleDateString('en', { weekday: 'short' });

        const { data: dayOrders } = await supabase
          .from('orders')
          .select('total_amount')
          .eq('organization_id', currentOrganization.id)
          .gte('created_at', dateStr + 'T00:00:00')
          .lte('created_at', dateStr + 'T23:59:59');

        const dayTotal = dayOrders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
        weekTotal += dayTotal;
        weeklyData.push({ name: dayName, value: dayTotal });
      }
      setWeeklySales(weeklyData);

      setSalesStats({
        today: todaySales,
        yesterday: yesterdaySales,
        week: weekTotal,
        transactions,
      });
      setAvgTransaction(transactions > 0 ? todaySales / transactions : 0);

      // Top selling products with category info
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, product_name, quantity, total_price')
        .order('created_at', { ascending: false })
        .limit(100);

      if (orderItems) {
        const productSales: Record<string, { name: string; sales: number; revenue: number }> = {};
        orderItems.forEach(item => {
          const key = item.product_id || item.product_name;
          if (!productSales[key]) {
            productSales[key] = { name: item.product_name, sales: 0, revenue: 0 };
          }
          productSales[key].sales += item.quantity;
          productSales[key].revenue += Number(item.total_price);
        });

        const sorted = Object.entries(productSales)
          .sort(([, a], [, b]) => b.revenue - a.revenue)
          .slice(0, 5)
          .map(([id, data]) => ({ id, ...data }));

        setTopProducts(sorted);
      }

      // Category sales breakdown
      const { data: products } = await supabase
        .from('products')
        .select('id, category, stock_quantity, low_stock_threshold')
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true);

      if (products && orderItems) {
        const categoryMap: Record<string, number> = {};
        const productToCategory: Record<string, string> = {};
        
        products.forEach(p => {
          productToCategory[p.id] = p.category || 'Uncategorized';
        });

        orderItems.forEach(item => {
          if (item.product_id) {
            const category = productToCategory[item.product_id] || 'Uncategorized';
            categoryMap[category] = (categoryMap[category] || 0) + Number(item.total_price);
          }
        });

        const colors = [
          'hsl(var(--retail))',
          'hsl(var(--success))',
          'hsl(var(--warning))',
          'hsl(var(--info))',
          'hsl(var(--muted-foreground))',
        ];

        const categoryData = Object.entries(categoryMap)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([name, value], index) => ({
            name,
            value: Math.round(value),
            color: colors[index % colors.length],
          }));

        setCategorySales(categoryData);

        // Low stock and product counts
        const lowStock = products.filter(p => 
          (p.stock_quantity || 0) <= (p.low_stock_threshold || 10)
        ).length;
        setLowStockCount(lowStock);
        setProductCount(products.length);
      }

      // Customer count
      const { count: custCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrganization.id);

      setCustomerCount(custCount || 0);
    } catch (error) {
      console.error('Error fetching retail dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const salesChange = salesStats.yesterday > 0 
    ? ((salesStats.today - salesStats.yesterday) / salesStats.yesterday * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-retail" />
            Retail Dashboard
          </h1>
          <p className="text-muted-foreground">
            {currentLocation?.name || currentOrganization?.name} - Sales overview
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/inventory')}>
            <Package className="w-4 h-4 mr-2" />
            Inventory
          </Button>
          <Button onClick={() => navigate('/pos')}>
            <ShoppingCart className="w-4 h-4 mr-2" />
            New Sale
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Sales"
          value={`$${salesStats.today.toFixed(2)}`}
          change={`${Number(salesChange) >= 0 ? '+' : ''}${salesChange}% vs yesterday`}
          changeType={Number(salesChange) >= 0 ? 'positive' : 'negative'}
          icon={DollarSign}
          onClick={() => navigate('/reports')}
        />
        <StatCard
          title="Transactions"
          value={salesStats.transactions}
          change={`Avg $${avgTransaction.toFixed(2)}`}
          icon={Receipt}
          onClick={() => navigate('/orders')}
        />
        <StatCard
          title="Products"
          value={productCount}
          icon={Package}
          onClick={() => navigate('/products')}
        />
        <StatCard
          title="Customers"
          value={customerCount}
          icon={Users}
          onClick={() => navigate('/customers')}
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        <SalesChart
          title="Weekly Sales Trend"
          data={weeklySales}
          color="hsl(var(--retail))"
          icon={TrendingUp}
          showAxis
          valuePrefix="$"
          height={180}
        />
        <BarChartCard
          title="Hourly Traffic"
          data={hourlyTraffic}
          color="hsl(var(--retail))"
          icon={Clock}
          height={180}
        />
      </div>

      {/* Sales & Inventory */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Category Sales Pie */}
        {categorySales.length > 0 && (
          <PieBreakdown
            title="Sales by Category"
            data={categorySales}
            icon={Tag}
          />
        )}

        {/* Top Selling Products */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-retail" />
              Top Selling Products
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/products')}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No sales data yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topProducts.map((product, index) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-retail/20 text-retail flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium line-clamp-1">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.sales} sold</p>
                      </div>
                    </div>
                    <span className="font-mono font-medium">${product.revenue.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Inventory Alerts */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Inventory Status
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/inventory')}>
            Manage
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-muted-foreground">Stock Health</span>
              <span className="text-sm font-medium">
                {productCount > 0 ? Math.round((1 - lowStockCount / productCount) * 100) : 100}%
              </span>
            </div>
            <Progress 
              value={productCount > 0 ? (1 - lowStockCount / productCount) * 100 : 100} 
              className="h-2"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-lg bg-success/10 border border-success/20 text-center">
              <p className="text-2xl font-bold text-success">{productCount - lowStockCount}</p>
              <p className="text-sm text-muted-foreground">In Stock</p>
            </div>
            <div 
              className="p-4 rounded-lg bg-warning/10 border border-warning/20 text-center cursor-pointer hover:bg-warning/20 transition-colors"
              onClick={() => navigate('/inventory')}
            >
              <p className="text-2xl font-bold text-warning">{lowStockCount}</p>
              <p className="text-sm text-muted-foreground">Low Stock</p>
            </div>
            <div className="p-4 rounded-lg bg-retail/10 border border-retail/20 text-center">
              <p className="text-2xl font-bold text-retail">${salesStats.week.toFixed(0)}</p>
              <p className="text-sm text-muted-foreground">Weekly Sales</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/pos')}>
              <ShoppingCart className="w-6 h-6" />
              <span>New Sale</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/products')}>
              <Tag className="w-6 h-6" />
              <span>Products</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/customers')}>
              <Users className="w-6 h-6" />
              <span>Customers</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/reports')}>
              <BarChart3 className="w-6 h-6" />
              <span>Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
