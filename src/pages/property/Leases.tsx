import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  Plus, 
  Search,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { LeaseWizard } from '@/components/property/LeaseWizard';
import { LeaseDetailPanel } from '@/components/property/LeaseDetailPanel';

interface Lease {
  id: string;
  lease_number: string;
  lease_type: string;
  start_date: string;
  end_date: string | null;
  monthly_rent: number;
  status: string;
  created_at: string;
  unit_id: string;
  tenant_id: string;
}

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground border-muted',
  pending_signature: 'bg-warning/20 text-warning border-warning/30',
  active: 'bg-success/20 text-success border-success/30',
  expired: 'bg-destructive/20 text-destructive border-destructive/30',
  terminated: 'bg-destructive/20 text-destructive border-destructive/30',
};

export default function Leases() {
  const { currentOrganization } = useAuth();
  const { toast } = useToast();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedLeaseId, setSelectedLeaseId] = useState<string | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchLeases();
    }
  }, [currentOrganization?.id]);

  const fetchLeases = async () => {
    if (!currentOrganization?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('leases')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeases(data || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading leases',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredLeases = leases.filter(lease => {
    const matchesSearch = lease.lease_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || lease.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const stats = {
    total: leases.length,
    active: leases.filter(l => l.status === 'active').length,
    expiring: leases.filter(l => {
      if (!l.end_date) return false;
      const endDate = new Date(l.end_date);
      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      return endDate <= thirtyDaysFromNow && endDate > today;
    }).length,
    draft: leases.filter(l => l.status === 'draft').length,
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const handleLeaseClick = (leaseId: string) => {
    setSelectedLeaseId(leaseId);
    setDetailPanelOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leases</h1>
          <p className="text-muted-foreground">Manage rental agreements</p>
        </div>
        <Button onClick={() => setWizardOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Lease
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Leases</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-property" />
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
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-muted-foreground">Expiring Soon</p>
              <p className="text-2xl font-bold text-warning">{stats.expiring}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-muted">
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-muted-foreground">Drafts</p>
              <p className="text-2xl font-bold">{stats.draft}</p>
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
                placeholder="Search leases..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="expired">Expired</TabsTrigger>
                <TabsTrigger value="draft">Drafts</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Leases List */}
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
      ) : filteredLeases.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No leases found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'Try adjusting your search' : 'Get started by creating your first lease'}
            </p>
            {!searchTerm && (
              <Button onClick={() => setWizardOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Lease
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredLeases.map((lease) => (
            <Card 
              key={lease.id} 
              className="hover:border-property/50 transition-colors cursor-pointer"
              onClick={() => handleLeaseClick(lease.id)}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-property/20 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-property" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Lease #{lease.lease_number}</h3>
                      <p className="text-sm text-muted-foreground capitalize">
                        {lease.lease_type.replace('-', ' ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDate(lease.start_date)} - {formatDate(lease.end_date)}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <DollarSign className="h-4 w-4 text-property" />
                        <span className="font-semibold">{formatCurrency(lease.monthly_rent)}</span>
                        <span className="text-sm text-muted-foreground">/mo</span>
                      </div>
                    </div>
                    <Badge className={statusColors[lease.status] || 'bg-muted'}>
                      {lease.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <LeaseWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onSuccess={fetchLeases}
      />

      <LeaseDetailPanel
        leaseId={selectedLeaseId}
        open={detailPanelOpen}
        onOpenChange={setDetailPanelOpen}
        onLeaseUpdated={fetchLeases}
      />
    </div>
  );
}