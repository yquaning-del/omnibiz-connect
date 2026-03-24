import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/currency';
import { format, subDays, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Building2,
  Users,
  DollarSign,
  Calendar,
  Download,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { toast } from 'sonner';

interface ReportMetrics {
  totalRevenue: number;
  collectedRevenue: number;
  overdueAmount: number;
  occupancyRate: number;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  activeTenants: number;
  activeLeases: number;
  expiringLeases: number;
}

const COLORS = ['hsl(142, 71%, 45%)', 'hsl(199, 89%, 48%)', 'hsl(280, 60%, 50%)', 'hsl(14, 100%, 57%)'];

export default function PropertyReports() {
  const { currentOrganization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [metrics, setMetrics] = useState<ReportMetrics>({
    totalRevenue: 0,
    collectedRevenue: 0,
    overdueAmount: 0,
    occupancyRate: 0,
    totalUnits: 0,
    occupiedUnits: 0,
    vacantUnits: 0,
    activeTenants: 0,
    activeLeases: 0,
    expiringLeases: 0,
  });
  const [monthlyRevenue, setMonthlyRevenue] = useState<{ month: string; collected: number; expected: number }[]>([]);
  const [unitDistribution, setUnitDistribution] = useState<{ name: string; value: number }[]>([]);
  const [occupancyTrend, setOccupancyTrend] = useState<{ month: string; rate: number }[]>([]);

  useEffect(() => {
    if (currentOrganization) {
      fetchReportData();
    }
  }, [currentOrganization, dateRange]);

  const fetchReportData = async () => {
    if (!currentOrganization) return;
    setLoading(true);

    try {
      // Fetch units
      const { data: units } = await supabase
        .from('property_units' as any)
        .select('*')
        .eq('organization_id', currentOrganization.id) as { data: any[] | null };

      const totalUnits = units?.length || 0;
      const occupiedUnits = units?.filter((u: any) => u.status === 'occupied').length || 0;
      const vacantUnits = units?.filter((u: any) => u.status === 'available').length || 0;
      const maintenanceUnits = units?.filter((u: any) => u.status === 'maintenance').length || 0;

      // Fetch tenants
      const { data: tenants } = await supabase
        .from('tenants' as any)
        .select('*')
        .eq('organization_id', currentOrganization.id) as { data: any[] | null };

      const activeTenants = tenants?.filter((t: any) => t.status === 'active').length || 0;

      // Fetch leases
      const { data: leases } = await supabase
        .from('leases' as any)
        .select('*')
        .eq('organization_id', currentOrganization.id) as { data: any[] | null };

      const activeLeases = leases?.filter((l: any) => l.status === 'active').length || 0;
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const expiringLeases = leases?.filter((l: any) => {
        if (!l.end_date || l.status !== 'active') return false;
        const endDate = new Date(l.end_date);
        return endDate <= thirtyDaysFromNow;
      }).length || 0;

      // Calculate expected monthly revenue from active leases
      const totalMonthlyRent = leases
        ?.filter((l: any) => l.status === 'active')
        .reduce((sum: number, l: any) => sum + (l.monthly_rent || 0), 0) || 0;

      // Fetch rent payments
      const { data: payments } = await supabase
        .from('rent_payments' as any)
        .select('*')
        .eq('organization_id', currentOrganization.id) as { data: any[] | null };

      const currentMonth = new Date();
      const startOfCurrentMonth = startOfMonth(currentMonth);
      const endOfCurrentMonth = endOfMonth(currentMonth);

      const collectedThisMonth = payments
        ?.filter((p: any) => {
          const paidDate = p.paid_date ? new Date(p.paid_date) : null;
          return paidDate && paidDate >= startOfCurrentMonth && paidDate <= endOfCurrentMonth && p.status === 'paid';
        })
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;

      const overdueAmount = payments
        ?.filter((p: any) => p.status === 'overdue')
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;

      // Calculate occupancy rate
      const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

      setMetrics({
        totalRevenue: totalMonthlyRent,
        collectedRevenue: collectedThisMonth,
        overdueAmount,
        occupancyRate,
        totalUnits,
        occupiedUnits,
        vacantUnits,
        activeTenants,
        activeLeases,
        expiringLeases,
      });

      // Build monthly revenue chart data
      const last6Months = eachMonthOfInterval({
        start: subMonths(new Date(), 5),
        end: new Date(),
      });

      const revenueByMonth = last6Months.map(month => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        const collected = payments
          ?.filter((p: any) => {
            const paidDate = p.paid_date ? new Date(p.paid_date) : null;
            return paidDate && paidDate >= monthStart && paidDate <= monthEnd && p.status === 'paid';
          })
          .reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;

        return {
          month: format(month, 'MMM'),
          collected,
          expected: totalMonthlyRent,
        };
      });

      setMonthlyRevenue(revenueByMonth);

      // Unit distribution
      setUnitDistribution([
        { name: 'Occupied', value: occupiedUnits },
        { name: 'Available', value: vacantUnits },
        { name: 'Maintenance', value: maintenanceUnits },
      ]);

      // Occupancy trend (mock data for demo)
      setOccupancyTrend(
        last6Months.map((month, index) => ({
          month: format(month, 'MMM'),
          rate: Math.min(100, occupancyRate + (index - 3) * 5 + Math.random() * 10),
        }))
      );
    } catch (error: any) {
      toast.error("Error");
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    const csvContent = [
      ['Property Report', format(new Date(), 'yyyy-MM-dd')],
      [],
      ['Metric', 'Value'],
      ['Total Units', metrics.totalUnits],
      ['Occupied Units', metrics.occupiedUnits],
      ['Vacant Units', metrics.vacantUnits],
      ['Occupancy Rate', `${metrics.occupancyRate.toFixed(1)}%`],
      ['Active Tenants', metrics.activeTenants],
      ['Active Leases', metrics.activeLeases],
      ['Expiring Leases (30 days)', metrics.expiringLeases],
      ['Expected Monthly Revenue', metrics.totalRevenue],
      ['Collected This Month', metrics.collectedRevenue],
      ['Overdue Amount', metrics.overdueAmount],
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `property-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported successfully");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <FeatureGate feature="financial_reports" requiredTier="Professional">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Property Reports</h1>
            <p className="text-muted-foreground">Analytics and insights for your property portfolio</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportReport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Occupancy Rate</p>
                  <p className="text-2xl font-bold">{metrics.occupancyRate.toFixed(1)}%</p>
                </div>
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.occupiedUnits} of {metrics.totalUnits} units
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Collected This Month</p>
                  <p className="text-2xl font-bold">{formatCurrency(metrics.collectedRevenue)}</p>
                </div>
                <div className="p-2 rounded-lg bg-green-500/10">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                of {formatCurrency(metrics.totalRevenue)} expected
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Overdue Amount</p>
                  <p className="text-2xl font-bold text-red-500">{formatCurrency(metrics.overdueAmount)}</p>
                </div>
                <div className="p-2 rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Tenants</p>
                  <p className="text-2xl font-bold">{metrics.activeTenants}</p>
                </div>
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.activeLeases} active leases
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="revenue" className="space-y-4">
          <TabsList>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="occupancy">Occupancy</TabsTrigger>
            <TabsTrigger value="distribution">Unit Distribution</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue">
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle className="text-lg">Monthly Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Legend />
                      <Bar dataKey="collected" name="Collected" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expected" name="Expected" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="occupancy">
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle className="text-lg">Occupancy Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={occupancyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [`${value.toFixed(1)}%`, 'Occupancy']}
                      />
                      <Line
                        type="monotone"
                        dataKey="rate"
                        stroke="hsl(280, 60%, 50%)"
                        strokeWidth={2}
                        dot={{ fill: 'hsl(280, 60%, 50%)' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="distribution">
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle className="text-lg">Unit Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={unitDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {unitDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Alerts Section */}
        {metrics.expiringLeases > 0 && (
          <Card className="border-orange-500/20 bg-orange-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="font-medium text-foreground">Leases Expiring Soon</p>
                  <p className="text-sm text-muted-foreground">
                    {metrics.expiringLeases} lease{metrics.expiringLeases !== 1 ? 's' : ''} expiring in the next 30 days
                  </p>
                </div>
                <Button variant="outline" size="sm" className="ml-auto">
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </FeatureGate>
  );
}
