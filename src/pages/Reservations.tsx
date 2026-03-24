import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { cn } from '@/lib/utils';
import { Loader2, Plus, CalendarIcon, UtensilsCrossed, BedDouble, Clock, Users, Phone, Mail, Trash2, Pencil } from 'lucide-react';
import { format, addDays, isSameDay } from 'date-fns';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { toast } from 'sonner';

interface Reservation {
  id: string;
  reservation_type: string;
  guest_name: string;
  guest_phone: string | null;
  guest_email: string | null;
  guest_count: number;
  check_in: string;
  check_out: string | null;
  status: string;
  notes: string | null;
  table_id: string | null;
  room_id: string | null;
}

interface TableOption {
  id: string;
  table_number: string;
  capacity: number;
}

interface RoomOption {
  id: string;
  room_number: string;
  room_type: string;
}

const statusColors: Record<string, string> = {
  confirmed: 'bg-success/20 text-success border-success/30',
  pending: 'bg-warning/20 text-warning border-warning/30',
  cancelled: 'bg-destructive/20 text-destructive border-destructive/30',
  completed: 'bg-muted text-muted-foreground border-muted',
  'checked-in': 'bg-info/20 text-info border-info/30',
};

export default function Reservations() {
  const { currentOrganization, currentLocation } = useAuth();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<TableOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Form state
  const [resType, setResType] = useState<'table' | 'room'>('table');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestCount, setGuestCount] = useState('2');
  const [checkInDate, setCheckInDate] = useState<Date>();
  const [checkInTime, setCheckInTime] = useState('19:00');
  const [checkOutDate, setCheckOutDate] = useState<Date>();
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [resNotes, setResNotes] = useState('');

  useEffect(() => {
    if (!currentOrganization || !currentLocation) return;
    fetchReservations();
    fetchTables();
    fetchRooms();
  }, [currentOrganization, currentLocation]);

  const fetchReservations = async () => {
    if (!currentLocation) return;

    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('location_id', currentLocation.id)
      .order('check_in', { ascending: true });

    if (error) {
      console.error('Error fetching reservations:', error);
    } else {
      setReservations(data as Reservation[]);
    }
    setLoading(false);
  };

  const fetchTables = async () => {
    if (!currentLocation) return;

    const { data } = await supabase
      .from('restaurant_tables')
      .select('id, table_number, capacity')
      .eq('location_id', currentLocation.id)
      .order('table_number');

    if (data) setTables(data);
  };

  const fetchRooms = async () => {
    if (!currentLocation) return;

    const { data } = await supabase
      .from('hotel_rooms')
      .select('id, room_number, room_type')
      .eq('location_id', currentLocation.id)
      .order('room_number');

    if (data) setRooms(data);
  };

  const resetForm = () => {
    setResType('table');
    setGuestName('');
    setGuestPhone('');
    setGuestEmail('');
    setGuestCount('2');
    setCheckInDate(undefined);
    setCheckInTime('19:00');
    setCheckOutDate(undefined);
    setSelectedTableId('');
    setSelectedRoomId('');
    setResNotes('');
    setEditingReservation(null);
  };

  const populateFormFromReservation = (reservation: Reservation) => {
    setResType(reservation.reservation_type as 'table' | 'room');
    setGuestName(reservation.guest_name);
    setGuestPhone(reservation.guest_phone || '');
    setGuestEmail(reservation.guest_email || '');
    setGuestCount(reservation.guest_count.toString());
    
    const checkInDateObj = new Date(reservation.check_in);
    setCheckInDate(checkInDateObj);
    setCheckInTime(format(checkInDateObj, 'HH:mm'));
    
    if (reservation.check_out) {
      setCheckOutDate(new Date(reservation.check_out));
    } else {
      setCheckOutDate(undefined);
    }
    
    setSelectedTableId(reservation.table_id || '');
    setSelectedRoomId(reservation.room_id || '');
    setResNotes(reservation.notes || '');
  };

  const handleEditClick = (reservation: Reservation) => {
    setEditingReservation(reservation);
    populateFormFromReservation(reservation);
    setEditDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization || !currentLocation || !checkInDate) return;

    setSaving(true);

    try {
      const checkInDateTime = new Date(checkInDate);
      const [hours, minutes] = checkInTime.split(':');
      checkInDateTime.setHours(parseInt(hours), parseInt(minutes));

      // Check for reservation conflicts (overlapping dates on same room/table)
      // Exclude the current reservation if editing
      const excludeId = editingReservation?.id;

      if (resType === 'room' && selectedRoomId && checkOutDate) {
        let query = supabase
          .from('reservations')
          .select('id')
          .eq('location_id', currentLocation.id)
          .eq('reservation_type', 'room')
          .eq('room_id', selectedRoomId)
          .neq('status', 'cancelled')
          .lt('check_in', checkOutDate.toISOString())
          .gt('check_out', checkInDateTime.toISOString());

        if (excludeId) {
          query = query.neq('id', excludeId);
        }

        const { data: conflicts } = await query;

        if (conflicts && conflicts.length > 0) {
          toast.error("Conflict detected", { description: "This room is already reserved for the selected dates. Please choose different dates or another room." });
          setSaving(false);
          return;
        }
      }

      if (resType === 'table' && selectedTableId) {
        // Check for table conflicts on same date/time (within 2-hour window)
        const windowStart = new Date(checkInDateTime);
        windowStart.setHours(windowStart.getHours() - 2);
        const windowEnd = new Date(checkInDateTime);
        windowEnd.setHours(windowEnd.getHours() + 2);

        let query = supabase
          .from('reservations')
          .select('id')
          .eq('location_id', currentLocation.id)
          .eq('reservation_type', 'table')
          .eq('table_id', selectedTableId)
          .neq('status', 'cancelled')
          .gte('check_in', windowStart.toISOString())
          .lte('check_in', windowEnd.toISOString());

        if (excludeId) {
          query = query.neq('id', excludeId);
        }

        const { data: tableConflicts } = await query;

        if (tableConflicts && tableConflicts.length > 0) {
          toast.error("Conflict detected", { description: "This table is already reserved near the selected time. Please choose a different time or table." });
          setSaving(false);
          return;
        }
      }

      const reservationData = {
        organization_id: currentOrganization.id,
        location_id: currentLocation.id,
        reservation_type: resType,
        guest_name: guestName.trim(),
        guest_phone: guestPhone.trim() || null,
        guest_email: guestEmail.trim() || null,
        guest_count: parseInt(guestCount),
        check_in: checkInDateTime.toISOString(),
        check_out: resType === 'room' && checkOutDate ? checkOutDate.toISOString() : null,
        table_id: resType === 'table' && selectedTableId ? selectedTableId : null,
        room_id: resType === 'room' && selectedRoomId ? selectedRoomId : null,
        notes: resNotes.trim() || null,
        status: editingReservation?.status || 'confirmed',
      };

      if (editingReservation) {
        // Update existing reservation
        const { error } = await supabase
          .from('reservations')
          .update(reservationData)
          .eq('id', editingReservation.id);

        if (error) throw error;

        toast.success("Reservation updated");
        setEditDialogOpen(false);
      } else {
        // Create new reservation
        const { error } = await supabase
          .from('reservations')
          .insert(reservationData);

        if (error) throw error;

        toast.success("Reservation created");
        setDialogOpen(false);
      }

      resetForm();
      fetchReservations();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('reservations')
      .update({ status })
      .eq('id', id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast.success("Status updated");
      fetchReservations();
    }
  };

  const cancelReservation = async (id: string) => {
    const confirmed = await confirm({ title: 'Cancel this reservation?', description: 'This action cannot be undone.', variant: 'destructive', confirmLabel: 'Cancel Reservation' }); if (!confirmed) return;
    await updateStatus(id, 'cancelled');
  };

  const filteredReservations = reservations.filter(res => {
    if (activeTab === 'table') return res.reservation_type === 'table';
    if (activeTab === 'room') return res.reservation_type === 'room';
    return true;
  }).filter(res => {
    return isSameDay(new Date(res.check_in), selectedDate);
  });

  const upcomingReservations = reservations.filter(res => 
    new Date(res.check_in) >= new Date() && res.status !== 'cancelled'
  ).slice(0, 10);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <FeatureGate feature="reservations" requiredTier="Professional">
      <div className="space-y-6 animate-fade-in">
        <ConfirmDialog />
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Reservations</h1>
            <p className="text-muted-foreground">Manage table and room reservations</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Reservation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Reservation</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Reservation Type */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={resType === 'table' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setResType('table')}
                >
                  <UtensilsCrossed className="w-4 h-4 mr-2" />
                  Table
                </Button>
                <Button
                  type="button"
                  variant={resType === 'room' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setResType('room')}
                >
                  <BedDouble className="w-4 h-4 mr-2" />
                  Room
                </Button>
              </div>

              {/* Guest Info */}
              <div className="space-y-2">
                <Label>Guest Name *</Label>
                <Input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="+1 234 567 8900"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="guest@email.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Guests</Label>
                  <Select value={guestCount} onValueChange={setGuestCount}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map(n => (
                        <SelectItem key={n} value={n.toString()}>{n} guests</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{resType === 'table' ? 'Select Table' : 'Select Room'}</Label>
                  {resType === 'table' ? (
                    <Select value={selectedTableId} onValueChange={setSelectedTableId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select table" />
                      </SelectTrigger>
                      <SelectContent>
                        {tables.map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.table_number} ({t.capacity} seats)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select room" />
                      </SelectTrigger>
                      <SelectContent>
                        {rooms.map(r => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.room_number} ({r.room_type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{resType === 'table' ? 'Date & Time' : 'Check-in'}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !checkInDate && 'text-muted-foreground')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {checkInDate ? format(checkInDate, 'PPP') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={checkInDate}
                        onSelect={setCheckInDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {resType === 'table' ? (
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={checkInTime}
                      onChange={(e) => setCheckInTime(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Check-out</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !checkOutDate && 'text-muted-foreground')}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {checkOutDate ? format(checkOutDate, 'PPP') : 'Pick date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={checkOutDate}
                          onSelect={setCheckOutDate}
                          disabled={(date) => date <= (checkInDate || new Date())}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={resNotes}
                  onChange={(e) => setResNotes(e.target.value)}
                  placeholder="Special requests..."
                />
              </div>

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create Reservation
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Reservation</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Reservation Type */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={resType === 'table' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setResType('table')}
                >
                  <UtensilsCrossed className="w-4 h-4 mr-2" />
                  Table
                </Button>
                <Button
                  type="button"
                  variant={resType === 'room' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setResType('room')}
                >
                  <BedDouble className="w-4 h-4 mr-2" />
                  Room
                </Button>
              </div>

              {/* Guest Info */}
              <div className="space-y-2">
                <Label>Guest Name *</Label>
                <Input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="+1 234 567 8900"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="guest@email.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Guests</Label>
                  <Select value={guestCount} onValueChange={setGuestCount}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map(n => (
                        <SelectItem key={n} value={n.toString()}>{n} guests</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{resType === 'table' ? 'Select Table' : 'Select Room'}</Label>
                  {resType === 'table' ? (
                    <Select value={selectedTableId} onValueChange={setSelectedTableId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select table" />
                      </SelectTrigger>
                      <SelectContent>
                        {tables.map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.table_number} ({t.capacity} seats)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select room" />
                      </SelectTrigger>
                      <SelectContent>
                        {rooms.map(r => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.room_number} ({r.room_type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{resType === 'table' ? 'Date & Time' : 'Check-in'}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !checkInDate && 'text-muted-foreground')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {checkInDate ? format(checkInDate, 'PPP') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={checkInDate}
                        onSelect={setCheckInDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {resType === 'table' ? (
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={checkInTime}
                      onChange={(e) => setCheckInTime(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Check-out</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !checkOutDate && 'text-muted-foreground')}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {checkOutDate ? format(checkOutDate, 'PPP') : 'Pick date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={checkOutDate}
                          onSelect={setCheckOutDate}
                          disabled={(date) => date <= (checkInDate || new Date())}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={resNotes}
                  onChange={(e) => setResNotes(e.target.value)}
                  placeholder="Special requests..."
                />
              </div>

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Update Reservation
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar & List */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="table" className="flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4" />
                Tables
              </TabsTrigger>
              <TabsTrigger value="room" className="flex items-center gap-2">
                <BedDouble className="w-4 h-4" />
                Rooms
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Date selector */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[...Array(7)].map((_, i) => {
              const date = addDays(new Date(), i);
              const count = reservations.filter(r => isSameDay(new Date(r.check_in), date)).length;
              return (
                <Button
                  key={i}
                  variant={isSameDay(date, selectedDate) ? 'default' : 'outline'}
                  className="flex-col h-auto py-2 min-w-16"
                  onClick={() => setSelectedDate(date)}
                >
                  <span className="text-xs">{format(date, 'EEE')}</span>
                  <span className="text-lg font-bold">{format(date, 'd')}</span>
                  {count > 0 && <Badge variant="secondary" className="mt-1 text-xs">{count}</Badge>}
                </Button>
              );
            })}
          </div>

          {/* Reservations for selected date */}
          <div className="space-y-3">
            {filteredReservations.length === 0 ? (
              <Card className="border-border/50 bg-card/50">
                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <CalendarIcon className="w-12 h-12 mb-4" />
                  <p>No reservations for {format(selectedDate, 'MMMM d, yyyy')}</p>
                </CardContent>
              </Card>
            ) : (
              filteredReservations.map(res => (
                <Card key={res.id} className="border-border/50 bg-card/50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          'w-12 h-12 rounded-xl flex items-center justify-center',
                          res.reservation_type === 'table' ? 'bg-restaurant/20' : 'bg-hotel/20'
                        )}>
                          {res.reservation_type === 'table' 
                            ? <UtensilsCrossed className="w-6 h-6 text-restaurant" />
                            : <BedDouble className="w-6 h-6 text-hotel" />
                          }
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{res.guest_name}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {res.guest_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(res.check_in), 'h:mm a')}
                            </span>
                            {res.guest_phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {res.guest_phone}
                              </span>
                            )}
                          </div>
                          {res.notes && (
                            <p className="text-sm text-warning mt-2">{res.notes}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={statusColors[res.status]}>
                          {res.status}
                        </Badge>
                        {res.status === 'confirmed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateStatus(res.id, 'checked-in')}
                          >
                            Check In
                          </Button>
                        )}
                        {res.status !== 'cancelled' && res.status !== 'completed' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditClick(res)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => cancelReservation(res.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Upcoming */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg">Upcoming</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingReservations.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No upcoming reservations</p>
            ) : (
              upcomingReservations.map(res => (
                <div key={res.id} className="p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-2 mb-1">
                    {res.reservation_type === 'table' 
                      ? <UtensilsCrossed className="w-4 h-4 text-restaurant" />
                      : <BedDouble className="w-4 h-4 text-hotel" />
                    }
                    <span className="font-medium text-foreground">{res.guest_name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(res.check_in), 'MMM d, h:mm a')} • {res.guest_count} guests
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </FeatureGate>
  );
}
