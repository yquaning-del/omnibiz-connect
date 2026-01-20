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
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Plus, 
  Search,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface Tenant {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  id_verified: boolean;
  employment_verified: boolean;
  income_verified: boolean;
  move_in_date: string | null;
  move_out_date: string | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  applicant: 'bg-info/20 text-info border-info/30',
  active: 'bg-success/20 text-success border-success/30',
  former: 'bg-muted text-muted-foreground border-muted',
  evicted: 'bg-destructive/20 text-destructive border-destructive/30',
};

export default function Tenants() {
  const { currentOrganization } = useAuth();
  const { toast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    id_document_type: '',
    id_document_number: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    employer_name: '',
    employer_phone: '',
    annual_income: '',
  });

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchTenants();
    }
  }, [currentOrganization?.id]);

  const fetchTenants = async () => {
    if (!currentOrganization?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('tenants')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTenants(data || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading tenants',
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
      const { error } = await (supabase as any)
        .from('tenants')
        .insert({
          organization_id: currentOrganization.id,
          full_name: formData.full_name,
          email: formData.email || null,
          phone: formData.phone || null,
          date_of_birth: formData.date_of_birth || null,
          id_document_type: formData.id_document_type || null,
          id_document_number: formData.id_document_number || null,
          emergency_contact_name: formData.emergency_contact_name || null,
          emergency_contact_phone: formData.emergency_contact_phone || null,
          employer_name: formData.employer_name || null,
          employer_phone: formData.employer_phone || null,
          annual_income: formData.annual_income ? parseFloat(formData.annual_income) : null,
          status: 'applicant',
        });

      if (error) throw error;

      toast({
        title: 'Tenant added',
        description: `${formData.full_name} has been added successfully.`,
      });

      setIsDialogOpen(false);
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        date_of_birth: '',
        id_document_type: '',
        id_document_number: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        employer_name: '',
        employer_phone: '',
        annual_income: '',
      });
      fetchTenants();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error adding tenant',
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = 
      tenant.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.phone?.includes(searchTerm);
    return matchesSearch;
  });

  const stats = {
    total: tenants.length,
    active: tenants.filter(t => t.status === 'active').length,
    applicants: tenants.filter(t => t.status === 'applicant').length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
          <p className="text-muted-foreground">Manage your tenant profiles</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Tenant</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Personal Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">Date of Birth</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                </div>
              </div>

              {/* ID Information */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Identification
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="id_document_type">ID Type</Label>
                    <Input
                      id="id_document_type"
                      value={formData.id_document_type}
                      onChange={(e) => setFormData({ ...formData, id_document_type: e.target.value })}
                      placeholder="e.g., Passport, Driver's License"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="id_document_number">ID Number</Label>
                    <Input
                      id="id_document_number"
                      value={formData.id_document_number}
                      onChange={(e) => setFormData({ ...formData, id_document_number: e.target.value })}
                      placeholder="Document number"
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Emergency Contact
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact_name">Contact Name</Label>
                    <Input
                      id="emergency_contact_name"
                      value={formData.emergency_contact_name}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact_phone">Contact Phone</Label>
                    <Input
                      id="emergency_contact_phone"
                      value={formData.emergency_contact_phone}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                </div>
              </div>

              {/* Employment */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Employment Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employer_name">Employer</Label>
                    <Input
                      id="employer_name"
                      value={formData.employer_name}
                      onChange={(e) => setFormData({ ...formData, employer_name: e.target.value })}
                      placeholder="Company name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employer_phone">Employer Phone</Label>
                    <Input
                      id="employer_phone"
                      value={formData.employer_phone}
                      onChange={(e) => setFormData({ ...formData, employer_phone: e.target.value })}
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="annual_income">Annual Income</Label>
                  <Input
                    id="annual_income"
                    type="number"
                    min="0"
                    value={formData.annual_income}
                    onChange={(e) => setFormData({ ...formData, annual_income: e.target.value })}
                    placeholder="50000"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Adding...' : 'Add Tenant'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tenants</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-property" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-success/30 bg-success/5">
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold text-success">{stats.active}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-info/30 bg-info/5">
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-muted-foreground">Applicants</p>
              <p className="text-2xl font-bold text-info">{stats.applicants}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tenants by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tenants List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-muted rounded w-1/3 mb-4" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTenants.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No tenants found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'Try adjusting your search' : 'Get started by adding your first tenant'}
            </p>
            {!searchTerm && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Tenant
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTenants.map((tenant) => (
            <Card key={tenant.id} className="hover:border-property/50 transition-colors cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-property/20 flex items-center justify-center">
                      <span className="text-lg font-semibold text-property">
                        {tenant.full_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold">{tenant.full_name}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {tenant.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {tenant.email}
                          </span>
                        )}
                        {tenant.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {tenant.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Verification Status */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1" title="ID Verified">
                        {tenant.id_verified ? (
                          <CheckCircle className="h-4 w-4 text-success" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex items-center gap-1" title="Employment Verified">
                        {tenant.employment_verified ? (
                          <CheckCircle className="h-4 w-4 text-success" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex items-center gap-1" title="Income Verified">
                        {tenant.income_verified ? (
                          <CheckCircle className="h-4 w-4 text-success" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <Badge className={statusColors[tenant.status] || 'bg-muted'}>
                      {tenant.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}