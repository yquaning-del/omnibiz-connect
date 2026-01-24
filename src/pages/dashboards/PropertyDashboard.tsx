import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DynamicPricingPanel } from '@/components/ai/DynamicPricingPanel';
import { MaintenancePredictorPanel } from '@/components/ai/MaintenancePredictorPanel';
import { 
  Building2, 
  Users, 
  FileText, 
  DollarSign, 
  Wrench,
  Home,
  TrendingUp,
  AlertCircle,
  Plus,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/currency';

interface PropertyStats {
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  maintenanceUnits: number;
  totalTenants: number;
  activeLeases: number;
  rentCollectedThisMonth: number;
  rentExpectedThisMonth: number;
  overduePayments: number;
  pendingApplications: number;
  openMaintenanceRequests: number;
}

export default function PropertyDashboard() {
  const { currentOrganization } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<PropertyStats>({
    totalUnits: 0,
    occupiedUnits: 0,
    vacantUnits: 0,
    maintenanceUnits: 0,
    totalTenants: 0,
    activeLeases: 0,
    rentCollectedThisMonth: 0,
    rentExpectedThisMonth: 0,
    overduePayments: 0,
    pendingApplications: 0,
    openMaintenanceRequests: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchStats();
      fetchRecentActivity();
    }
  }, [currentOrganization?.id]);

  const fetchStats = async () => {
    if (!currentOrganization?.id) return;
    
    try {
      // Fetch units - using any to bypass type regeneration delay
      const { data: units } = await (supabase as any)
        .from('property_units')
        .select('status')
        .eq('organization_id', currentOrganization.id);

      const totalUnits = units?.length || 0;
      const occupiedUnits = units?.filter((u: any) => u.status === 'occupied').length || 0;
      const vacantUnits = units?.filter((u: any) => u.status === 'available').length || 0;
      const maintenanceUnits = units?.filter((u: any) => u.status === 'maintenance').length || 0;

      // Fetch tenants
      const { data: tenants } = await (supabase as any)
        .from('tenants')
        .select('id')
        .eq('organization_id', currentOrganization.id)
        .eq('status', 'active');

      // Fetch active leases
      const { data: leases } = await (supabase as any)
        .from('leases')
        .select('monthly_rent')
        .eq('organization_id', currentOrganization.id)
        .eq('status', 'active');

      const activeLeases = leases?.length || 0;
      const rentExpected = leases?.reduce((sum: number, l: any) => sum + Number(l.monthly_rent), 0) || 0;

      // Fetch rent payments this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: payments } = await (supabase as any)
        .from('rent_payments')
        .select('paid_amount, status')
        .eq('organization_id', currentOrganization.id)
        .gte('paid_date', startOfMonth.toISOString());

      const rentCollected = payments?.filter((p: any) => p.status === 'paid')
        .reduce((sum: number, p: any) => sum + Number(p.paid_amount), 0) || 0;
      const overduePayments = payments?.filter((p: any) => p.status === 'overdue').length || 0;

      // Fetch pending applications
      const { data: applications } = await (supabase as any)
        .from('tenant_applications')
        .select('id')
        .eq('organization_id', currentOrganization.id)
        .in('status', ['submitted', 'screening']);

      // Fetch open maintenance
      const { data: maintenance } = await supabase
        .from('maintenance_requests')
        .select('id')
        .eq('status', 'open');

      setStats({
        totalUnits,
        occupiedUnits,
        vacantUnits,
        maintenanceUnits,
        totalTenants: tenants?.length || 0,
        activeLeases,
        rentCollectedThisMonth: rentCollected,
        rentExpectedThisMonth: rentExpected,
        overduePayments,
        pendingApplications: applications?.length || 0,
        openMaintenanceRequests: maintenance?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching property stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    if (!currentOrganization?.id) return;
    
    try {
      // Fetch recent lease activities
      const { data: recentLeases } = await (supabase as any)
        .from('leases')
        .select('id, lease_number, status, created_at')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentActivity(recentLeases || []);
    } catch (error) {
      console.error('Error fetching activity:', error);
    }
  };

  const occupancyRate = stats.totalUnits > 0 
    ? Math.round((stats.occupiedUnits / stats.totalUnits) * 100) 
    : 0;

  const collectionRate = stats.rentExpectedThisMonth > 0
    ? Math.round((stats.rentCollectedThisMonth / stats.rentExpectedThisMonth) * 100)
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Property Dashboard</h1>
          <p className="text-muted-foreground">Manage your rental properties</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/property/units')}>
            <Building2 className="h-4 w-4 mr-2" />
            View Units
          </Button>
          <Button onClick={() => navigate('/property/tenants')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Tenant
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-property/30 bg-property/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Units</p>
                <p className="text-2xl font-bold">{stats.totalUnits}</p>
                <p className="text-xs text-muted-foreground">{occupancyRate}% occupancy</p>
              </div>
              <Building2 className="h-8 w-8 text-property" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Tenants</p>
                <p className="text-2xl font-bold">{stats.totalTenants}</p>
                <p className="text-xs text-muted-foreground">{stats.activeLeases} leases</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-success/30 bg-success/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rent Collected</p>
                <p className="text-2xl font-bold text-success">{formatCurrency(stats.rentCollectedThisMonth)}</p>
                <p className="text-xs text-muted-foreground">{collectionRate}% of expected</p>
              </div>
              <DollarSign className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Actions</p>
                <p className="text-2xl font-bold text-warning">{stats.overduePayments + stats.pendingApplications + stats.openMaintenanceRequests}</p>
                <p className="text-xs text-muted-foreground">Items need attention</p>
              </div>
              <AlertCircle className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Overview */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Unit Status Overview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5 text-property" />
              Unit Status Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                <div className="text-2xl font-bold text-success">{stats.occupiedUnits}</div>
                <div className="text-sm text-muted-foreground">Occupied</div>
              </div>
              <div className="p-4 rounded-lg bg-info/10 border border-info/20">
                <div className="text-2xl font-bold text-info">{stats.vacantUnits}</div>
                <div className="text-sm text-muted-foreground">Available</div>
              </div>
              <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                <div className="text-2xl font-bold text-warning">{stats.maintenanceUnits}</div>
                <div className="text-sm text-muted-foreground">Maintenance</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <div className="text-2xl font-bold">{stats.totalUnits - stats.occupiedUnits - stats.vacantUnits - stats.maintenanceUnits}</div>
                <div className="text-sm text-muted-foreground">Reserved</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={() => navigate('/property/rent')}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Record Payment
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/property/leases')}
            >
              <FileText className="h-4 w-4 mr-2" />
              Create Lease
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/maintenance')}
            >
              <Wrench className="h-4 w-4 mr-2" />
              Maintenance Request
              {stats.openMaintenanceRequests > 0 && (
                <Badge variant="destructive" className="ml-auto">
                  {stats.openMaintenanceRequests}
                </Badge>
              )}
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/property/applications')}
            >
              <Users className="h-4 w-4 mr-2" />
              Review Applications
              {stats.pendingApplications > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {stats.pendingApplications}
                </Badge>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {(stats.overduePayments > 0 || stats.pendingApplications > 0) && (
        <Card className="border-warning/50 bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertCircle className="h-5 w-5" />
              Attention Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.overduePayments > 0 && (
                <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-destructive" />
                    <span>{stats.overduePayments} overdue rent payment(s)</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate('/property/rent')}>
                    View
                  </Button>
                </div>
              )}
              {stats.pendingApplications > 0 && (
                <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-info" />
                    <span>{stats.pendingApplications} pending application(s) to review</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate('/property/applications')}>
                    Review
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No recent activity</p>
              <p className="text-sm">Start by adding units and tenants</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Lease {item.lease_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Insights */}
      <div className="grid lg:grid-cols-2 gap-6">
        <DynamicPricingPanel vertical="property" />
        <MaintenancePredictorPanel vertical="property" />
      </div>
    </div>
  );
}