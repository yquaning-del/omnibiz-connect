import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Loader2, Plus, BedDouble, Users, DollarSign, Sparkles, Wrench, Edit, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PermissionGate } from '@/components/auth/PermissionGate';

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
  const [roomNumber, setRoomNumber] = useState('');
  const [roomType, setRoomType] = useState('standard');
  const [floor, setFloor] = useState('1');
  const [capacity, setCapacity] = useState('2');
  const [price, setPrice] = useState('');

  useEffect(() => {
    if (currentLocation) fetchRooms();
  }, [currentLocation]);

  const fetchRooms = async () => {
    if (!currentLocation) return;
    const { data } = await supabase.from('hotel_rooms').select('*').eq('location_id', currentLocation.id).order('room_number');
    if (data) setRooms(data as HotelRoom[]);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLocation) return;
    setSaving(true);
    const { error } = await supabase.from('hotel_rooms').insert({
      location_id: currentLocation.id,
      room_number: roomNumber.trim(),
      room_type: roomType,
      floor: parseInt(floor),
      capacity: parseInt(capacity),
      price_per_night: parseFloat(price) || 0,
    });
    if (error) toast({ variant: 'destructive', title: 'Error', description: error.message });
    else { toast({ title: 'Room created' }); setDialogOpen(false); fetchRooms(); }
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

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <PermissionGate permission="hotel.rooms">
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Room Management</h1>
          <p className="text-muted-foreground">Manage hotel rooms and housekeeping</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Room</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Room</DialogTitle></DialogHeader>
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
              <Button type="submit" className="w-full" disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-border/50 bg-card/50"><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card className="border-border/50 bg-card/50"><CardContent className="p-4"><p className="text-sm text-muted-foreground">Available</p><p className="text-2xl font-bold text-success">{stats.available}</p></CardContent></Card>
        <Card className="border-border/50 bg-card/50"><CardContent className="p-4"><p className="text-sm text-muted-foreground">Occupied</p><p className="text-2xl font-bold text-warning">{stats.occupied}</p></CardContent></Card>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {rooms.map(room => (
          <Card key={room.id} className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex justify-between mb-2">
                <div><p className="font-bold text-lg">{room.room_number}</p><p className="text-xs text-muted-foreground capitalize">{room.room_type}</p></div>
                <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent><DropdownMenuItem onClick={() => updateStatus(room.id, 'available')}>Available</DropdownMenuItem><DropdownMenuItem onClick={() => updateStatus(room.id, 'occupied')}>Occupied</DropdownMenuItem></DropdownMenuContent>
                </DropdownMenu>
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
    </div>
    </PermissionGate>
  );
}
