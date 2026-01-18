import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  UtensilsCrossed, 
  ChefHat, 
  Users, 
  DollarSign,
  Clock,
  Calendar,
  TrendingUp,
  AlertCircle,
  Plus,
  Eye
} from 'lucide-react';

interface TableStatus {
  available: number;
  occupied: number;
  reserved: number;
  total: number;
}

interface KitchenOrder {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  items_count: number;
}

export default function RestaurantDashboard() {
  const navigate = useNavigate();
  const { currentOrganization, currentLocation } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tableStatus, setTableStatus] = useState<TableStatus>({ available: 0, occupied: 0, reserved: 0, total: 0 });
  const [kitchenOrders, setKitchenOrders] = useState<KitchenOrder[]>([]);
  const [todayReservations, setTodayReservations] = useState(0);
  const [todaySales, setTodaySales] = useState(0);
  const [todayCovers, setTodayCovers] = useState(0);
  const [avgTicket, setAvgTicket] = useState(0);

  useEffect(() => {
    if (!currentLocation?.id) return;
    fetchDashboardData();
  }, [currentLocation]);

  const fetchDashboardData = async () => {
    if (!currentLocation?.id || !currentOrganization?.id) return;
    setLoading(true);

    try {
      // Fetch table statuses
      const { data: tables } = await supabase
        .from('restaurant_tables')
        .select('status')
        .eq('location_id', currentLocation.id);

      if (tables) {
        const statusCounts = tables.reduce((acc, t) => {
          acc[t.status] = (acc[t.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        setTableStatus({
          available: statusCounts['available'] || 0,
          occupied: statusCounts['occupied'] || 0,
          reserved: statusCounts['reserved'] || 0,
          total: tables.length,
        });
      }

      // Fetch kitchen orders (pending/in_progress)
      const { data: orders } = await supabase
        .from('orders')
        .select('id, order_number, status, created_at')
        .eq('location_id', currentLocation.id)
        .eq('vertical', 'restaurant')
        .in('status', ['pending', 'preparing', 'ready'])
        .order('created_at', { ascending: true })
        .limit(10);

      if (orders) {
        setKitchenOrders(orders.map(o => ({ ...o, items_count: 0 })));
      }

      // Today's reservations
      const today = new Date().toISOString().split('T')[0];
      const { count: resCount } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('location_id', currentLocation.id)
        .eq('reservation_type', 'table')
        .gte('check_in', today + 'T00:00:00')
        .lte('check_in', today + 'T23:59:59');

      setTodayReservations(resCount || 0);

      // Today's sales and covers
      const { data: todayOrders } = await supabase
        .from('orders')
        .select('total_amount, metadata')
        .eq('organization_id', currentOrganization.id)
        .eq('vertical', 'restaurant')
        .gte('created_at', today + 'T00:00:00')
        .lte('created_at', today + 'T23:59:59');

      if (todayOrders) {
        const sales = todayOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
        setTodaySales(sales);
        setTodayCovers(todayOrders.length);
        setAvgTicket(todayOrders.length > 0 ? sales / todayOrders.length : 0);
      }
    } catch (error) {
      console.error('Error fetching restaurant dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOrderStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-warning/20 text-warning border-warning/30',
      preparing: 'bg-info/20 text-info border-info/30',
      ready: 'bg-success/20 text-success border-success/30',
    };
    return <Badge variant="outline" className={styles[status] || ''}>{status}</Badge>;
  };

  const getTimeSince = (dateStr: string) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6 text-restaurant" />
            Restaurant Dashboard
          </h1>
          <p className="text-muted-foreground">
            {currentLocation?.name} - Today's overview
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/tables')}>
            <Eye className="w-4 h-4 mr-2" />
            Floor Plan
          </Button>
          <Button onClick={() => navigate('/pos')}>
            <Plus className="w-4 h-4 mr-2" />
            New Order
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Sales"
          value={`$${todaySales.toFixed(2)}`}
          icon={DollarSign}
          onClick={() => navigate('/reports')}
        />
        <StatCard
          title="Covers Today"
          value={todayCovers}
          change={`Avg $${avgTicket.toFixed(2)}/ticket`}
          icon={Users}
        />
        <StatCard
          title="Tables Available"
          value={`${tableStatus.available}/${tableStatus.total}`}
          icon={UtensilsCrossed}
          onClick={() => navigate('/tables')}
        />
        <StatCard
          title="Reservations"
          value={todayReservations}
          change="Today"
          icon={Calendar}
          onClick={() => navigate('/reservations')}
        />
      </div>

      {/* Table Status & Kitchen Orders */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Table Status Card */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-restaurant" />
              Floor Status
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/tables')}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-success/10 border border-success/20">
                <p className="text-3xl font-bold text-success">{tableStatus.available}</p>
                <p className="text-sm text-muted-foreground">Available</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-warning/10 border border-warning/20">
                <p className="text-3xl font-bold text-warning">{tableStatus.occupied}</p>
                <p className="text-sm text-muted-foreground">Occupied</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-info/10 border border-info/20">
                <p className="text-3xl font-bold text-info">{tableStatus.reserved}</p>
                <p className="text-sm text-muted-foreground">Reserved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Kitchen Orders */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-warning" />
              Kitchen Queue
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/kitchen')}>
              Kitchen Display
            </Button>
          </CardHeader>
          <CardContent>
            {kitchenOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ChefHat className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No orders in queue</p>
              </div>
            ) : (
              <div className="space-y-3">
                {kitchenOrders.slice(0, 5).map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold">{order.order_number}</span>
                      {getOrderStatusBadge(order.status)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {getTimeSince(order.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
              <Plus className="w-6 h-6" />
              <span>New Order</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/reservations')}>
              <Calendar className="w-6 h-6" />
              <span>Reservations</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/kitchen')}>
              <ChefHat className="w-6 h-6" />
              <span>Kitchen</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/reports')}>
              <TrendingUp className="w-6 h-6" />
              <span>Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
