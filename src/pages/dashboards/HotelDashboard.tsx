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

  useEffect(() => {
    if (!currentLocation?.id) return;
    fetchDashboardData();
  }, [currentLocation]);

  const fetchDashboardData = async () => {
    if (!currentLocation?.id || !currentOrganization?.id) return;
    setLoading(false);

    try {
      // Fetch room stats
      const { data: rooms } = await supabase
        .from('hotel_rooms')
        .select('status, housekeeping_status')
        .eq('location_id', currentLocation.id);

      if (rooms) {
        const stats: RoomStats = {
          total: rooms.length,
          available: rooms.filter(r => r.status === 'available').length,
          occupied: rooms.filter(r => r.status === 'occupied').length,
          maintenance: rooms.filter(r => r.status === 'maintenance').length,
          dirty: rooms.filter(r => r.housekeeping_status === 'dirty').length,
        };
        setRoomStats(stats);
        setOccupancyRate(stats.total > 0 ? (stats.occupied / stats.total) * 100 : 0);
      }

      // Today's arrivals
      const today = new Date().toISOString().split('T')[0];
      const { data: arrivals } = await supabase
        .from('reservations')
        .select('id, guest_name, check_in, status, room_id')
        .eq('location_id', currentLocation.id)
        .eq('reservation_type', 'room')
        .gte('check_in', today + 'T00:00:00')
        .lte('check_in', today + 'T23:59:59')
        .in('status', ['confirmed', 'checked_in'])
        .limit(10);

      if (arrivals) {
        // Get room numbers for arrivals
        const arrivalsWithRooms = await Promise.all(
          arrivals.map(async (a) => {
            if (a.room_id) {
              const { data: room } = await supabase
                .from('hotel_rooms')
                .select('room_number')
                .eq('id', a.room_id)
                .single();
              return { ...a, room_number: room?.room_number || 'TBA' };
            }
            return { ...a, room_number: 'TBA' };
          })
        );
        setArrivalsToday(arrivalsWithRooms);
      }

      // Today's departures
      const { count: deptCount } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('location_id', currentLocation.id)
        .eq('reservation_type', 'room')
        .gte('check_out', today + 'T00:00:00')
        .lte('check_out', today + 'T23:59:59');

      setDeparturesToday(deptCount || 0);

      // Housekeeping pending
      const { count: hkCount } = await supabase
        .from('housekeeping_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('location_id', currentLocation.id)
        .in('status', ['pending', 'in_progress']);

      setHousekeepingPending(hkCount || 0);

      // Maintenance pending
      const { count: maintCount } = await supabase
        .from('maintenance_requests')
        .select('*', { count: 'exact', head: true })
        .eq('location_id', currentLocation.id)
        .in('status', ['open', 'in_progress']);

      setMaintenancePending(maintCount || 0);

      // Today's revenue from folios
      const { data: folios } = await supabase
        .from('guest_folios')
        .select('total_amount')
        .eq('location_id', currentLocation.id)
        .gte('created_at', today + 'T00:00:00');

      if (folios) {
        setTodayRevenue(folios.reduce((sum, f) => sum + Number(f.total_amount || 0), 0));
      }
    } catch (error) {
      console.error('Error fetching hotel dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

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

      {/* Room Status & Arrivals */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Room Status */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-hotel" />
              Room Status
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/rooms')}>
              View All
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Occupancy</span>
                <span className="font-medium">{roomStats.occupied}/{roomStats.total} rooms</span>
              </div>
              <Progress value={occupancyRate} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-center">
                <p className="text-2xl font-bold text-success">{roomStats.available}</p>
                <p className="text-xs text-muted-foreground">Available</p>
              </div>
              <div className="p-3 rounded-lg bg-info/10 border border-info/20 text-center">
                <p className="text-2xl font-bold text-info">{roomStats.occupied}</p>
                <p className="text-xs text-muted-foreground">Occupied</p>
              </div>
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-center">
                <p className="text-2xl font-bold text-warning">{roomStats.dirty}</p>
                <p className="text-xs text-muted-foreground">Need Cleaning</p>
              </div>
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
                <p className="text-2xl font-bold text-destructive">{roomStats.maintenance}</p>
                <p className="text-xs text-muted-foreground">Maintenance</p>
              </div>
            </div>
          </CardContent>
        </Card>

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
                    <Badge variant={arrival.status === 'checked_in' ? 'default' : 'outline'}>
                      {arrival.status === 'checked_in' ? 'Arrived' : 'Expected'}
                    </Badge>
                  </div>
                ))
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
    </div>
  );
}
