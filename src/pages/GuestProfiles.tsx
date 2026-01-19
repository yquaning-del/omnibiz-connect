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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Loader2,
  Plus,
  Search,
  User,
  Crown,
  Star,
  BedDouble,
  Calendar,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  Edit,
  Award,
} from 'lucide-react';
import { FeatureGate } from '@/components/subscription/FeatureGate';

interface Customer {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  loyalty_points: number;
}

interface GuestProfile {
  id: string;
  customer_id: string | null;
  loyalty_tier: string;
  total_stays: number;
  total_nights: number;
  total_spent: number;
  preferences: any;
  room_preferences: string[];
  dietary_restrictions: string[];
  special_requests: string | null;
  id_type: string | null;
  id_number: string | null;
  nationality: string | null;
  vip_status: boolean;
  notes: string | null;
  customer?: Customer;
}

const loyaltyTiers = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];

const tierColors: Record<string, string> = {
  bronze: 'bg-amber-700/10 text-amber-700 border-amber-700/20',
  silver: 'bg-gray-400/10 text-gray-500 border-gray-400/20',
  gold: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  platinum: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  diamond: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
};

const tierIcons: Record<string, typeof Star> = {
  bronze: Star,
  silver: Star,
  gold: Crown,
  platinum: Crown,
  diamond: Award,
};

export default function GuestProfiles() {
  const { currentOrganization } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<GuestProfile[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<GuestProfile | null>(null);

  const [formData, setFormData] = useState({
    customer_id: '',
    loyalty_tier: 'bronze',
    room_preferences: '',
    dietary_restrictions: '',
    special_requests: '',
    id_type: '',
    id_number: '',
    nationality: '',
    vip_status: false,
    notes: '',
  });

  useEffect(() => {
    if (currentOrganization) {
      fetchData();
    }
  }, [currentOrganization]);

  const fetchData = async () => {
    if (!currentOrganization) return;
    setLoading(true);

    const [profilesRes, customersRes] = await Promise.all([
      supabase
        .from('guest_profiles')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('total_spent', { ascending: false }),
      supabase
        .from('customers')
        .select('*')
        .eq('organization_id', currentOrganization.id),
    ]);

    if (profilesRes.data && customersRes.data) {
      const enriched = profilesRes.data.map((profile: any) => ({
        ...profile,
        customer: customersRes.data.find((c: any) => c.id === profile.customer_id),
      }));
      setProfiles(enriched);
    }
    if (customersRes.data) setCustomers(customersRes.data as Customer[]);

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization) return;
    setSaving(true);

    try {
      const data = {
        organization_id: currentOrganization.id,
        customer_id: formData.customer_id || null,
        loyalty_tier: formData.loyalty_tier,
        room_preferences: formData.room_preferences.split(',').map((s) => s.trim()).filter(Boolean),
        dietary_restrictions: formData.dietary_restrictions.split(',').map((s) => s.trim()).filter(Boolean),
        special_requests: formData.special_requests || null,
        id_type: formData.id_type || null,
        id_number: formData.id_number || null,
        nationality: formData.nationality || null,
        vip_status: formData.vip_status,
        notes: formData.notes || null,
      };

      if (selectedProfile) {
        const { error } = await supabase
          .from('guest_profiles')
          .update(data)
          .eq('id', selectedProfile.id);
        if (error) throw error;
        toast({ title: 'Profile updated' });
      } else {
        const { error } = await supabase.from('guest_profiles').insert(data);
        if (error) throw error;
        toast({ title: 'Profile created' });
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedProfile(null);
    setFormData({
      customer_id: '',
      loyalty_tier: 'bronze',
      room_preferences: '',
      dietary_restrictions: '',
      special_requests: '',
      id_type: '',
      id_number: '',
      nationality: '',
      vip_status: false,
      notes: '',
    });
  };

  const openEditDialog = (profile: GuestProfile) => {
    setSelectedProfile(profile);
    setFormData({
      customer_id: profile.customer_id || '',
      loyalty_tier: profile.loyalty_tier,
      room_preferences: profile.room_preferences?.join(', ') || '',
      dietary_restrictions: profile.dietary_restrictions?.join(', ') || '',
      special_requests: profile.special_requests || '',
      id_type: profile.id_type || '',
      id_number: profile.id_number || '',
      nationality: profile.nationality || '',
      vip_status: profile.vip_status,
      notes: profile.notes || '',
    });
    setDialogOpen(true);
  };

  const filteredProfiles = profiles.filter((p) =>
    p.customer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.customer?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: profiles.length,
    vip: profiles.filter((p) => p.vip_status).length,
    gold: profiles.filter((p) => ['gold', 'platinum', 'diamond'].includes(p.loyalty_tier)).length,
    totalRevenue: profiles.reduce((sum, p) => sum + (p.total_spent || 0), 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <FeatureGate feature="guest_profiles" requiredTier="Professional">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Guest Profiles</h1>
            <p className="text-muted-foreground">Manage guest preferences and loyalty</p>
          </div>
          <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search guests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Profile
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{selectedProfile ? 'Edit' : 'Create'} Guest Profile</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Link to Customer</Label>
                  <Select
                    value={formData.customer_id}
                    onValueChange={(v) => setFormData({ ...formData, customer_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.full_name} {c.email && `(${c.email})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Loyalty Tier</Label>
                    <Select
                      value={formData.loyalty_tier}
                      onValueChange={(v) => setFormData({ ...formData, loyalty_tier: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {loyaltyTiers.map((t) => (
                          <SelectItem key={t} value={t} className="capitalize">
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>VIP Status</Label>
                    <Select
                      value={formData.vip_status ? 'yes' : 'no'}
                      onValueChange={(v) => setFormData({ ...formData, vip_status: v === 'yes' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="yes">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ID Type</Label>
                    <Select
                      value={formData.id_type}
                      onValueChange={(v) => setFormData({ ...formData, id_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="passport">Passport</SelectItem>
                        <SelectItem value="drivers_license">Driver's License</SelectItem>
                        <SelectItem value="national_id">National ID</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>ID Number</Label>
                    <Input
                      value={formData.id_number}
                      onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Nationality</Label>
                  <Input
                    value={formData.nationality}
                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Room Preferences (comma-separated)</Label>
                  <Input
                    value={formData.room_preferences}
                    onChange={(e) => setFormData({ ...formData, room_preferences: e.target.value })}
                    placeholder="High floor, King bed, City view"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Dietary Restrictions (comma-separated)</Label>
                  <Input
                    value={formData.dietary_restrictions}
                    onChange={(e) => setFormData({ ...formData, dietary_restrictions: e.target.value })}
                    placeholder="Vegetarian, Gluten-free"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Special Requests</Label>
                  <Textarea
                    value={formData.special_requests}
                    onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {selectedProfile ? 'Update' : 'Create'} Profile
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Guests</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <User className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">VIP Guests</p>
                <p className="text-2xl font-bold">{stats.vip}</p>
              </div>
              <Crown className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gold+ Tier</p>
                <p className="text-2xl font-bold">{stats.gold}</p>
              </div>
              <Star className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lifetime Revenue</p>
                <p className="text-2xl font-bold">${(stats.totalRevenue / 1000).toFixed(1)}k</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profiles Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProfiles.length === 0 ? (
          <Card className="col-span-full border-border/50 bg-card/50">
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <User className="w-12 h-12 mb-4" />
              <p>No guest profiles found</p>
            </CardContent>
          </Card>
        ) : (
          filteredProfiles.map((profile) => {
            const TierIcon = tierIcons[profile.loyalty_tier] || Star;
            return (
              <Card key={profile.id} className="border-border/50 bg-card/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {profile.customer?.full_name?.charAt(0) || 'G'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">{profile.customer?.full_name || 'Guest'}</p>
                        {profile.vip_status && (
                          <Crown className="h-4 w-4 text-yellow-500 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={cn(tierColors[profile.loyalty_tier], 'text-xs capitalize')}>
                          <TierIcon className="h-3 w-3 mr-1" />
                          {profile.loyalty_tier}
                        </Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(profile)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                    <div className="p-2 bg-muted/50 rounded-lg">
                      <p className="text-lg font-bold">{profile.total_stays}</p>
                      <p className="text-xs text-muted-foreground">Stays</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded-lg">
                      <p className="text-lg font-bold">{profile.total_nights}</p>
                      <p className="text-xs text-muted-foreground">Nights</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded-lg">
                      <p className="text-lg font-bold">${(profile.total_spent / 1000).toFixed(1)}k</p>
                      <p className="text-xs text-muted-foreground">Spent</p>
                    </div>
                  </div>

                  {(profile.room_preferences?.length > 0 || profile.dietary_restrictions?.length > 0) && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <div className="flex flex-wrap gap-1">
                        {profile.room_preferences?.slice(0, 2).map((pref, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {pref}
                          </Badge>
                        ))}
                        {profile.dietary_restrictions?.slice(0, 2).map((diet, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {diet}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </FeatureGate>
  );
}
