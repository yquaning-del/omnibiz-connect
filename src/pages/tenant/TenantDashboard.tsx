import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  CreditCard, 
  Wrench, 
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

interface TenantContextType {
  tenantData: any;
  refreshTenantData: () => Promise<void>;
}

export default function TenantDashboard() {
  const { tenantData, refreshTenantData } = useOutletContext<TenantContextType>();
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({
    activeLeases: 0,
    nextPaymentDue: null as string | null,
    nextPaymentAmount: 0,
    openRequests: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenantData) {
      fetchDashboardData();
    }
  }, [tenantData]);

  const fetchDashboardData = async () => {
    if (!tenantData?.id) return;

    try {
      // Fetch leases
      const { data: leases } = await supabase
        .from('leases')
        .select('*')
        .eq('tenant_id', tenantData.id)
        .eq('status', 'active');

      // Fetch maintenance requests
      const { data: requests } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('submitted_by_tenant', tenantData.id)
        .in('status', ['open', 'in-progress']);

      // Calculate next payment
      let nextPaymentDue = null;
      let nextPaymentAmount = 0;
      if (leases && leases.length > 0) {
        const lease = leases[0];
        const dueDay = lease.payment_due_day || 1;
        const today = new Date();
        let nextDue = new Date(today.getFullYear(), today.getMonth(), dueDay);
        if (nextDue <= today) {
          nextDue = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
        }
        nextPaymentDue = nextDue.toISOString();
        nextPaymentAmount = lease.monthly_rent || 0;
      }

      setStats({
        activeLeases: leases?.length || 0,
        nextPaymentDue,
        nextPaymentAmount,
        openRequests: requests?.length || 0,
      });

      // Build recent activity
      const activity: any[] = [];
      if (leases) {
        leases.forEach(lease => {
          activity.push({
            type: 'lease',
            title: 'Active Lease',
            description: `Lease #${lease.lease_number || lease.id.slice(0, 8)}`,
            date: lease.start_date,
            icon: FileText,
          });
        });
      }
      if (requests) {
        requests.forEach(req => {
          activity.push({
            type: 'maintenance',
            title: req.title,
            description: `Status: ${req.status}`,
            date: req.created_at,
            icon: Wrench,
          });
        });
      }

      // Sort by date
      activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentActivity(activity.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back, {profile?.full_name?.split(' ')[0] || 'Tenant'}!
        </h1>
        <p className="text-muted-foreground">
          Here's an overview of your tenancy
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Leases</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeLeases}</div>
            <Link to="/tenant/leases" className="text-xs text-property hover:underline">
              View leases →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Payment</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.nextPaymentAmount)}
            </div>
            {stats.nextPaymentDue ? (
              <p className="text-xs text-muted-foreground">
                Due {formatDate(stats.nextPaymentDue)}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">No payment due</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Requests</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openRequests}</div>
            <Link to="/tenant/maintenance" className="text-xs text-property hover:underline">
              View requests →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lease Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Active</div>
            <p className="text-xs text-muted-foreground">In good standing</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/tenant/payments">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Make a Payment
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/tenant/maintenance">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Submit Maintenance Request
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/tenant/leases">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  View Lease Documents
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity, index) => {
                  const Icon = activity.icon;
                  return (
                    <div key={index} className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-property/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-4 w-4 text-property" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">{activity.description}</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(activity.date)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Reminder */}
      {stats.nextPaymentDue && (
        <Card className="border-property/50 bg-property/5">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-property/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-property" />
              </div>
              <div>
                <p className="font-medium">Payment Reminder</p>
                <p className="text-sm text-muted-foreground">
                  Your next rent payment of {formatCurrency(stats.nextPaymentAmount)} is due on{' '}
                  {formatDate(stats.nextPaymentDue)}
                </p>
              </div>
            </div>
            <Link to="/tenant/payments">
              <Button>Pay Now</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
