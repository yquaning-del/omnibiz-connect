import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Loader2,
  Plus,
  UtensilsCrossed,
  Sparkles,
  Clock,
  CheckCircle2,
  BedDouble,
  User,
  Coffee,
  Shirt,
  Car,
  Package,
} from 'lucide-react';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { toast } from 'sonner';

interface RoomServiceOrder {
  id: string;
  order_number: string;
  guest_name: string;
  room_number: string | null;
  order_type: string;
  items: any[];
  special_instructions: string | null;
  total_amount: number;
  status: string;
  created_at: string;
}

interface AmenityRequest {
  id: string;
  guest_name: string;
  room_number: string | null;
  request_type: string;
  description: string | null;
  quantity: number;
  priority: string;
  status: string;
  created_at: string;
}

interface HotelRoom {
  id: string;
  room_number: string;
}

const orderStatuses = ['pending', 'preparing', 'ready', 'delivered', 'cancelled'];
const requestStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
const amenityTypes = ['towels', 'pillows', 'toiletries', 'minibar', 'laundry', 'ironing', 'wake_up_call', 'transportation', 'other'];

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  preparing: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  ready: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  in_progress: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  delivered: 'bg-green-500/10 text-green-500 border-green-500/20',
  completed: 'bg-green-500/10 text-green-500 border-green-500/20',
  cancelled: 'bg-muted text-muted-foreground border-muted',
};

const amenityIcons: Record<string, typeof Coffee> = {
  towels: Package,
  pillows: Package,
  toiletries: Package,
  minibar: Coffee,
  laundry: Shirt,
  ironing: Shirt,
  wake_up_call: Clock,
  transportation: Car,
  other: Sparkles,
};

export default function GuestServices() {
  const { currentOrganization, currentLocation } = useAuth();
  const [loading, setLoading] = useState(true);
  const [roomServiceOrders, setRoomServiceOrders] = useState<RoomServiceOrder[]>([]);
  const [amenityRequests, setAmenityRequests] = useState<AmenityRequest[]>([]);
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [activeTab, setActiveTab] = useState('room-service');
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [amenityDialogOpen, setAmenityDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Room service form
  const [orderForm, setOrderForm] = useState({
    guest_name: '',
    room_number: '',
    items: '',
    special_instructions: '',
    total_amount: '',
  });

  // Amenity request form
  const [amenityForm, setAmenityForm] = useState({
    guest_name: '',
    room_number: '',
    request_type: 'towels',
    description: '',
    quantity: '1',
    priority: 'normal',
  });

  useEffect(() => {
    if (currentLocation) {
      fetchData();
      const cleanup = subscribeToUpdates();
      return cleanup;
    }
  }, [currentLocation]);

  const fetchData = async () => {
    if (!currentLocation) return;
    setLoading(true);

    const [ordersRes, requestsRes, roomsRes] = await Promise.all([
      supabase
        .from('room_service_orders')
        .select('*')
        .eq('location_id', currentLocation.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('amenity_requests')
        .select('*')
        .eq('location_id', currentLocation.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('hotel_rooms')
        .select('id, room_number')
        .eq('location_id', currentLocation.id),
    ]);

    if (ordersRes.data) setRoomServiceOrders(ordersRes.data as RoomServiceOrder[]);
    if (requestsRes.data) setAmenityRequests(requestsRes.data as AmenityRequest[]);
    if (roomsRes.data) setRooms(roomsRes.data);

    setLoading(false);
  };

  const subscribeToUpdates = () => {
    if (!currentLocation) return;

    const ordersChannel = supabase
      .channel('room-service-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_service_orders',
          filter: `location_id=eq.${currentLocation.id}`,
        },
        () => fetchData()
      )
      .subscribe();

    const amenitiesChannel = supabase
      .channel('amenity-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'amenity_requests',
          filter: `location_id=eq.${currentLocation.id}`,
        },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(amenitiesChannel);
    };
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization || !currentLocation) return;
    setSaving(true);

    try {
      const orderNumber = `RS${Date.now().toString().slice(-8)}`;
      const items = orderForm.items.split('\n').filter(Boolean).map((item) => ({ name: item.trim(), quantity: 1 }));

      const { error } = await supabase.from('room_service_orders').insert({
        organization_id: currentOrganization.id,
        location_id: currentLocation.id,
        order_number: orderNumber,
        guest_name: orderForm.guest_name,
        room_number: orderForm.room_number || null,
        order_type: 'food',
        items: items,
        special_instructions: orderForm.special_instructions || null,
        total_amount: parseFloat(orderForm.total_amount) || 0,
      });

      if (error) throw error;

      // Auto-post charge to guest folio if room number is provided
      const totalAmount = parseFloat(orderForm.total_amount) || 0;
      if (orderForm.room_number && totalAmount > 0) {
        try {
          // Find open folio for this room
          const { data: folio } = await supabase
            .from('guest_folios')
            .select('id, incidental_charges, total_amount, balance_due')
            .eq('location_id', currentLocation.id)
            .eq('room_number', orderForm.room_number)
            .eq('status', 'open')
            .single();

          if (folio) {
            // Add charge to folio
            await supabase.from('folio_charges').insert({
              folio_id: folio.id,
              charge_type: 'room_service',
              description: `Room Service Order #${orderNumber}`,
              unit_price: totalAmount,
              total_amount: totalAmount,
            });

            // Update folio totals
            const newIncidentals = Number(folio.incidental_charges || 0) + totalAmount;
            const newTotal = Number(folio.total_amount || 0) + totalAmount;
            const newBalance = Number(folio.balance_due || 0) + totalAmount;

            await supabase.from('guest_folios').update({
              incidental_charges: newIncidentals,
              total_amount: newTotal,
              balance_due: newBalance,
            }).eq('id', folio.id);

            toast.success("Room service order created and posted to folio");
          } else {
            toast.success("Room service order created (no open folio found)");
          }
        } catch (folioErr) {
          console.error('Error posting to folio:', folioErr);
          toast.success("Room service order created (folio posting failed)");
        }
      } else {
        toast.success("Room service order created");
      }

      setOrderDialogOpen(false);
      setOrderForm({ guest_name: '', room_number: '', items: '', special_instructions: '', total_amount: '' });
    } catch (error: any) {
      toast.error("Error");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAmenity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLocation) return;
    setSaving(true);

    try {
      const { error } = await supabase.from('amenity_requests').insert({
        location_id: currentLocation.id,
        guest_name: amenityForm.guest_name,
        room_number: amenityForm.room_number || null,
        request_type: amenityForm.request_type,
        description: amenityForm.description || null,
        quantity: parseInt(amenityForm.quantity),
        priority: amenityForm.priority,
      });

      if (error) throw error;

      toast.success("Amenity request created");
      setAmenityDialogOpen(false);
      setAmenityForm({ guest_name: '', room_number: '', request_type: 'towels', description: '', quantity: '1', priority: 'normal' });
    } catch (error: any) {
      toast.error("Error");
    } finally {
      setSaving(false);
    }
  };

  const updateOrderStatus = async (id: string, status: string) => {
    const updates: Record<string, unknown> = { status };
    if (status === 'delivered') {
      updates.delivered_at = new Date().toISOString();
    }

    const { error } = await supabase.from('room_service_orders').update(updates).eq('id', id);
    if (error) toast.error("Error");
    else toast.success("Order status updated");
  };

  const updateAmenityStatus = async (id: string, status: string) => {
    const updates: Record<string, unknown> = { status };
    if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
    }

    const { error } = await supabase.from('amenity_requests').update(updates).eq('id', id);
    if (error) toast.error("Error");
    else toast.success("Request status updated");
  };

  const pendingOrders = roomServiceOrders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled');
  const pendingAmenities = amenityRequests.filter((r) => r.status !== 'completed' && r.status !== 'cancelled');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <FeatureGate feature="guest_services" requiredTier="Professional">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Guest Services</h1>
            <p className="text-muted-foreground">Room service and amenity requests</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Orders</p>
                  <p className="text-2xl font-bold">{pendingOrders.length}</p>
                </div>
                <UtensilsCrossed className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Amenities</p>
                  <p className="text-2xl font-bold">{pendingAmenities.length}</p>
                </div>
                <Sparkles className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today's Orders</p>
                  <p className="text-2xl font-bold">
                    {roomServiceOrders.filter((o) => new Date(o.created_at).toDateString() === new Date().toDateString()).length}
                  </p>
                </div>
                <Coffee className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">
                    ${roomServiceOrders.filter((o) => o.status === 'delivered').reduce((sum, o) => sum + o.total_amount, 0).toFixed(0)}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="room-service" className="gap-2">
                <UtensilsCrossed className="h-4 w-4" />
                Room Service
              </TabsTrigger>
              <TabsTrigger value="amenities" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Amenities
              </TabsTrigger>
            </TabsList>
            <div>
              {activeTab === 'room-service' ? (
                <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      New Order
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Room Service Order</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateOrder} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Guest Name *</Label>
                          <Input
                            value={orderForm.guest_name}
                            onChange={(e) => setOrderForm({ ...orderForm, guest_name: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Room Number</Label>
                          <Select
                            value={orderForm.room_number}
                            onValueChange={(v) => setOrderForm({ ...orderForm, room_number: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select room" />
                            </SelectTrigger>
                            <SelectContent>
                              {rooms.map((r) => (
                                <SelectItem key={r.id} value={r.room_number}>
                                  {r.room_number}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Items (one per line) *</Label>
                        <Textarea
                          value={orderForm.items}
                          onChange={(e) => setOrderForm({ ...orderForm, items: e.target.value })}
                          placeholder="Caesar Salad&#10;Grilled Salmon&#10;Chocolate Cake"
                          rows={4}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Special Instructions</Label>
                        <Input
                          value={orderForm.special_instructions}
                          onChange={(e) => setOrderForm({ ...orderForm, special_instructions: e.target.value })}
                          placeholder="Allergies, preferences..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Total Amount</Label>
                        <Input
                          type="number"
                          value={orderForm.total_amount}
                          onChange={(e) => setOrderForm({ ...orderForm, total_amount: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={saving}>
                        {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        Create Order
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              ) : (
                <Dialog open={amenityDialogOpen} onOpenChange={setAmenityDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      New Request
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Amenity Request</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateAmenity} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Guest Name *</Label>
                          <Input
                            value={amenityForm.guest_name}
                            onChange={(e) => setAmenityForm({ ...amenityForm, guest_name: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Room Number</Label>
                          <Select
                            value={amenityForm.room_number}
                            onValueChange={(v) => setAmenityForm({ ...amenityForm, room_number: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select room" />
                            </SelectTrigger>
                            <SelectContent>
                              {rooms.map((r) => (
                                <SelectItem key={r.id} value={r.room_number}>
                                  {r.room_number}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Request Type</Label>
                          <Select
                            value={amenityForm.request_type}
                            onValueChange={(v) => setAmenityForm({ ...amenityForm, request_type: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {amenityTypes.map((t) => (
                                <SelectItem key={t} value={t} className="capitalize">
                                  {t.replace('_', ' ')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            value={amenityForm.quantity}
                            onChange={(e) => setAmenityForm({ ...amenityForm, quantity: e.target.value })}
                            min="1"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Priority</Label>
                        <Select
                          value={amenityForm.priority}
                          onValueChange={(v) => setAmenityForm({ ...amenityForm, priority: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea
                          value={amenityForm.description}
                          onChange={(e) => setAmenityForm({ ...amenityForm, description: e.target.value })}
                          placeholder="Additional details..."
                          rows={2}
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={saving}>
                        {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        Create Request
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          <TabsContent value="room-service" className="mt-6">
            <div className="space-y-4">
              {roomServiceOrders.length === 0 ? (
                <Card className="border-border/50 bg-card/50">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <UtensilsCrossed className="w-12 h-12 mb-4" />
                    <p>No room service orders yet</p>
                  </CardContent>
                </Card>
              ) : (
                roomServiceOrders.map((order) => (
                  <Card key={order.id} className="border-border/50 bg-card/50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm text-muted-foreground">#{order.order_number}</span>
                            <Badge variant="outline" className={cn(statusColors[order.status])}>
                              {order.status}
                            </Badge>
                          </div>
                          <p className="font-semibold">{order.guest_name}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {order.room_number && (
                              <span className="flex items-center gap-1">
                                <BedDouble className="h-3 w-3" />
                                Room {order.room_number}
                              </span>
                            )}
                            <span>{format(new Date(order.created_at), 'h:mm a')}</span>
                          </div>
                          <div className="mt-2 text-sm">
                            {order.items.map((item: any, i: number) => (
                              <span key={i} className="text-muted-foreground">
                                {item.name}{i < order.items.length - 1 ? ', ' : ''}
                              </span>
                            ))}
                          </div>
                          {order.special_instructions && (
                            <p className="text-xs text-muted-foreground mt-1">Note: {order.special_instructions}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <p className="font-bold">${order.total_amount.toFixed(2)}</p>
                          <Select
                            value={order.status}
                            onValueChange={(v) => updateOrderStatus(order.id, v)}
                          >
                            <SelectTrigger className="w-28 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {orderStatuses.map((s) => (
                                <SelectItem key={s} value={s} className="capitalize text-xs">
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="amenities" className="mt-6">
            <div className="space-y-4">
              {amenityRequests.length === 0 ? (
                <Card className="border-border/50 bg-card/50">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Sparkles className="w-12 h-12 mb-4" />
                    <p>No amenity requests yet</p>
                  </CardContent>
                </Card>
              ) : (
                amenityRequests.map((request) => {
                  const Icon = amenityIcons[request.request_type] || Sparkles;
                  return (
                    <Card key={request.id} className="border-border/50 bg-card/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold capitalize">{request.request_type.replace('_', ' ')}</p>
                              <p className="text-sm text-muted-foreground">{request.guest_name}</p>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                {request.room_number && (
                                  <span className="flex items-center gap-1">
                                    <BedDouble className="h-3 w-3" />
                                    Room {request.room_number}
                                  </span>
                                )}
                                <span>Qty: {request.quantity}</span>
                                <span>{format(new Date(request.created_at), 'h:mm a')}</span>
                              </div>
                              {request.description && (
                                <p className="text-xs text-muted-foreground mt-1">{request.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant="outline" className={cn(statusColors[request.status])}>
                              {request.status.replace('_', ' ')}
                            </Badge>
                            <Select
                              value={request.status}
                              onValueChange={(v) => updateAmenityStatus(request.id, v)}
                            >
                              <SelectTrigger className="w-28 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {requestStatuses.map((s) => (
                                  <SelectItem key={s} value={s} className="capitalize text-xs">
                                    {s.replace('_', ' ')}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </FeatureGate>
  );
}
