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
  Building2,
  User,
  Filter,
} from 'lucide-react';

interface MaintenanceRequest {
  id: string;
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
  unit_id: string | null;
  unit?: { unit_number: string };
  assignee?: { full_name: string };
}

interface PropertyUnit {
  id: string;
  unit_number: string;
}

interface StaffMember {
  id: string;
  full_name: string;
}

const categories = ['plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'pest_control', 'general'];
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

export default function PropertyMaintenance() {
  const { currentOrganization } = useAuth();
  const { toast } = useToast();

  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [units, setUnits] = useState<PropertyUnit[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  const [formData, setFormData] = useState({
    unit_id: '',
    assigned_to: '',
    title: '',
    description: '',
    category: 'general',
    priority: 'normal',
    estimated_cost: '',
  });

  useEffect(() => {
    if (currentOrganization) {
      fetchData();
    }
  }, [currentOrganization]);

  const fetchData = async () => {
    if (!currentOrganization) return;
    setLoading(true);

    try {
      const [unitsRes, staffRes] = await Promise.all([
        supabase
          .from('property_units' as any)
          .select('id, unit_number')
          .eq('organization_id', currentOrganization.id),
        supabase.from('profiles').select('id, full_name'),
      ]);

      if (unitsRes.data) setUnits(unitsRes.data as unknown as PropertyUnit[]);
      if (staffRes.data) setStaff(staffRes.data);

      // For now, we'll store maintenance in a simple local state
      // In production, this would query a property_maintenance table
      setRequests([]);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization) return;
    setSaving(true);

    try {
      // Create a new maintenance request locally
      const newRequest: MaintenanceRequest = {
        id: crypto.randomUUID(),
        title: formData.title,
        description: formData.description || null,
        category: formData.category,
        priority: formData.priority,
        status: 'open',
        estimated_cost: parseFloat(formData.estimated_cost) || 0,
        actual_cost: 0,
        scheduled_date: null,
        completed_at: null,
        notes: null,
        created_at: new Date().toISOString(),
        unit_id: formData.unit_id || null,
        unit: units.find(u => u.id === formData.unit_id),
        assignee: staff.find(s => s.id === formData.assigned_to),
      };

      setRequests(prev => [newRequest, ...prev]);
      toast({ title: 'Maintenance request created' });
      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = (id: string, status: string) => {
    setRequests(prev =>
      prev.map(req =>
        req.id === id
          ? { ...req, status, completed_at: status === 'completed' ? new Date().toISOString() : null }
          : req
      )
    );
    toast({ title: 'Status updated' });
  };

  const resetForm = () => {
    setFormData({
      unit_id: '',
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Property Maintenance</h1>
          <p className="text-muted-foreground">Track and manage maintenance work orders for your properties</p>
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
                  <Label>Unit</Label>
                  <Select
                    value={formData.unit_id}
                    onValueChange={(v) => setFormData({ ...formData, unit_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          Unit {unit.unit_number}
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
                          {cat.replace('_', ' ')}
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
                {c.replace('_', ' ')}
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
              <p className="text-sm mt-1">Create a new request to get started</p>
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
                      {req.unit && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          Unit {req.unit.unit_number}
                        </span>
                      )}
                      <span className="capitalize">{req.category.replace('_', ' ')}</span>
                      {req.assignee && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {req.assignee.full_name}
                        </span>
                      )}
                    </div>
                    {req.description && (
                      <p className="text-sm text-muted-foreground">{req.description}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="outline" className={cn(statusColors[req.status], 'text-xs')}>
                      {req.status.replace('_', ' ')}
                    </Badge>
                    <Select value={req.status} onValueChange={(v) => updateStatus(req.id, v)}>
                      <SelectTrigger className="h-8 w-32 text-xs">
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
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
                  <span>Created {format(new Date(req.created_at), 'MMM d, yyyy')}</span>
                  {req.completed_at && (
                    <span>Completed {format(new Date(req.completed_at), 'MMM d, yyyy')}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
