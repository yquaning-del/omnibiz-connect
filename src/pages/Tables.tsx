import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { cn } from '@/lib/utils';
import { Loader2, Plus, UtensilsCrossed, Users, Clock, Edit, Trash2, LayoutGrid, Map, QrCode } from 'lucide-react';
import { FloorPlanEditor } from '@/components/restaurant/FloorPlanEditor';
import { QRCodeGenerator } from '@/components/restaurant/QRCodeGenerator';
import { toast } from 'sonner';

interface RestaurantTable {
  id: string;
  location_id: string;
  table_number: string;
  capacity: number;
  status: string;
  position_x: number;
  position_y: number;
  shape: string;
  notes: string | null;
}

const statusColors: Record<string, string> = {
  available: 'bg-success/20 text-success border-success/30',
  occupied: 'bg-destructive/20 text-destructive border-destructive/30',
  reserved: 'bg-warning/20 text-warning border-warning/30',
  cleaning: 'bg-info/20 text-info border-info/30',
};

const statusLabels: Record<string, string> = {
  available: 'Available',
  occupied: 'Occupied',
  reserved: 'Reserved',
  cleaning: 'Cleaning',
};

export default function Tables() {
  const { currentLocation, currentOrganization } = useAuth();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'floorplan'>('grid');

  // Form state
  const [tableNumber, setTableNumber] = useState('');
  const [capacity, setCapacity] = useState('4');
  const [shape, setShape] = useState('square');

  useEffect(() => {
    if (!currentLocation) return;
    fetchTables();
  }, [currentLocation]);

  const fetchTables = async () => {
    if (!currentLocation) return;

    const { data, error } = await supabase
      .from('restaurant_tables')
      .select('*')
      .eq('location_id', currentLocation.id)
      .order('table_number');

    if (error) {
      console.error('Error fetching tables:', error);
    } else {
      setTables(data as RestaurantTable[]);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setTableNumber('');
    setCapacity('4');
    setShape('square');
    setEditingTable(null);
  };

  const openEditDialog = (table: RestaurantTable) => {
    setEditingTable(table);
    setTableNumber(table.table_number);
    setCapacity(table.capacity.toString());
    setShape(table.shape);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLocation) return;

    setSaving(true);

    try {
      const tableData = {
        location_id: currentLocation.id,
        table_number: tableNumber.trim(),
        capacity: parseInt(capacity),
        shape,
      };

      if (editingTable) {
        const { error } = await supabase
          .from('restaurant_tables')
          .update(tableData)
          .eq('id', editingTable.id);

        if (error) throw error;
        toast.success("Table updated");
      } else {
        const { error } = await supabase
          .from('restaurant_tables')
          .insert(tableData);

        if (error) throw error;
        toast.success("Table created");
      }

      setDialogOpen(false);
      resetForm();
      fetchTables();
    } catch (error: any) {
      toast.error("Error");
    } finally {
      setSaving(false);
    }
  };

  const updateTableStatus = async (tableId: string, status: string) => {
    const { error } = await supabase
      .from('restaurant_tables')
      .update({ status })
      .eq('id', tableId);

    if (error) {
      toast.error("Error");
    } else {
      fetchTables();
    }
  };

  const deleteTable = async (table: RestaurantTable) => {
    const confirmed = await confirm({ title: `Delete table ${table.table_number}?`, description: 'This action cannot be undone.', variant: 'destructive', confirmLabel: 'Delete' }); if (!confirmed) return;

    const { error } = await supabase
      .from('restaurant_tables')
      .delete()
      .eq('id', table.id);

    if (error) {
      toast.error("Error");
    } else {
      toast.success("Table deleted");
      fetchTables();
    }
  };

  const stats = {
    total: tables.length,
    available: tables.filter(t => t.status === 'available').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleUpdatePositions = async (updates: { id: string; position_x: number; position_y: number }[]) => {
    try {
      for (const update of updates) {
        await supabase
          .from('restaurant_tables')
          .update({ position_x: update.position_x, position_y: update.position_y })
          .eq('id', update.id);
      }
      toast.success("Floor plan saved");
      fetchTables();
    } catch (error: any) {
      toast.error("Error");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <ConfirmDialog />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Table Management</h1>
          <p className="text-muted-foreground">Manage restaurant floor plan and table status</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'floorplan')}>
            <TabsList>
              <TabsTrigger value="grid" className="gap-2">
                <LayoutGrid className="h-4 w-4" />
                Grid
              </TabsTrigger>
              <TabsTrigger value="floorplan" className="gap-2">
                <Map className="h-4 w-4" />
                Floor Plan
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Table
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingTable ? 'Edit Table' : 'Add New Table'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Table Number / Name</Label>
                <Input
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="e.g., T1, A1, Patio 1"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Capacity</Label>
                  <Select value={capacity} onValueChange={setCapacity}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2, 4, 6, 8, 10, 12].map(n => (
                        <SelectItem key={n} value={n.toString()}>{n} seats</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Shape</Label>
                  <Select value={shape} onValueChange={setShape}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="square">Square</SelectItem>
                      <SelectItem value="round">Round</SelectItem>
                      <SelectItem value="rectangle">Rectangle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingTable ? 'Update Table' : 'Create Table'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tables</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <UtensilsCrossed className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-2xl font-bold text-success">{stats.available}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-success/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Occupied</p>
                <p className="text-2xl font-bold text-destructive">{stats.occupied}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-destructive/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reserved</p>
                <p className="text-2xl font-bold text-warning">{stats.reserved}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-warning/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floor Plan View */}
      {viewMode === 'floorplan' && (
        <FloorPlanEditor
          tables={tables}
          onUpdatePositions={handleUpdatePositions}
          onTableClick={(table) => {
            const fullTable = tables.find(t => t.id === table.id);
            if (fullTable) openEditDialog(fullTable);
          }}
        />
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-lg">Tables</CardTitle>
        </CardHeader>
        <CardContent>
          {tables.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UtensilsCrossed className="w-12 h-12 mx-auto mb-4" />
              <p>No tables configured</p>
              <p className="text-sm">Add your first table to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {tables.map(table => (
                <div
                  key={table.id}
                  className={cn(
                    'relative p-4 rounded-xl border-2 transition-all cursor-pointer',
                    'hover:shadow-lg hover:scale-105',
                    table.shape === 'round' && 'rounded-full aspect-square flex flex-col items-center justify-center',
                    table.status === 'available' && 'border-success/50 bg-success/5',
                    table.status === 'occupied' && 'border-destructive/50 bg-destructive/5',
                    table.status === 'reserved' && 'border-warning/50 bg-warning/5',
                    table.status === 'cleaning' && 'border-info/50 bg-info/5',
                  )}
                >
                  <div className="text-center">
                    <p className="font-bold text-lg text-foreground">{table.table_number}</p>
                    <div className="flex items-center justify-center gap-1 text-muted-foreground text-sm mt-1">
                      <Users className="w-3 h-3" />
                      <span>{table.capacity}</span>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn('mt-2 text-xs', statusColors[table.status])}
                    >
                      {statusLabels[table.status]}
                    </Badge>
                  </div>

                  {/* Quick actions */}
                  <div className="absolute -top-2 -right-2 flex gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6 rounded-full bg-background"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(table);
                      }}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* Status buttons */}
                  <div className="mt-3 flex flex-wrap gap-1 justify-center">
                    {['available', 'occupied', 'reserved', 'cleaning'].map(status => (
                      table.status !== status && (
                        <button
                          key={status}
                          onClick={() => updateTableStatus(table.id, status)}
                          className={cn(
                            'px-2 py-0.5 rounded text-xs transition-colors',
                            statusColors[status]
                          )}
                        >
                          {status.charAt(0).toUpperCase()}
                        </button>
                      )
                    ))}
                  </div>
                  
                  {/* QR Code Button */}
                  {currentOrganization && (
                    <div className="mt-2">
                      <QRCodeGenerator
                        tableId={table.id}
                        tableNumber={table.table_number}
                        locationId={currentLocation!.id}
                        organizationSlug={currentOrganization.slug}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {Object.entries(statusLabels).map(([status, label]) => (
          <div key={status} className="flex items-center gap-2">
            <div className={cn('w-4 h-4 rounded', statusColors[status].split(' ')[0])} />
            <span className="text-sm text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
