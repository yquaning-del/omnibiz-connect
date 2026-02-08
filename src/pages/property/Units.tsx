import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { 
  Building2, 
  Plus, 
  Search,
  BedDouble,
  Bath,
  SquareIcon,
  DollarSign,
  Users,
  Filter,
  MapPin,
  ImageIcon,
  Pencil,
  Trash2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { LEASE_COUNTRIES, getStatesForCountry, getCitiesForCountry } from '@/lib/leaseLocations';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { UnitPhotosManager } from '@/components/property/UnitPhotosManager';

interface PropertyUnit {
  id: string;
  unit_number: string;
  unit_type: string;
  floor: number | null;
  square_footage: number | null;
  bedrooms: number;
  bathrooms: number;
  monthly_rent: number;
  security_deposit: number;
  status: string;
  amenities: string[];
  notes: string | null;
  current_tenant_id: string | null;
  photos: string[];
}

const unitTypes = ['studio', 'apartment', '1br', '2br', '3br', 'penthouse', 'townhouse'];
const statusColors: Record<string, string> = {
  available: 'bg-success/20 text-success border-success/30',
  occupied: 'bg-info/20 text-info border-info/30',
  reserved: 'bg-warning/20 text-warning border-warning/30',
  maintenance: 'bg-destructive/20 text-destructive border-destructive/30',
  renovation: 'bg-muted text-muted-foreground border-muted',
};

export default function Units() {
  const { currentOrganization, currentLocation } = useAuth();
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [units, setUnits] = useState<PropertyUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<PropertyUnit | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    unit_number: '',
    unit_type: 'apartment',
    floor: '',
    square_footage: '',
    bedrooms: '1',
    bathrooms: '1',
    monthly_rent: '',
    security_deposit: '',
    notes: '',
    // Location fields
    address: '',
    city: '',
    state: '',
    country: 'US',
  });

  const states = getStatesForCountry(formData.country);
  const cities = getCitiesForCountry(formData.country);
  const selectedCountry = LEASE_COUNTRIES.find(c => c.code === formData.country);

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchUnits();
    }
  }, [currentOrganization?.id]);

  const fetchUnits = async () => {
    if (!currentOrganization?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('property_units')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('unit_number', { ascending: true });

      if (error) throw error;
      setUnits(data || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading units',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization?.id) return;

    setSaving(true);
    try {
      if (editingUnit) {
        // Update existing unit
        const { error } = await (supabase as any)
          .from('property_units')
          .update({
            unit_number: formData.unit_number,
            unit_type: formData.unit_type,
            floor: formData.floor ? parseInt(formData.floor) : null,
            square_footage: formData.square_footage ? parseFloat(formData.square_footage) : null,
            bedrooms: parseInt(formData.bedrooms),
            bathrooms: parseFloat(formData.bathrooms),
            monthly_rent: parseFloat(formData.monthly_rent) || 0,
            security_deposit: parseFloat(formData.security_deposit) || 0,
            notes: formData.notes || null,
            // Location fields
            address: formData.address || null,
            city: formData.city || null,
            state: formData.state || null,
            country: formData.country || 'US',
          })
          .eq('id', editingUnit.id);

        if (error) throw error;

        toast({
          title: 'Unit updated',
          description: `Unit ${formData.unit_number} has been updated successfully.`,
        });

        setEditDialogOpen(false);
        setEditingUnit(null);
      } else {
        // Create new unit
        const { error } = await (supabase as any)
          .from('property_units')
          .insert({
            organization_id: currentOrganization.id,
            location_id: currentLocation?.id || null,
            unit_number: formData.unit_number,
            unit_type: formData.unit_type,
            floor: formData.floor ? parseInt(formData.floor) : null,
            square_footage: formData.square_footage ? parseFloat(formData.square_footage) : null,
            bedrooms: parseInt(formData.bedrooms),
            bathrooms: parseFloat(formData.bathrooms),
            monthly_rent: parseFloat(formData.monthly_rent) || 0,
            security_deposit: parseFloat(formData.security_deposit) || 0,
            notes: formData.notes || null,
            status: 'available',
            // Location fields
            address: formData.address || null,
            city: formData.city || null,
            state: formData.state || null,
            country: formData.country || 'US',
          });

        if (error) throw error;

        toast({
          title: 'Unit added',
          description: `Unit ${formData.unit_number} has been added successfully.`,
        });

        setIsDialogOpen(false);
      }

      setFormData({
        unit_number: '',
        unit_type: 'apartment',
        floor: '',
        square_footage: '',
        bedrooms: '1',
        bathrooms: '1',
        monthly_rent: '',
        security_deposit: '',
        notes: '',
        address: '',
        city: '',
        state: '',
        country: 'US',
      });
      fetchUnits();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: editingUnit ? 'Error updating unit' : 'Error adding unit',
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (unit: PropertyUnit) => {
    setEditingUnit(unit);
    setFormData({
      unit_number: unit.unit_number,
      unit_type: unit.unit_type,
      floor: unit.floor?.toString() || '',
      square_footage: unit.square_footage?.toString() || '',
      bedrooms: unit.bedrooms.toString(),
      bathrooms: unit.bathrooms.toString(),
      monthly_rent: unit.monthly_rent.toString(),
      security_deposit: unit.security_deposit.toString(),
      notes: unit.notes || '',
      address: (unit as any).address || '',
      city: (unit as any).city || '',
      state: (unit as any).state || '',
      country: (unit as any).country || 'US',
    });
    setEditDialogOpen(true);
  };

  const handleDelete = async (unit: PropertyUnit) => {
    const confirmed = await confirm({ title: `Delete Unit ${unit.unit_number}?`, description: 'This action cannot be undone.', variant: 'destructive', confirmLabel: 'Delete' });
    if (!confirmed) {
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from('property_units')
        .delete()
        .eq('id', unit.id);

      if (error) throw error;

      toast({
        title: 'Unit deleted',
        description: `Unit ${unit.unit_number} has been deleted successfully.`,
      });

      fetchUnits();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error deleting unit',
        description: error.message,
      });
    }
  };

  const filteredUnits = units.filter(unit => {
    const matchesSearch = unit.unit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.unit_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || unit.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: units.length,
    available: units.filter(u => u.status === 'available').length,
    occupied: units.filter(u => u.status === 'occupied').length,
    maintenance: units.filter(u => u.status === 'maintenance').length,
  };

  return (
    <PermissionGate permission="property.units">
    <div className="space-y-6 animate-fade-in">
      <ConfirmDialog />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Units</h1>
          <p className="text-muted-foreground">Manage your property units</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Unit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Unit</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit_number">Unit Number *</Label>
                  <Input
                    id="unit_number"
                    value={formData.unit_number}
                    onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
                    placeholder="e.g., 101, A1"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit_type">Type</Label>
                  <Select value={formData.unit_type} onValueChange={(v) => setFormData({ ...formData, unit_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {unitTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bedrooms">Bedrooms</Label>
                  <Input
                    id="bedrooms"
                    type="number"
                    min="0"
                    value={formData.bedrooms}
                    onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bathrooms">Bathrooms</Label>
                  <Input
                    id="bathrooms"
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.bathrooms}
                    onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="floor">Floor</Label>
                  <Input
                    id="floor"
                    type="number"
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthly_rent">Monthly Rent *</Label>
                  <Input
                    id="monthly_rent"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.monthly_rent}
                    onChange={(e) => setFormData({ ...formData, monthly_rent: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="security_deposit">Security Deposit</Label>
                  <Input
                    id="security_deposit"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.security_deposit}
                    onChange={(e) => setFormData({ ...formData, security_deposit: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="square_footage">Square Footage</Label>
                <Input
                  id="square_footage"
                  type="number"
                  min="0"
                  value={formData.square_footage}
                  onChange={(e) => setFormData({ ...formData, square_footage: e.target.value })}
                  placeholder="e.g., 750"
                />
              </div>

              {/* Location Section */}
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-property" />
                  <Label className="font-medium">Unit Location</Label>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="123 Main Street, Apt 101"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Select 
                        value={formData.country} 
                        onValueChange={(v) => setFormData({ ...formData, country: v, state: '', city: '' })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background">
                          {LEASE_COUNTRIES.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedCountry?.requiresState && states.length > 0 ? (
                      <div className="space-y-2">
                        <Label htmlFor="state">{formData.country === 'CA' ? 'Province' : 'State'}</Label>
                        <Select 
                          value={formData.state} 
                          onValueChange={(v) => setFormData({ ...formData, state: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent className="bg-background max-h-[200px]">
                            {states.map((state) => (
                              <SelectItem key={state.code} value={state.code}>
                                {state.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : selectedCountry?.requiresCity && cities.length > 0 ? (
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Select 
                          value={formData.city} 
                          onValueChange={(v) => setFormData({ ...formData, city: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent className="bg-background max-h-[200px]">
                            {cities.map((city) => (
                              <SelectItem key={city.name} value={city.name}>
                                {city.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          placeholder="City name"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes about this unit..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Adding...' : 'Add Unit'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Unit</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_unit_number">Unit Number *</Label>
                  <Input
                    id="edit_unit_number"
                    value={formData.unit_number}
                    onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
                    placeholder="e.g., 101, A1"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_unit_type">Type</Label>
                  <Select value={formData.unit_type} onValueChange={(v) => setFormData({ ...formData, unit_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {unitTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_bedrooms">Bedrooms</Label>
                  <Input
                    id="edit_bedrooms"
                    type="number"
                    min="0"
                    value={formData.bedrooms}
                    onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_bathrooms">Bathrooms</Label>
                  <Input
                    id="edit_bathrooms"
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.bathrooms}
                    onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_floor">Floor</Label>
                  <Input
                    id="edit_floor"
                    type="number"
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_monthly_rent">Monthly Rent *</Label>
                  <Input
                    id="edit_monthly_rent"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.monthly_rent}
                    onChange={(e) => setFormData({ ...formData, monthly_rent: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_security_deposit">Security Deposit</Label>
                  <Input
                    id="edit_security_deposit"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.security_deposit}
                    onChange={(e) => setFormData({ ...formData, security_deposit: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_square_footage">Square Footage</Label>
                <Input
                  id="edit_square_footage"
                  type="number"
                  min="0"
                  value={formData.square_footage}
                  onChange={(e) => setFormData({ ...formData, square_footage: e.target.value })}
                  placeholder="e.g., 750"
                />
              </div>

              {/* Location Section */}
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-property" />
                  <Label className="font-medium">Unit Location</Label>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_address">Address</Label>
                    <Input
                      id="edit_address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="123 Main Street, Apt 101"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit_country">Country</Label>
                      <Select 
                        value={formData.country} 
                        onValueChange={(v) => setFormData({ ...formData, country: v, state: '', city: '' })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background">
                          {LEASE_COUNTRIES.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedCountry?.requiresState && states.length > 0 ? (
                      <div className="space-y-2">
                        <Label htmlFor="edit_state">{formData.country === 'CA' ? 'Province' : 'State'}</Label>
                        <Select 
                          value={formData.state} 
                          onValueChange={(v) => setFormData({ ...formData, state: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent className="bg-background max-h-[200px]">
                            {states.map((state) => (
                              <SelectItem key={state.code} value={state.code}>
                                {state.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : selectedCountry?.requiresCity && cities.length > 0 ? (
                      <div className="space-y-2">
                        <Label htmlFor="edit_city">City</Label>
                        <Select 
                          value={formData.city} 
                          onValueChange={(v) => setFormData({ ...formData, city: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent className="bg-background max-h-[200px]">
                            {cities.map((city) => (
                              <SelectItem key={city.name} value={city.name}>
                                {city.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="edit_city">City</Label>
                        <Input
                          id="edit_city"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          placeholder="City name"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_notes">Notes</Label>
                <Textarea
                  id="edit_notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes about this unit..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => {
                  setEditDialogOpen(false);
                  setEditingUnit(null);
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Updating...' : 'Update Unit'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-property/30 bg-property/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Units</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Building2 className="h-8 w-8 text-property" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-success/30 bg-success/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-2xl font-bold text-success">{stats.available}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-info/30 bg-info/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Occupied</p>
                <p className="text-2xl font-bold text-info">{stats.occupied}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Maintenance</p>
                <p className="text-2xl font-bold text-warning">{stats.maintenance}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search units..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="occupied">Occupied</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Units Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-muted rounded w-1/3 mb-4" />
                <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredUnits.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No units found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Get started by adding your first unit'}
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Unit
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredUnits.map((unit) => (
            <Card key={unit.id} className="hover:border-property/50 transition-colors cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Unit {unit.unit_number}</h3>
                    <p className="text-sm text-muted-foreground capitalize">{unit.unit_type}</p>
                  </div>
                  <Badge className={statusColors[unit.status] || 'bg-muted'}>
                    {unit.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="flex items-center gap-1.5 text-sm">
                    <BedDouble className="h-4 w-4 text-muted-foreground" />
                    <span>{unit.bedrooms} bed</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Bath className="h-4 w-4 text-muted-foreground" />
                    <span>{unit.bathrooms} bath</span>
                  </div>
                  {unit.square_footage && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <SquareIcon className="h-4 w-4 text-muted-foreground" />
                      <span>{unit.square_footage} sqft</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-property" />
                    <span className="font-semibold">{formatCurrency(unit.monthly_rent)}</span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(unit);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(unit);
                      }}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <UnitPhotosManager
                      unitId={unit.id}
                      unitNumber={unit.unit_number}
                      photos={unit.photos || []}
                      onPhotosChange={(photos) => {
                        setUnits(prev => prev.map(u => 
                          u.id === unit.id ? { ...u, photos } : u
                        ));
                      }}
                    />
                    {unit.floor && (
                      <span className="text-sm text-muted-foreground">Floor {unit.floor}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
    </PermissionGate>
  );
}