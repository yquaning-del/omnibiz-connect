import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Loader2, Plus, BedDouble, Users, DollarSign, Sparkles, Wrench, Edit, MoreVertical, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { format, addDays, startOfWeek, eachDayOfInterval } from 'date-fns';

interface HotelRoom {
  id: string;
  location_id: string;
  room_number: string;
  room_type: string;
  floor: number;
  capacity: number;
  price_per_night: number;
  status: string;
  housekeeping_status: string;
  amenities?: string[] | null;
  notes?: string | null;
}

const roomTypes = ['standard', 'deluxe', 'suite', 'executive', 'penthouse'];
const statusColors: Record<string, string> = {
  available: 'bg-success/20 text-success border-success/30',
  occupied: 'bg-destructive/20 text-destructive border-destructive/30',
  reserved: 'bg-warning/20 text-warning border-warning/30',
  maintenance: 'bg-muted text-muted-foreground border-muted',
};
const housekeepingColors: Record<string, string> = {
  clean: 'bg-success/20 text-success border-success/30',
  dirty: 'bg-destructive/20 text-destructive border-destructive/30',
  cleaning: 'bg-info/20 text-info border-info/30',
};

export default function Rooms() {
  const { currentLocation } = useAuth();
  const { toast } = useToast();
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingRoom, setEditingRoom] = useState<HotelRoom | null>(null);
  const [roomNumber, setRoomNumber] = useState('');
  const [roomType, setRoomType] = useState('standard');
  const [floor, setFloor] = useState('1');
  const [capacity, setCapacity] = useState('2');
  const [price, setPrice] = useState('');
  const [amenities, setAmenities] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('available');

  useEffect(() => {
    if (currentLocation) fetchRooms();
  }, [currentLocation]);

  const fetchRooms = async () => {
    if (!currentLocation) return;
    const { data } = await supabase.from('hotel_rooms').select('*').eq('location_id', currentLocation.id).order('room_number');
    if (data) setRooms(data as HotelRoom[]);
    setLoading(false);
  };

  const resetForm = () => {
    setRoomNumber('');
    setRoomType('standard');
    setFloor('1');
    setCapacity('2');
    setPrice('');
    setAmenities('');
    setNotes('');
    setStatus('available');
    setEditingRoom(null);
  };

  const handleEdit = (room: HotelRoom) => {
    setEditingRoom(room);
    setRoomNumber(room.room_number);
    setRoomType(room.room_type);
    setFloor(room.floor?.toString() || '1');
    setCapacity(room.capacity.toString());
    setPrice(room.price_per_night.toString());
    setAmenities(room.amenities?.join(', ') || '');
    setNotes(room.notes || '');
    setStatus(room.status);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLocation) return;
    setSaving(true);

    const amenitiesArray = amenities.trim() ? amenities.split(',').map(a => a.trim()).filter(a => a) : null;

    if (editingRoom) {
      // Update existing room
      const { error } = await supabase.from('hotel_rooms').update({
        room_number: roomNumber.trim(),
        room_type: roomType,
        floor: parseInt(floor),
        capacity: parseInt(capacity),
        price_per_night: parseFloat(price) || 0,
        amenities: amenitiesArray,
        notes: notes.trim() || null,
        status: status,
      }).eq('id', editingRoom.id);

      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      } else {
        toast({ title: 'Room updated' });
        setDialogOpen(false);
        resetForm();
        fetchRooms();
      }
    } else {
      // Create new room
      const { error } = await supabase.from('hotel_rooms').insert({
        location_id: currentLocation.id,
        room_number: roomNumber.trim(),
        room_type: roomType,
        floor: parseInt(floor),
        capacity: parseInt(capacity),
        price_per_night: parseFloat(price) || 0,
        amenities: amenitiesArray,
        notes: notes.trim() || null,
        status: status,
      });

      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      } else {
        toast({ title: 'Room created' });
        setDialogOpen(false);
        resetForm();
        fetchRooms();
      }
    }
    setSaving(false);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('hotel_rooms').update({ status }).eq('id', id);
    fetchRooms();
  };

  const updateHousekeeping = async (id: string, status: string) => {
    await supabase.from('hotel_rooms').update({ housekeeping_status: status }).eq('id', id);
    fetchRooms();
  };

  const stats = { total: rooms.length, available: rooms.filter(r => r.status === 'available').length, occupied: rooms.filter(r => r.status === 'occupied').length };

  // Availability calendar state
  const [calendarWeekStart, setCalendarWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [reservations, setReservations] = useState<Array<{ id: string; room_id: string | null; guest_name: string; check_in: string; check_out: string | null; status: string }>>([]);
  const [activeTab, setActiveTab] = useState('rooms');

  const calendarDays = eachDayOfInterval({ start: calendarWeekStart, end: addDays(calendarWeekStart, 13) });

  useEffect(() => {
    if (currentLocation && activeTab === 'availability') {
      const fetchReservations = async () => {
        const startDate = calendarWeekStart.toISOString();
        const endDate = addDays(calendarWeekStart, 14).toISOString();
        const { data } = await supabase
          .from('reservations')
          .select('id, room_id, guest_name, check_in, check_out, status')
          .eq('location_id', currentLocation.id)
          .eq('reservation_type', 'room')
          .neq('status', 'cancelled')
          .gte('check_out', startDate)
          .lte('check_in', endDate);
        if (data) setReservations(data);
      };
      fetchReservations();
    }
  }, [currentLocation, calendarWeekStart, activeTab]);

  const getRoomReservationForDay = (roomId: string, day: Date) => {
    return reservations.find(r => {
      if (r.room_id !== roomId) return false;
      const checkIn = new Date(r.check_in);
      const checkOut = r.check_out ? new Date(r.check_out) : addDays(checkIn, 1);
      return day >= new Date(checkIn.toDateString()) && day < new Date(checkOut.toDateString());
    });
  };

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <PermissionGate permission="hotel.rooms">
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Room Management</h1>
          <p className="text-muted-foreground">Manage hotel rooms and housekeeping</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild><Button onClick={resetForm}><Plus className="w-4 h-4 mr-2" />Add Room</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingRoom ? 'Edit Room' : 'Add Room'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Room Number</Label><Input value={roomNumber} onChange={e => setRoomNumber(e.target.value)} required /></div>
                <div className="space-y-2"><Label>Floor</Label><Input type="number" value={floor} onChange={e => setFloor(e.target.value)} /></div>
              </div>
              <div className="space-y-2"><Label>Type</Label><Select value={roomType} onValueChange={setRoomType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{roomTypes.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Capacity</Label><Select value={capacity} onValueChange={setCapacity}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[1,2,3,4,5,6].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Price/Night</Label><Input type="number" value={price} onChange={e => setPrice(e.target.value)} /></div>
              </div>
              <div className="space-y-2"><Label>Status</Label><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['available', 'occupied', 'reserved', 'maintenance'].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Amenities <span className="text-xs text-muted-foreground">(comma-separated)</span></Label><Input value={amenities} onChange={e => setAmenities(e.target.value)} placeholder="WiFi, TV, Mini Bar, etc." /></div>
              <div className="space-y-2"><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes about the room..." rows={3} /></div>
              <Button type="submit" className="w-full" disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{editingRoom ? 'Update' : 'Create'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-border/50 bg-card/50"><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card className="border-border/50 bg-card/50"><CardContent className="p-4"><p className="text-sm text-muted-foreground">Available</p><p className="text-2xl font-bold text-success">{stats.available}</p></CardContent></Card>
        <Card className="border-border/50 bg-card/50"><CardContent className="p-4"><p className="text-sm text-muted-foreground">Occupied</p><p className="text-2xl font-bold text-warning">{stats.occupied}</p></CardContent></Card>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="rooms" className="gap-2"><BedDouble className="h-4 w-4" />Rooms</TabsTrigger>
          <TabsTrigger value="availability" className="gap-2"><CalendarDays className="h-4 w-4" />Availability</TabsTrigger>
        </TabsList>

        <TabsContent value="rooms" className="mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {rooms.map(room => (
              <Card key={room.id} className="border-border/50 bg-card/50">
                <CardContent className="p-4">
                  <div className="flex justify-between mb-2">
                    <div><p className="font-bold text-lg">{room.room_number}</p><p className="text-xs text-muted-foreground capitalize">{room.room_type}</p></div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(room)} title="Edit room">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent><DropdownMenuItem onClick={() => updateStatus(room.id, 'available')}>Available</DropdownMenuItem><DropdownMenuItem onClick={() => updateStatus(room.id, 'occupied')}>Occupied</DropdownMenuItem></DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="flex gap-2 text-sm text-muted-foreground mb-2"><Users className="w-4 h-4" />{room.capacity}<DollarSign className="w-4 h-4 ml-2" />{room.price_per_night}</div>
                  <div className="flex gap-1 flex-wrap">
                    <Badge variant="outline" className={cn('text-xs', statusColors[room.status])}>{room.status}</Badge>
                    <Badge variant="outline" className={cn('text-xs', housekeepingColors[room.housekeeping_status])}>{room.housekeeping_status}</Badge>
                  </div>
                  <div className="mt-2 flex gap-1">{['clean','dirty','cleaning'].filter(s => s !== room.housekeeping_status).map(s => <button key={s} onClick={() => updateHousekeeping(room.id, s)} className={cn('px-2 py-0.5 rounded text-xs', housekeepingColors[s])}>{s[0].toUpperCase()}</button>)}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="availability" className="mt-4">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              {/* Navigation */}
              <div className="flex items-center justify-between mb-4">
                <Button variant="outline" size="sm" onClick={() => setCalendarWeekStart(addDays(calendarWeekStart, -7))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium text-sm">
                  {format(calendarWeekStart, 'MMM d')} - {format(addDays(calendarWeekStart, 13), 'MMM d, yyyy')}
                </span>
                <Button variant="outline" size="sm" onClick={() => setCalendarWeekStart(addDays(calendarWeekStart, 7))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Calendar Grid */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2 text-left font-medium text-muted-foreground w-24">Room</th>
                      {calendarDays.map(day => (
                        <th key={day.toISOString()} className={cn(
                          "p-1 text-center font-medium",
                          day.toDateString() === new Date().toDateString() ? 'text-primary bg-primary/5' : 'text-muted-foreground'
                        )}>
                          <div>{format(day, 'EEE')}</div>
                          <div>{format(day, 'd')}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map(room => (
                      <tr key={room.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="p-2 font-medium">
                          <div>{room.room_number}</div>
                          <div className="text-muted-foreground capitalize">{room.room_type}</div>
                        </td>
                        {calendarDays.map(day => {
                          const reservation = getRoomReservationForDay(room.id, day);
                          return (
                            <td key={day.toISOString()} className="p-1 text-center">
                              {reservation ? (
                                <div
                                  className={cn(
                                    'rounded px-1 py-0.5 text-[10px] truncate',
                                    reservation.status === 'checked-in' ? 'bg-green-500/20 text-green-700' : 'bg-blue-500/20 text-blue-700'
                                  )}
                                  title={`${reservation.guest_name} (${reservation.status})`}
                                >
                                  {reservation.guest_name.split(' ')[0]}
                                </div>
                              ) : (
                                <div className="w-full h-6 bg-green-500/5 rounded" title="Available" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-500/5 border" /><span>Available</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-500/20" /><span>Reserved</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-500/20" /><span>Checked In</span></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </PermissionGate>
  );
}
