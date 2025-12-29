import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { StatCard } from '@/components/dashboard/StatCard';
import { QuickActionCard } from '@/components/dashboard/QuickActionCard';
import { RecentOrdersTable } from '@/components/dashboard/RecentOrdersTable';
import { LowStockAlert } from '@/components/dashboard/LowStockAlert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Order, Product, VERTICAL_CONFIG } from '@/types';
import {
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  AlertTriangle,
  Plus,
  Receipt,
  Warehouse,
  UserPlus,
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { currentOrganization, currentLocation } = useAuth();
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState({
    totalSales: 0,
    ordersToday: 0,
    productsCount: 0,
    customersCount: 0,
  });
  const [loading, setLoading] = useState(true);

  const vertical = currentLocation?.vertical || currentOrganization?.primary_vertical || 'retail';
  const verticalConfig = VERTICAL_CONFIG[vertical];

  useEffect(() => {
    if (!currentOrganization) return;

    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Fetch recent orders
        const { data: orders } = await supabase
          .from('orders')
          .select('*')
          .eq('organization_id', currentOrganization.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (orders) {
          setRecentOrders(orders as Order[]);
          
          // Calculate today's stats
          const today = new Date().toISOString().split('T')[0];
          const todayOrders = orders.filter(o => 
            o.created_at.startsWith(today)
          );
          
          setStats(prev => ({
            ...prev,
            ordersToday: todayOrders.length,
            totalSales: todayOrders.reduce((sum, o) => sum + Number(o.total_amount), 0),
          }));
        }

        // Fetch low stock products
        const { data: products } = await supabase
          .from('products')
          .select('*')
          .eq('organization_id', currentOrganization.id)
          .eq('is_active', true);

        if (products) {
          const lowStock = products.filter(p => 
            p.stock_quantity <= p.low_stock_threshold
          );
          setLowStockProducts(lowStock as Product[]);
          setStats(prev => ({ ...prev, productsCount: products.length }));
        }

        // Fetch customers count
        const { count } = await supabase
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', currentOrganization.id);

        if (count !== null) {
          setStats(prev => ({ ...prev, customersCount: count }));
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentOrganization]);

  const quickActions = [
    { title: 'New Sale', icon: Plus, color: 'primary' as const, onClick: () => navigate('/pos') },
    { title: 'Add Product', icon: Package, color: 'success' as const, onClick: () => navigate('/products/new') },
    { title: 'View Orders', icon: Receipt, color: 'restaurant' as const, onClick: () => navigate('/orders') },
    { title: 'Inventory', icon: Warehouse, color: 'retail' as const, onClick: () => navigate('/inventory') },
    { title: 'Add Customer', icon: UserPlus, color: 'hotel' as const, onClick: () => navigate('/customers/new') },
    { title: 'Reports', icon: TrendingUp, color: 'pharmacy' as const, onClick: () => navigate('/reports') },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening at {currentLocation?.name || currentOrganization?.name}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Sales"
          value={`$${stats.totalSales.toFixed(2)}`}
          change="+12% from yesterday"
          changeType="positive"
          icon={DollarSign}
          onClick={() => navigate('/reports')}
        />
        <StatCard
          title="Orders Today"
          value={stats.ordersToday}
          change="+5 from yesterday"
          changeType="positive"
          icon={ShoppingCart}
          onClick={() => navigate('/orders')}
        />
        <StatCard
          title="Products"
          value={stats.productsCount}
          icon={Package}
          onClick={() => navigate('/products')}
        />
        <StatCard
          title="Customers"
          value={stats.customersCount}
          change="+3 this week"
          changeType="positive"
          icon={Users}
          onClick={() => navigate('/customers')}
        />
      </div>

      {/* Quick Actions */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {quickActions.map((action) => (
              <QuickActionCard
                key={action.title}
                title={action.title}
                icon={action.icon}
                color={action.color}
                onClick={action.onClick}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Orders & Alerts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <Card className="lg:col-span-2 border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">Recent Orders</CardTitle>
            <button 
              onClick={() => navigate('/orders')}
              className="text-sm text-primary hover:underline"
            >
              View all
            </button>
          </CardHeader>
          <CardContent>
            <RecentOrdersTable 
              orders={recentOrders} 
              onOrderClick={(order) => navigate(`/orders/${order.id}`)}
            />
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <CardTitle className="text-lg">Low Stock</CardTitle>
            </div>
            {lowStockProducts.length > 0 && (
              <span className="text-sm font-medium text-warning">
                {lowStockProducts.length} items
              </span>
            )}
          </CardHeader>
          <CardContent>
            <LowStockAlert 
              products={lowStockProducts}
              onProductClick={(product) => navigate(`/products/${product.id}`)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
