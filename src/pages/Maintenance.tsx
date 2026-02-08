import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Loader2,
  Plus,
  Wrench,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  DollarSign,
  BedDouble,
  User,
  Filter,
} from 'lucide-react';
import { FeatureGate } from '@/components/subscription/FeatureGate';

interface MaintenanceRequest {
  id: string;
  location_id: string;
  room_id: string | null;
  reported_by: string | null;
  assigned_to: string | null;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  estimated_cost: number;
  actual_cost: number;
  scheduled_date: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  room?: { room_number: string };
  assignee?: { full_name: string };
}

interface HotelRoom {
  id: string;
  room_number: string;
}

interface StaffMember {
  id: string;
  full_name: string;
}

const categories = ['plumbing', 'electrical', 'hvac', 'furniture', 'appliance', 'structural', 'general'];
const priorities = ['low', 'normal', 'high', 'urgent'];
const statuses = ['open', 'in_progress', 'on_hold', 'completed', 'cancelled'];

const statusColors: Record<string, string> = {
  open: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  in_progress: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  on_hold: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  completed: 'bg-green-500/10 text-green-500 border-green-500/20',
  cancelled: 'bg-muted text-muted-foreground border-muted',
};

const priorityColors: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  normal: 'bg-blue-500/10 text-blue-500',
  high: 'bg-orange-500/10 text-orange-500',
  urgent: 'bg-red-500/10 text-red-500',
};

export default function Maintenance() {
  const { currentLocation } = useAuth();
  const { toast } = useToast();

  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  // Form state
  const [formData, setFormData] = useState({
    room_id: '',
    assigned_to: '',
    title: '',
    description: '',
    category: 'general',
    priority: 'normal',
    estimated_cost: '',
  });

  useEffect(() => {
    if (currentLocation) {
      fetchData();
      const cleanup = subscribeToRequests();
      return cleanup;
    }
  }, [currentLocation]);

  const fetchData = async () => {
    if (!currentLocation) return;
    setLoading(true);

    const [requestsRes, roomsRes, staffRes] = await Promise.all([
      supabase
        .from('maintenance_requests')
        .select('*')
        .eq('location_id', currentLocation.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('hotel_rooms')
        .select('id, room_number')
        .eq('location_id', currentLocation.id),
      supabase
        .from('user_roles')
        .select('user_id, profiles:user_id(id, full_name)')
        .eq('organization_id', currentLocation.organization_id),
    ]);

    // Build staff lookup from org-scoped user_roles
    const staffList = (staffRes.data || [])
      .filter((s: any) => s.profiles)
      .map((s: any) => ({
        id: s.profiles.id ?? s.user_id,
        full_name: s.profiles.full_name ?? '',
      }));

    if (requestsRes.data) {
      const enriched = requestsRes.data.map((req: any) => {
        const room = roomsRes.data?.find((r: any) => r.id === req.room_id);
        const assignee = staffList.find((s: any) => s.id === req.assigned_to);
        return {
          ...req,
          title: req.title ?? '',
          category: req.category ?? 'general',
          priority: req.priority ?? 'normal',
          status: req.status ?? 'open',
          estimated_cost: req.estimated_cost ?? 0,
          actual_cost: req.actual_cost ?? 0,
          room: room ? { room_number: room.room_number ?? '' } : undefined,
          assignee: assignee ? { full_name: assignee.full_name ?? '' } : undefined,
        };
      });
      setRequests(enriched);
    }
    if (roomsRes.data) setRooms(roomsRes.data.map((r: any) => ({
      ...r,
      room_number: r.room_number ?? '',
    })));
    setStaff(staffList);

    setLoading(false);
  };

  const subscribeToRequests = () => {
    if (!currentLocation) return;

    const channel = supabase
      .channel('maintenance-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_requests',
          filter: `location_id=eq.${currentLocation.id}`,
        },
        () => fetchData()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLocation) return;
    setSaving(true);

    try {
      const { error } = await supabase.from('maintenance_requests').insert({
        location_id: currentLocation.id,
        room_id: formData.room_id || null,
        assigned_to: formData.assigned_to || null,
        title: formData.title,
        description: formData.description || null,
        category: formData.category,
        priority: formData.priority,
        estimated_cost: parseFloat(formData.estimated_cost) || 0,
      });

      if (error) throw error;

      toast({ title: 'Maintenance request created' });
      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const updates: Record<string, unknown> = { status };
    if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('maintenance_requests')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Status updated' });
    }
  };

  const resetForm = () => {
    setFormData({
      room_id: '',
      assigned_to: '',
      title: '',
      description: '',
      category: 'general',
      priority: 'normal',
      estimated_cost: '',
    });
  };

  const filteredRequests = requests.filter((req) => {
    if (filterStatus !== 'all' && req.status !== filterStatus) return false;
    if (filterCategory !== 'all' && req.category !== filterCategory) return false;
    return true;
  });

  const stats = {
    open: requests.filter((r) => r.status === 'open').length,
    inProgress: requests.filter((r) => r.status === 'in_progress').length,
    completed: requests.filter((r) => r.status === 'completed').length,
    total: requests.length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <FeatureGate feature="maintenance_tracking" requiredTier="Professional">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Maintenance</h1>
            <p className="text-muted-foreground">Track and manage maintenance work orders</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Maintenance Request</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Brief description of the issue"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Room</Label>
                    <Select
                      value={formData.room_id}
                      onValueChange={(v) => setFormData({ ...formData, room_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select room" />
                      </SelectTrigger>
                      <SelectContent>
                        {rooms.map((room) => (
                          <SelectItem key={room.id} value={room.id}>
                            Room {room.room_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(v) => setFormData({ ...formData, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat} className="capitalize">
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(v) => setFormData({ ...formData, priority: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priorities.map((p) => (
                          <SelectItem key={p} value={p} className="capitalize">
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Assign To</Label>
                    <Select
                      value={formData.assigned_to}
                      onValueChange={(v) => setFormData({ ...formData, assigned_to: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select staff" />
                      </SelectTrigger>
                      <SelectContent>
                        {staff.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Estimated Cost</Label>
                  <Input
                    type="number"
                    value={formData.estimated_cost}
                    onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Detailed description of the issue..."
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Create Request
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Open</p>
                  <p className="text-2xl font-bold">{stats.open}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <p className="text-2xl font-bold">{stats.inProgress}</p>
                </div>
                <Wrench className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{stats.completed}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c} className="capitalize">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Requests List */}
        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <Card className="border-border/50 bg-card/50">
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Wrench className="w-12 h-12 mb-4" />
                <p>No maintenance requests found</p>
              </CardContent>
            </Card>
          ) : (
            filteredRequests.map((req) => (
              <Card key={req.id} className="border-border/50 bg-card/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{req.title}</h3>
                        <Badge variant="outline" className={cn(priorityColors[req.priority], 'text-xs')}>
                          {req.priority}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        {req.room && (
                          <span className="flex items-center gap-1">
                            <BedDouble className="h-3 w-3" />
                            Room {req.room.room_number}
                          </span>
                        )}
                        <span className="capitalize">{req.category}</span>
                        <span>{format(new Date(req.created_at), 'MMM d, yyyy')}</span>
                      </div>
                      {req.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{req.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {req.assignee && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {req.assignee.full_name}
                          </span>
                        )}
                        {req.estimated_cost > 0 && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            Est. ${req.estimated_cost.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="outline" className={cn(statusColors[req.status])}>
                        {req.status.replace('_', ' ')}
                      </Badge>
                      <Select
                        value={req.status}
                        onValueChange={(v) => updateStatus(req.id, v)}
                      >
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map((s) => (
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
            ))
          )}
        </div>
      </div>
    </FeatureGate>
  );
}
