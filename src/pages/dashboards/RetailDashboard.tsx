import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { StatCard } from '@/components/dashboard/StatCard';
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
  Barcode,
  Receipt,
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
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];

      // Today's sales
      const { data: todayOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('organization_id', currentOrganization.id)
        .gte('created_at', todayStr + 'T00:00:00')
        .lte('created_at', todayStr + 'T23:59:59');

      const todaySales = todayOrders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
      const transactions = todayOrders?.length || 0;

      // Yesterday's sales
      const { data: yesterdayOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('organization_id', currentOrganization.id)
        .gte('created_at', yesterdayStr + 'T00:00:00')
        .lte('created_at', yesterdayStr + 'T23:59:59');

      const yesterdaySales = yesterdayOrders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;

      // Week sales
      const { data: weekOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('organization_id', currentOrganization.id)
        .gte('created_at', weekAgoStr + 'T00:00:00');

      const weekSales = weekOrders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;

      setSalesStats({
        today: todaySales,
        yesterday: yesterdaySales,
        week: weekSales,
        transactions,
      });
      setAvgTransaction(transactions > 0 ? todaySales / transactions : 0);

      // Top selling products (simplified - by order items)
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, product_name, quantity, total_price, order_id')
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

      // Product count
      const { count: prodCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true);

      setProductCount(prodCount || 0);

      // Low stock
      const { data: products } = await supabase
        .from('products')
        .select('stock_quantity, low_stock_threshold')
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true);

      if (products) {
        const lowStock = products.filter(p => 
          (p.stock_quantity || 0) <= (p.low_stock_threshold || 10)
        ).length;
        setLowStockCount(lowStock);
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

      {/* Sales & Inventory */}
      <div className="grid lg:grid-cols-2 gap-6">
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

            <div className="grid grid-cols-2 gap-3">
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
            </div>

            <div className="text-center pt-2">
              <p className="text-sm text-muted-foreground">
                Weekly Sales: <span className="font-medium text-foreground">${salesStats.week.toFixed(2)}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

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
