import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { StatCard } from '@/components/dashboard/StatCard';
import { SalesChart } from '@/components/charts/SalesChart';
import { PieBreakdown } from '@/components/charts/PieBreakdown';
import { BarChartCard } from '@/components/charts/BarChartCard';
import { DashboardSkeleton } from '@/components/ui/dashboard-skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemandForecastPanel } from '@/components/ai/DemandForecastPanel';
import { DynamicPricingPanel } from '@/components/ai/DynamicPricingPanel';
import { MaintenancePredictorPanel } from '@/components/ai/MaintenancePredictorPanel';
import { NightAuditDialog } from '@/components/hotel/NightAuditDialog';
import {
  Building2,
  BedDouble,
  DoorOpen,
  Users,
  DollarSign,
  ClipboardList,
  Wrench,
  Calendar,
  TrendingUp,
  UserCheck,
  LogIn,
  LogOut,
} from 'lucide-react';

interface RoomStats {
  total: number;
  available: number;
  occupied: number;
  maintenance: number;
  dirty: number;
}

interface Arrival {
  id: string;
  guest_name: string;
  room_number: string;
  check_in: string;
  status: string;
}

interface OccupancyData {
  name: string;
  value: number;
}

interface RevenueData {
  name: string;
  value: number;
}

// Helper to group folios by day
const groupFoliosByDay = (folios: { total_amount: number | null; created_at: string }[] | null): RevenueData[] => {
  if (!folios) return [];
  
  const dayMap: Record<string, number> = {};
  folios.forEach(folio => {
    const dateStr = folio.created_at.split('T')[0];
    dayMap[dateStr] = (dayMap[dateStr] || 0) + Number(folio.total_amount ?? 0);
  });

  // Generate last 7 days
  const result: RevenueData[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayName = date.toLocaleDateString('en', { weekday: 'short' });
    result.push({ name: dayName, value: dayMap[dateStr] || 0 });
  }
  return result;
};

export default function HotelDashboard() {
  const navigate = useNavigate();
  const { currentOrganization, currentLocation } = useAuth();
  const [loading, setLoading] = useState(true);
  const [roomStats, setRoomStats] = useState<RoomStats>({ total: 0, available: 0, occupied: 0, maintenance: 0, dirty: 0 });
  const [arrivalsToday, setArrivalsToday] = useState<Arrival[]>([]);
  const [departuresToday, setDeparturesToday] = useState(0);
  const [housekeepingPending, setHousekeepingPending] = useState(0);
  const [maintenancePending, setMaintenancePending] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [occupancyRate, setOccupancyRate] = useState(0);
  const [occupancyTrend, setOccupancyTrend] = useState<OccupancyData[]>([]);
  const [weeklyRevenue, setWeeklyRevenue] = useState<RevenueData[]>([]);

  useEffect(() => {
    if (!currentLocation?.id) return;
    fetchDashboardData();
  }, [currentLocation]);

  const fetchDashboardData = async () => {
    if (!currentLocation?.id || !currentOrganization?.id) return;
    setLoading(true);

    try {
      const today = new Date().toISOString().split('T')[0];
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);

      // Run all independent queries in parallel
      const [
        roomsResult,
        arrivalsResult,
        departuresResult,
        housekeepingResult,
        maintenanceResult,
        todayFoliosResult,
        weekFoliosResult,
        weekReservationsResult,
      ] = await Promise.all([
        // Rooms
        supabase
          .from('hotel_rooms')
          .select('id, status, housekeeping_status, room_number')
          .eq('location_id', currentLocation.id),
        // Today's arrivals with room info (using join)
        supabase
          .from('reservations')
          .select(`
            id, guest_name, check_in, status, room_id,
            hotel_rooms!room_id (room_number)
          `)
          .eq('location_id', currentLocation.id)
          .eq('reservation_type', 'room')
          .gte('check_in', today + 'T00:00:00')
          .lte('check_in', today + 'T23:59:59')
          .in('status', ['confirmed', 'checked-in'])
          .limit(10),
        // Today's departures
        supabase
          .from('reservations')
          .select('*', { count: 'exact', head: true })
          .eq('location_id', currentLocation.id)
          .eq('reservation_type', 'room')
          .gte('check_out', today + 'T00:00:00')
          .lte('check_out', today + 'T23:59:59'),
        // Housekeeping pending
        supabase
          .from('housekeeping_tasks')
          .select('*', { count: 'exact', head: true })
          .eq('location_id', currentLocation.id)
          .in('status', ['pending', 'in_progress']),
        // Maintenance pending
        supabase
          .from('maintenance_requests')
          .select('*', { count: 'exact', head: true })
          .eq('location_id', currentLocation.id)
          .in('status', ['open', 'in_progress']),
        // Today's folios
        supabase
          .from('guest_folios')
          .select('total_amount')
          .eq('location_id', currentLocation.id)
          .gte('created_at', today + 'T00:00:00'),
        // Weekly folios (single query for all 7 days)
        supabase
          .from('guest_folios')
          .select('total_amount, created_at')
          .eq('location_id', currentLocation.id)
          .gte('created_at', weekStart.toISOString())
          .lte('created_at', new Date().toISOString()),
        // Weekly reservations for occupancy trend
        supabase
          .from('reservations')
          .select('check_in, check_out, status')
          .eq('location_id', currentLocation.id)
          .eq('reservation_type', 'room')
          .eq('status', 'checked-in')
          .lte('check_in', new Date().toISOString())
          .gte('check_out', weekStart.toISOString()),
      ]);

      // Process rooms
      const rooms = roomsResult.data || [];
      const stats: RoomStats = {
        total: rooms.length,
        available: rooms.filter(r => r.status === 'available').length,
        occupied: rooms.filter(r => r.status === 'occupied').length,
        maintenance: rooms.filter(r => r.status === 'maintenance').length,
        dirty: rooms.filter(r => r.housekeeping_status === 'dirty').length,
      };
      setRoomStats(stats);
      setOccupancyRate(stats.total > 0 ? (stats.occupied / stats.total) * 100 : 0);

      // Process arrivals (with joined room data)
      if (arrivalsResult.data) {
        const arrivalsWithRooms = arrivalsResult.data.map((a: any) => ({
          id: a.id,
          guest_name: a.guest_name,
          check_in: a.check_in,
          status: a.status,
          room_number: a.hotel_rooms?.room_number || 'TBA',
        }));
        setArrivalsToday(arrivalsWithRooms);
      }

      // Process departures
      setDeparturesToday(departuresResult.count || 0);

      // Process housekeeping and maintenance
      setHousekeepingPending(housekeepingResult.count || 0);
      setMaintenancePending(maintenanceResult.count || 0);

      // Process today's revenue
      if (todayFoliosResult.data) {
        setTodayRevenue(todayFoliosResult.data.reduce((sum, f) => sum + Number(f.total_amount ?? 0), 0));
      }

      // Process weekly revenue
      setWeeklyRevenue(groupFoliosByDay(weekFoliosResult.data));

      // Process occupancy trend
      const totalRooms = rooms.length || 1;
      const occupancyData: OccupancyData[] = [];
      const reservations = weekReservationsResult.data || [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = date.toLocaleDateString('en', { weekday: 'short' });

        // Count reservations that were active on this day
        const activeOnDay = reservations.filter((r: any) => {
          const checkIn = (r.check_in ?? '').split('T')[0];
          const checkOut = (r.check_out ?? '').split('T')[0] || dateStr;
          return checkIn <= dateStr && checkOut >= dateStr;
        }).length;

        const rate = Math.min(100, (activeOnDay / totalRooms) * 100);
        occupancyData.push({ name: dayName, value: Math.round(rate) });
      }
      setOccupancyTrend(occupancyData);
    } catch (error) {
      console.error('Error fetching hotel dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Show skeleton while loading
  if (loading) {
    return <DashboardSkeleton />;
  }

  const roomStatusPieData = [
    { name: 'Available', value: roomStats.available, color: 'hsl(var(--success))' },
    { name: 'Occupied', value: roomStats.occupied, color: 'hsl(var(--info))' },
    { name: 'Maintenance', value: roomStats.maintenance, color: 'hsl(var(--destructive))' },
    { name: 'Dirty', value: roomStats.dirty, color: 'hsl(var(--warning))' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6 text-hotel" />
            Hotel Dashboard
          </h1>
          <p className="text-muted-foreground">
            {currentLocation?.name} - Today's operations
          </p>
        </div>
        <div className="flex gap-2">
          <NightAuditDialog />
          <Button variant="outline" onClick={() => navigate('/rooms')}>
            <BedDouble className="w-4 h-4 mr-2" />
            Room Status
          </Button>
          <Button onClick={() => navigate('/front-desk')}>
            <DoorOpen className="w-4 h-4 mr-2" />
            Front Desk
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Occupancy Rate"
          value={`${occupancyRate.toFixed(1)}%`}
          icon={BedDouble}
          onClick={() => navigate('/rooms')}
        />
        <StatCard
          title="Arrivals Today"
          value={arrivalsToday.length}
          icon={LogIn}
          onClick={() => navigate('/front-desk')}
        />
        <StatCard
          title="Departures Today"
          value={departuresToday}
          icon={LogOut}
          onClick={() => navigate('/front-desk')}
        />
        <StatCard
          title="Today's Revenue"
          value={`$${todayRevenue.toFixed(2)}`}
          icon={DollarSign}
          onClick={() => navigate('/billing')}
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        <SalesChart
          title="Occupancy Trend"
          data={occupancyTrend}
          color="hsl(var(--hotel))"
          icon={TrendingUp}
          showAxis
          valuePrefix=""
          height={180}
        />
        <BarChartCard
          title="Weekly Revenue"
          data={weeklyRevenue}
          color="hsl(var(--hotel))"
          icon={DollarSign}
          valuePrefix="$"
          height={180}
        />
      </div>

      {/* Room Status & Arrivals */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Room Status Pie */}
        <PieBreakdown
          title="Room Distribution"
          data={roomStatusPieData}
          icon={BedDouble}
        />

        {/* Today's Arrivals */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <LogIn className="w-5 h-5 text-success" />
              Today's Arrivals
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/front-desk')}>
              Front Desk
            </Button>
          </CardHeader>
          <CardContent>
            {arrivalsToday.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserCheck className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No arrivals scheduled today</p>
              </div>
            ) : (
              <div className="space-y-3">
                {arrivalsToday.map((arrival) => (
                  <div
                    key={arrival.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{arrival.guest_name}</p>
                      <p className="text-sm text-muted-foreground">Room {arrival.room_number}</p>
                    </div>
                    <Badge variant={arrival.status === 'checked-in' ? 'default' : 'outline'}>
                      {arrival.status === 'checked-in' ? 'Arrived' : 'Expected'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Operations Status */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card 
          className="border-border/50 bg-card/50 backdrop-blur cursor-pointer hover:bg-card/70 transition-colors"
          onClick={() => navigate('/housekeeping')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-warning/10">
                <ClipboardList className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{housekeepingPending}</p>
                <p className="text-sm text-muted-foreground">Housekeeping Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-border/50 bg-card/50 backdrop-blur cursor-pointer hover:bg-card/70 transition-colors"
          onClick={() => navigate('/maintenance')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-destructive/10">
                <Wrench className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{maintenancePending}</p>
                <p className="text-sm text-muted-foreground">Maintenance Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-border/50 bg-card/50 backdrop-blur cursor-pointer hover:bg-card/70 transition-colors"
          onClick={() => navigate('/guest-services')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-info/10">
                <Users className="w-6 h-6 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">Guest</p>
                <p className="text-sm text-muted-foreground">Services</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-border/50 bg-card/50 backdrop-blur cursor-pointer hover:bg-card/70 transition-colors"
          onClick={() => navigate('/reservations')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-hotel/10">
                <Calendar className="w-6 h-6 text-hotel" />
              </div>
              <div>
                <p className="text-2xl font-bold">Book</p>
                <p className="text-sm text-muted-foreground">Reservations</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <div className="grid lg:grid-cols-3 gap-6">
        <DemandForecastPanel vertical="hotel" />
        <DynamicPricingPanel vertical="hotel" />
        <MaintenancePredictorPanel vertical="hotel" />
      </div>
    </div>
  );
}
