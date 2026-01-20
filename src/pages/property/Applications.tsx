import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { 
  ClipboardList, 
  Search,
  Calendar,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Building2
} from 'lucide-react';

interface TenantApplication {
  id: string;
  applicant_name: string;
  email: string;
  phone: string | null;
  desired_move_in: string | null;
  desired_lease_term: number;
  current_address: string | null;
  employer_name: string | null;
  annual_income: number | null;
  status: string;
  created_at: string;
  unit_id: string;
  credit_consent: boolean;
  background_consent: boolean;
}

const statusColors: Record<string, string> = {
  submitted: 'bg-info/20 text-info border-info/30',
  screening: 'bg-warning/20 text-warning border-warning/30',
  approved: 'bg-success/20 text-success border-success/30',
  rejected: 'bg-destructive/20 text-destructive border-destructive/30',
  cancelled: 'bg-muted text-muted-foreground border-muted',
};

const statusIcons: Record<string, any> = {
  submitted: Clock,
  screening: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  cancelled: XCircle,
};

export default function Applications() {
  const { currentOrganization } = useAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState<TenantApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('submitted');

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchApplications();
    }
  }, [currentOrganization?.id]);

  const fetchApplications = async () => {
    if (!currentOrganization?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('tenant_applications')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading applications',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      app.applicant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || app.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'submitted' || a.status === 'screening').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <FeatureGate feature="tenant_screening" requiredTier="Professional">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
            <p className="text-muted-foreground">Review and process tenant applications</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <ClipboardList className="h-8 w-8 text-property" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="p-4">
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold text-warning">{stats.pending}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-success/30 bg-success/5">
            <CardContent className="p-4">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-success">{stats.approved}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4">
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold text-destructive">{stats.rejected}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Tabs */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search applications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="submitted">New</TabsTrigger>
                  <TabsTrigger value="screening">Screening</TabsTrigger>
                  <TabsTrigger value="approved">Approved</TabsTrigger>
                  <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Applications List */}
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
        ) : filteredApplications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No applications found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try adjusting your search' : 'Applications will appear here when tenants apply'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredApplications.map((app) => {
              const StatusIcon = statusIcons[app.status] || Clock;
              return (
                <Card key={app.id} className="hover:border-property/50 transition-colors cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-property/20 flex items-center justify-center">
                          <span className="text-lg font-semibold text-property">
                            {app.applicant_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold">{app.applicant_name}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {app.email}
                            </span>
                            {app.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {app.phone}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            {app.desired_move_in && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Move-in: {formatDate(app.desired_move_in)}
                              </span>
                            )}
                            {app.annual_income && (
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                Income: {formatCurrency(app.annual_income)}/yr
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={statusColors[app.status] || 'bg-muted'}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {app.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Applied: {formatDate(app.created_at)}
                        </span>
                        {(app.status === 'submitted' || app.status === 'screening') && (
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" variant="outline">Review</Button>
                            <Button size="sm">Approve</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </FeatureGate>
  );
}