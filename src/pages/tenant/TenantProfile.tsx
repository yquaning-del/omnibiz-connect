import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  User, 
  Mail,
  Phone,
  AlertCircle,
  Loader2,
  Save
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface TenantContextType {
  tenantData: any;
  refreshTenantData: () => Promise<void>;
}

export default function TenantProfile() {
  const { profile, user, refreshUserData } = useAuth();
  const { tenantData, refreshTenantData } = useOutletContext<TenantContextType>();
  const [loading, setLoading] = useState(false);
  
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: '',
  });

  const [tenantForm, setTenantForm] = useState({
    emergency_contact_name: '',
    emergency_contact_phone: '',
  });

  useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  useEffect(() => {
    if (tenantData) {
      setTenantForm({
        emergency_contact_name: tenantData.emergency_contact_name || '',
        emergency_contact_phone: tenantData.emergency_contact_phone || '',
      });
    }
  }, [tenantData]);

  const handleSaveProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileForm.full_name,
          phone: profileForm.phone,
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshUserData();
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmergencyContact = async () => {
    if (!tenantData?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          emergency_contact_name: tenantForm.emergency_contact_name,
          emergency_contact_phone: tenantForm.emergency_contact_phone,
        })
        .eq('id', tenantData.id);

      if (error) throw error;

      await refreshTenantData();
      toast.success('Emergency contact updated!');
    } catch (error) {
      console.error('Error updating emergency contact:', error);
      toast.error('Failed to update emergency contact');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">
          Manage your account information
        </p>
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={profileForm.full_name}
                onChange={(e) => setProfileForm(prev => ({ ...prev, full_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  value={profile.email || ''}
                  disabled
                  className="pl-10 bg-muted"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={profileForm.phone}
                onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                className="pl-10"
              />
            </div>
          </div>

          <Button onClick={handleSaveProfile} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Emergency Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Emergency Contact
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="emergency_name">Contact Name</Label>
              <Input
                id="emergency_name"
                placeholder="Jane Doe"
                value={tenantForm.emergency_contact_name}
                onChange={(e) => setTenantForm(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency_phone">Contact Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="emergency_phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={tenantForm.emergency_contact_phone}
                  onChange={(e) => setTenantForm(prev => ({ ...prev, emergency_contact_phone: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <Button onClick={handleSaveEmergencyContact} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Update Emergency Contact
          </Button>
        </CardContent>
      </Card>

      {/* Tenant Info (Read-only) */}
      {tenantData && (
        <Card>
          <CardHeader>
            <CardTitle>Tenant Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Name on Lease</p>
                <p className="font-medium">
                  {tenantData.first_name} {tenantData.last_name}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium capitalize">{tenantData.status}</p>
              </div>
              {tenantData.move_in_date && (
                <div>
                  <p className="text-sm text-muted-foreground">Move-in Date</p>
                  <p className="font-medium">
                    {new Date(tenantData.move_in_date).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
