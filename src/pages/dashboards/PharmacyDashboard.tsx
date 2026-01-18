import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { StatCard } from '@/components/dashboard/StatCard';
import { SalesChart } from '@/components/charts/SalesChart';
import { PieBreakdown } from '@/components/charts/PieBreakdown';
import { BarChartCard } from '@/components/charts/BarChartCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Pill,
  FileText,
  Users,
  DollarSign,
  AlertTriangle,
  Shield,
  Clock,
  CheckCircle,
  Package,
  TrendingUp,
} from 'lucide-react';

interface PrescriptionStats {
  pending: number;
  ready: number;
  dispensed: number;
  total: number;
}

interface PendingRx {
  id: string;
  prescription_number: string;
  patient_name: string;
  status: string;
  created_at: string;
}

interface DailyVolume {
  name: string;
  value: number;
}

interface ClaimData {
  name: string;
  value: number;
}

export default function PharmacyDashboard() {
  const navigate = useNavigate();
  const { currentOrganization, currentLocation } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rxStats, setRxStats] = useState<PrescriptionStats>({ pending: 0, ready: 0, dispensed: 0, total: 0 });
  const [pendingRx, setPendingRx] = useState<PendingRx[]>([]);
  const [insurancePending, setInsurancePending] = useState(0);
  const [lowStockMeds, setLowStockMeds] = useState(0);
  const [todayDispensed, setTodayDispensed] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [patientCount, setPatientCount] = useState(0);
  const [dailyVolume, setDailyVolume] = useState<DailyVolume[]>([]);
  const [claimStats, setClaimStats] = useState<ClaimData[]>([]);

  useEffect(() => {
    if (!currentOrganization?.id) return;
    fetchDashboardData();
  }, [currentOrganization, currentLocation]);

  const fetchDashboardData = async () => {
    if (!currentOrganization?.id) return;
    setLoading(true);

    try {
      const today = new Date().toISOString().split('T')[0];

      // Prescription stats
      const { data: prescriptions } = await supabase
        .from('prescriptions')
        .select('id, prescription_number, status, created_at, patient_id')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false });

      if (prescriptions) {
        const statusCounts = prescriptions.reduce((acc, p) => {
          acc[p.status] = (acc[p.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        setRxStats({
          pending: statusCounts['pending'] || 0,
          ready: statusCounts['ready'] || 0,
          dispensed: statusCounts['dispensed'] || 0,
          total: prescriptions.length,
        });

        // Get pending prescriptions with patient info
        const pending = prescriptions.filter(p => p.status === 'pending').slice(0, 5);
        const pendingWithPatients = await Promise.all(
          pending.map(async (p) => {
            let patientName = 'Unknown Patient';
            if (p.patient_id) {
              const { data: patient } = await supabase
                .from('patient_profiles')
                .select('customer_id')
                .eq('id', p.patient_id)
                .single();
              
              if (patient?.customer_id) {
                const { data: customer } = await supabase
                  .from('customers')
                  .select('full_name')
                  .eq('id', patient.customer_id)
                  .single();
                patientName = customer?.full_name || 'Unknown';
              }
            }
            return {
              id: p.id,
              prescription_number: p.prescription_number,
              patient_name: patientName,
              status: p.status,
              created_at: p.created_at,
            };
          })
        );
        setPendingRx(pendingWithPatients);

        // Today's dispensed
        const todayDispensedCount = prescriptions.filter(
          p => p.status === 'dispensed' && p.created_at.startsWith(today)
        ).length;
        setTodayDispensed(todayDispensedCount);

        // Daily volume for last 7 days
        const volumeData: DailyVolume[] = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          const dayName = date.toLocaleDateString('en', { weekday: 'short' });

          const dayCount = prescriptions.filter(p => p.created_at.startsWith(dateStr)).length;
          volumeData.push({ name: dayName, value: dayCount });
        }
        setDailyVolume(volumeData);
      }

      // Insurance claims with status breakdown
      const { data: claims } = await supabase
        .from('insurance_claims')
        .select('status')
        .eq('organization_id', currentOrganization.id);

      if (claims) {
        const claimCounts = claims.reduce((acc, c) => {
          acc[c.status] = (acc[c.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        setInsurancePending((claimCounts['pending'] || 0) + (claimCounts['submitted'] || 0));
        
        setClaimStats([
          { name: 'Pending', value: claimCounts['pending'] || 0 },
          { name: 'Submitted', value: claimCounts['submitted'] || 0 },
          { name: 'Approved', value: claimCounts['approved'] || 0 },
          { name: 'Denied', value: claimCounts['denied'] || 0 },
        ]);
      }

      // Low stock medications
      const { data: products } = await supabase
        .from('products')
        .select('stock_quantity, low_stock_threshold')
        .eq('organization_id', currentOrganization.id)
        .eq('vertical', 'pharmacy')
        .eq('is_active', true);

      if (products) {
        const lowStock = products.filter(p => 
          (p.stock_quantity || 0) <= (p.low_stock_threshold || 10)
        ).length;
        setLowStockMeds(lowStock);
      }

      // Patient count
      const { count: patCount } = await supabase
        .from('patient_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrganization.id);

      setPatientCount(patCount || 0);

      // Today's revenue from orders
      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('organization_id', currentOrganization.id)
        .eq('vertical', 'pharmacy')
        .gte('created_at', today + 'T00:00:00');

      if (orders) {
        setTodayRevenue(orders.reduce((sum, o) => sum + Number(o.total_amount), 0));
      }
    } catch (error) {
      console.error('Error fetching pharmacy dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeSince = (dateStr: string) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const rxStatusPieData = [
    { name: 'Pending', value: rxStats.pending, color: 'hsl(var(--warning))' },
    { name: 'Ready', value: rxStats.ready, color: 'hsl(var(--success))' },
    { name: 'Dispensed', value: rxStats.dispensed, color: 'hsl(var(--pharmacy))' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground flex items-center gap-2">
            <Pill className="w-6 h-6 text-pharmacy" />
            Pharmacy Dashboard
          </h1>
          <p className="text-muted-foreground">
            {currentLocation?.name || currentOrganization?.name} - Today's operations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/pharmacy/prescriptions')}>
            <FileText className="w-4 h-4 mr-2" />
            Prescriptions
          </Button>
          <Button onClick={() => navigate('/pos')}>
            <DollarSign className="w-4 h-4 mr-2" />
            POS
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pending Rx"
          value={rxStats.pending}
          change="Awaiting processing"
          icon={FileText}
          onClick={() => navigate('/pharmacy/prescriptions')}
        />
        <StatCard
          title="Ready for Pickup"
          value={rxStats.ready}
          icon={CheckCircle}
          onClick={() => navigate('/pharmacy/prescriptions')}
        />
        <StatCard
          title="Dispensed Today"
          value={todayDispensed}
          icon={Pill}
        />
        <StatCard
          title="Today's Revenue"
          value={`$${todayRevenue.toFixed(2)}`}
          icon={DollarSign}
          onClick={() => navigate('/reports')}
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        <SalesChart
          title="Daily Rx Volume"
          data={dailyVolume}
          color="hsl(var(--pharmacy))"
          icon={TrendingUp}
          showAxis
          valuePrefix=""
          height={180}
        />
        <BarChartCard
          title="Insurance Claims"
          data={claimStats}
          color="hsl(var(--pharmacy))"
          icon={DollarSign}
          height={180}
        />
      </div>

      {/* Workflow & Alerts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Rx Status Pie */}
        <PieBreakdown
          title="Prescription Status"
          data={rxStatusPieData}
          icon={FileText}
        />

        {/* Pending Prescriptions */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-warning" />
              Pending Prescriptions
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/pharmacy/prescriptions')}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {pendingRx.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>All prescriptions processed!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRx.map((rx) => (
                  <div
                    key={rx.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => navigate('/pharmacy/prescriptions')}
                  >
                    <div>
                      <p className="font-mono font-medium">{rx.prescription_number}</p>
                      <p className="text-sm text-muted-foreground">{rx.patient_name}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">{getTimeSince(rx.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts & Stats */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Attention Required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div 
              className="flex items-center justify-between p-3 rounded-lg bg-warning/10 border border-warning/20 cursor-pointer hover:bg-warning/20 transition-colors"
              onClick={() => navigate('/pharmacy/insurance')}
            >
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-warning" />
                <span>Insurance Claims Pending</span>
              </div>
              <Badge variant="outline" className="bg-warning/20 text-warning border-warning/30">
                {insurancePending}
              </Badge>
            </div>

            <div 
              className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/20 cursor-pointer hover:bg-destructive/20 transition-colors"
              onClick={() => navigate('/inventory')}
            >
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-destructive" />
                <span>Low Stock Medications</span>
              </div>
              <Badge variant="outline" className="bg-destructive/20 text-destructive border-destructive/30">
                {lowStockMeds}
              </Badge>
            </div>

            <div 
              className="flex items-center justify-between p-3 rounded-lg bg-pharmacy/10 border border-pharmacy/20 cursor-pointer hover:bg-pharmacy/20 transition-colors"
              onClick={() => navigate('/pharmacy/controlled')}
            >
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-pharmacy" />
                <span>Controlled Substances</span>
              </div>
              <Badge variant="outline" className="bg-pharmacy/20 text-pharmacy border-pharmacy/30">
                Log
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/pharmacy/prescriptions')}>
              <FileText className="w-6 h-6" />
              <span>New Rx</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/pharmacy/patients')}>
              <Users className="w-6 h-6" />
              <span>Patients ({patientCount})</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/pharmacy/interactions')}>
              <AlertTriangle className="w-6 h-6" />
              <span>Drug Check</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/reports')}>
              <TrendingUp className="w-6 h-6" />
              <span>Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
