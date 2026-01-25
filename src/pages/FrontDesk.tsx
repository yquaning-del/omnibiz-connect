import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import {
  Loader2,
  UserCheck,
  UserMinus,
  CreditCard,
  Key,
  Search,
  Clock,
  BedDouble,
  Users,
  CheckCircle2,
  AlertCircle,
  Zap,
  FileText,
} from 'lucide-react';
import { PermissionGate } from '@/components/auth/PermissionGate';

interface Reservation {
  id: string;
  guest_name: string;
  guest_phone: string | null;
  guest_email: string | null;
  guest_count: number;
  check_in: string;
  check_out: string | null;
  status: string;
  notes: string | null;
  room_id: string | null;
  actual_check_in: string | null;
  actual_check_out: string | null;
  id_verified: boolean;
  key_card_issued: boolean;
  express_checkout: boolean;
  folio_id: string | null;
  room?: {
    room_number: string;
    room_type: string;
    price_per_night: number;
  };
}

interface HotelRoom {
  id: string;
  room_number: string;
  room_type: string;
  status: string;
  housekeeping_status: string;
  price_per_night: number;
  capacity: number;
}

const statusColors: Record<string, string> = {
  confirmed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'checked-in': 'bg-green-500/10 text-green-500 border-green-500/20',
  'checked-out': 'bg-muted text-muted-foreground border-muted',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
  pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
};

export default function FrontDesk() {
  const { currentOrganization, currentLocation, user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('arrivals');
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [checkOutDialogOpen, setCheckOutDialogOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [processing, setProcessing] = useState(false);

  // Check-in form state
  const [idVerified, setIdVerified] = useState(false);
  const [keyCardIssued, setKeyCardIssued] = useState(false);

  useEffect(() => {
    if (currentLocation) {
      fetchData();
    }
  }, [currentLocation]);

  const fetchData = async () => {
    if (!currentLocation) return;
    setLoading(true);

    const today = new Date().toISOString().split('T')[0];

    const [reservationsRes, roomsRes] = await Promise.all([
      supabase
        .from('reservations')
        .select('*')
        .eq('location_id', currentLocation.id)
        .eq('reservation_type', 'room')
        .gte('check_in', today + 'T00:00:00')
        .order('check_in', { ascending: true }),
      supabase
        .from('hotel_rooms')
        .select('*')
        .eq('location_id', currentLocation.id),
    ]);

    if (reservationsRes.data) {
      // Enrich with room data
      const enriched = reservationsRes.data.map((res: any) => {
        const room = roomsRes.data?.find((r: any) => r.id === res.room_id);
        return { ...res, room };
      });
      setReservations(enriched);
    }
    if (roomsRes.data) setRooms(roomsRes.data as HotelRoom[]);

    setLoading(false);
  };

  const handleCheckIn = async () => {
    if (!selectedReservation || !currentOrganization || !currentLocation) return;
    setProcessing(true);

    try {
      // Create folio for the guest
      const folioNumber = `F${Date.now().toString().slice(-8)}`;
      const nights = selectedReservation.check_out 
        ? differenceInDays(new Date(selectedReservation.check_out), new Date(selectedReservation.check_in))
        : 1;
      const roomRate = selectedReservation.room?.price_per_night || 0;
      const roomCharges = nights * roomRate;

      const { data: folio, error: folioError } = await supabase
        .from('guest_folios')
        .insert({
          organization_id: currentOrganization.id,
          location_id: currentLocation.id,
          reservation_id: selectedReservation.id,
          folio_number: folioNumber,
          guest_name: selectedReservation.guest_name,
          room_number: selectedReservation.room?.room_number,
          check_in: new Date(selectedReservation.check_in).toISOString().split('T')[0],
          check_out: selectedReservation.check_out ? new Date(selectedReservation.check_out).toISOString().split('T')[0] : null,
          room_charges: roomCharges,
          total_amount: roomCharges,
          balance_due: roomCharges,
        })
        .select()
        .single();

      if (folioError) throw folioError;

      // Update reservation
      const { error: resError } = await supabase
        .from('reservations')
        .update({
          status: 'checked-in',
          actual_check_in: new Date().toISOString(),
          id_verified: idVerified,
          key_card_issued: keyCardIssued,
          folio_id: folio?.id,
        })
        .eq('id', selectedReservation.id);

      if (resError) throw resError;

      // Update room status
      if (selectedReservation.room_id) {
        await supabase
          .from('hotel_rooms')
          .update({ status: 'occupied' })
          .eq('id', selectedReservation.room_id);
      }

      toast({ title: 'Guest checked in successfully' });
      setCheckInDialogOpen(false);
      setSelectedReservation(null);
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckOut = async (expressCheckout = false) => {
    if (!selectedReservation) return;
    setProcessing(true);

    try {
      // Update reservation
      const { error: resError } = await supabase
        .from('reservations')
        .update({
          status: 'checked-out',
          actual_check_out: new Date().toISOString(),
          express_checkout: expressCheckout,
        })
        .eq('id', selectedReservation.id);

      if (resError) throw resError;

      // Update room status and housekeeping
      if (selectedReservation.room_id) {
        await supabase
          .from('hotel_rooms')
          .update({ status: 'available', housekeeping_status: 'dirty' })
          .eq('id', selectedReservation.room_id);
      }

      // Close folio
      if (selectedReservation.folio_id) {
        await supabase
          .from('guest_folios')
          .update({ status: 'closed' })
          .eq('id', selectedReservation.folio_id);
      }

      toast({ title: expressCheckout ? 'Express checkout completed' : 'Guest checked out successfully' });
      setCheckOutDialogOpen(false);
      setSelectedReservation(null);
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setProcessing(false);
    }
  };

  const todayArrivals = reservations.filter(
    r => r.status === 'confirmed' && new Date(r.check_in).toDateString() === new Date().toDateString()
  );
  
  const inHouseGuests = reservations.filter(r => r.status === 'checked-in');
  
  const todayDepartures = reservations.filter(
    r => r.status === 'checked-in' && r.check_out && new Date(r.check_out).toDateString() === new Date().toDateString()
  );

  const filteredReservations = (list: Reservation[]) =>
    list.filter(r =>
      r.guest_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.room?.room_number?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PermissionGate permission="hotel.front_desk">
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Front Desk</h1>
          <p className="text-muted-foreground">Guest check-in and check-out operations</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search guest or room..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Arrivals</p>
                <p className="text-2xl font-bold">{todayArrivals.length}</p>
              </div>
              <UserCheck className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In-House Guests</p>
                <p className="text-2xl font-bold">{inHouseGuests.length}</p>
              </div>
              <BedDouble className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Departures</p>
                <p className="text-2xl font-bold">{todayDepartures.length}</p>
              </div>
              <UserMinus className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available Rooms</p>
                <p className="text-2xl font-bold">{rooms.filter(r => r.status === 'available' && r.housekeeping_status === 'clean').length}</p>
              </div>
              <Key className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="arrivals" className="gap-2">
            <UserCheck className="h-4 w-4" />
            Arrivals ({todayArrivals.length})
          </TabsTrigger>
          <TabsTrigger value="inhouse" className="gap-2">
            <BedDouble className="h-4 w-4" />
            In-House ({inHouseGuests.length})
          </TabsTrigger>
          <TabsTrigger value="departures" className="gap-2">
            <UserMinus className="h-4 w-4" />
            Departures ({todayDepartures.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="arrivals" className="mt-6">
          <div className="grid gap-4">
            {filteredReservations(todayArrivals).length === 0 ? (
              <Card className="border-border/50 bg-card/50">
                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Clock className="w-12 h-12 mb-4" />
                  <p>No arrivals scheduled for today</p>
                </CardContent>
              </Card>
            ) : (
              filteredReservations(todayArrivals).map((res) => (
                <Card key={res.id} className="border-border/50 bg-card/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">{res.guest_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Room {res.room?.room_number} • {res.room?.room_type} • {res.guest_count} guests
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(res.check_in), 'MMM d')} - {res.check_out ? format(new Date(res.check_out), 'MMM d') : 'Open'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn(statusColors[res.status])}>
                          {res.status}
                        </Badge>
                        <Button
                          onClick={() => {
                            setSelectedReservation(res);
                            setCheckInDialogOpen(true);
                          }}
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Check In
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="inhouse" className="mt-6">
          <div className="grid gap-4">
            {filteredReservations(inHouseGuests).length === 0 ? (
              <Card className="border-border/50 bg-card/50">
                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <BedDouble className="w-12 h-12 mb-4" />
                  <p>No guests currently checked in</p>
                </CardContent>
              </Card>
            ) : (
              filteredReservations(inHouseGuests).map((res) => (
                <Card key={res.id} className="border-border/50 bg-card/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                          <CheckCircle2 className="h-6 w-6 text-green-500" />
                        </div>
                        <div>
                          <p className="font-semibold">{res.guest_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Room {res.room?.room_number} • {res.room?.room_type}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {res.id_verified && <Badge variant="secondary" className="text-xs">ID Verified</Badge>}
                            {res.key_card_issued && <Badge variant="secondary" className="text-xs">Key Issued</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <FileText className="h-4 w-4 mr-2" />
                          View Folio
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="departures" className="mt-6">
          <div className="grid gap-4">
            {filteredReservations(todayDepartures).length === 0 ? (
              <Card className="border-border/50 bg-card/50">
                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <UserMinus className="w-12 h-12 mb-4" />
                  <p>No departures scheduled for today</p>
                </CardContent>
              </Card>
            ) : (
              filteredReservations(todayDepartures).map((res) => (
                <Card key={res.id} className="border-border/50 bg-card/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                          <UserMinus className="h-6 w-6 text-orange-500" />
                        </div>
                        <div>
                          <p className="font-semibold">{res.guest_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Room {res.room?.room_number} • Check-out by 12:00 PM
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedReservation(res);
                            handleCheckOut(true);
                          }}
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          Express
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedReservation(res);
                            setCheckOutDialogOpen(true);
                          }}
                        >
                          <UserMinus className="h-4 w-4 mr-2" />
                          Check Out
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Check-In Dialog */}
      <Dialog open={checkInDialogOpen} onOpenChange={setCheckInDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Check In Guest</DialogTitle>
          </DialogHeader>
          {selectedReservation && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-semibold">{selectedReservation.guest_name}</p>
                <p className="text-sm text-muted-foreground">
                  Room {selectedReservation.room?.room_number} • {selectedReservation.room?.room_type}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(selectedReservation.check_in), 'MMM d')} - 
                  {selectedReservation.check_out ? format(new Date(selectedReservation.check_out), ' MMM d') : ' Open'}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span>ID Verified</span>
                  </div>
                  <Button
                    variant={idVerified ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setIdVerified(!idVerified)}
                  >
                    {idVerified ? <CheckCircle2 className="h-4 w-4" /> : 'Verify'}
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    <span>Key Card Issued</span>
                  </div>
                  <Button
                    variant={keyCardIssued ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setKeyCardIssued(!keyCardIssued)}
                  >
                    {keyCardIssued ? <CheckCircle2 className="h-4 w-4" /> : 'Issue'}
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setCheckInDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCheckIn} disabled={processing}>
                  {processing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Complete Check-In
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Check-Out Dialog */}
      <Dialog open={checkOutDialogOpen} onOpenChange={setCheckOutDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Check Out Guest</DialogTitle>
          </DialogHeader>
          {selectedReservation && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-semibold">{selectedReservation.guest_name}</p>
                <p className="text-sm text-muted-foreground">
                  Room {selectedReservation.room?.room_number}
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Outstanding Balance</p>
                <p className="text-2xl font-bold">$0.00</p>
                <p className="text-xs text-muted-foreground">All charges settled</p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setCheckOutDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => handleCheckOut(false)} disabled={processing}>
                  {processing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Complete Check-Out
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </PermissionGate>
  );
}
