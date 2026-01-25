import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CreditCard, 
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  due_date: string | null;
  status: string;
  payment_method: string | null;
  late_fee: number;
  notes: string | null;
}

interface TenantContextType {
  tenantData: any;
  refreshTenantData: () => Promise<void>;
}

export default function TenantPayments() {
  const { tenantData } = useOutletContext<TenantContextType>();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [lease, setLease] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (tenantData?.id) {
      fetchData();
    }
  }, [tenantData]);

  const fetchData = async () => {
    try {
      // Fetch payments
      const { data: paymentData } = await supabase
        .from('rent_payments')
        .select('*')
        .eq('tenant_id', tenantData.id)
        .order('payment_date', { ascending: false });

      setPayments(paymentData || []);

      // Fetch active lease for payment info
      const { data: leaseData } = await supabase
        .from('leases')
        .select('*')
        .eq('tenant_id', tenantData.id)
        .eq('status', 'active')
        .maybeSingle();

      setLease(leaseData);
    } catch (error) {
      console.error('Error fetching payment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getNextDueDate = () => {
    if (!lease) return null;
    const dueDay = lease.payment_due_day || 1;
    const today = new Date();
    let nextDue = new Date(today.getFullYear(), today.getMonth(), dueDay);
    if (nextDue <= today) {
      nextDue = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
    }
    return nextDue;
  };

  const handlePayNow = async () => {
    if (!lease || !tenantData) return;

    setPaying(true);
    try {
      // For now, just create a payment record (in production, this would integrate with Paystack)
      const { error } = await supabase
        .from('rent_payments')
        .insert({
          organization_id: lease.organization_id,
          lease_id: lease.id,
          tenant_id: tenantData.id,
          amount: lease.monthly_rent,
          due_date: getNextDueDate()?.toISOString().split('T')[0],
          payment_method: 'online',
          status: 'pending',
        });

      if (error) throw error;

      toast.success('Payment initiated! Redirecting to payment gateway...');
      // In production, redirect to Paystack checkout
      await fetchData();
    } catch (error) {
      console.error('Error initiating payment:', error);
      toast.error('Failed to initiate payment');
    } finally {
      setPaying(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const nextDueDate = getNextDueDate();
  const totalPaid = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-muted-foreground">
          Manage your rent payments and view payment history
        </p>
      </div>

      {/* Payment Summary */}
      {lease && (
        <Card className="border-property/50 bg-property/5">
          <CardContent className="py-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-property/10 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-property" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Next Payment Due</p>
                  <p className="text-2xl font-bold">{formatCurrency(lease.monthly_rent)}</p>
                  <p className="text-sm text-muted-foreground">
                    Due {nextDueDate ? formatDate(nextDueDate.toISOString()) : 'N/A'}
                  </p>
                </div>
              </div>
              <Button onClick={handlePayNow} disabled={paying} size="lg">
                {paying ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                Pay Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Rent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lease ? formatCurrency(lease.monthly_rent) : '$0'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid (YTD)</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalPaid)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Due Day</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lease?.payment_due_day || 1}
              <span className="text-sm font-normal text-muted-foreground">
                {lease?.payment_due_day === 1 ? 'st' : lease?.payment_due_day === 2 ? 'nd' : lease?.payment_due_day === 3 ? 'rd' : 'th'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">of each month</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No payment history yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      payment.status === 'completed' ? 'bg-green-100' : 'bg-amber-100'
                    }`}>
                      {payment.status === 'completed' ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <Clock className="h-5 w-5 text-amber-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">Rent Payment</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(payment.payment_date)}
                        {payment.payment_method && ` • ${payment.payment_method}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(payment.amount)}</p>
                    {getStatusBadge(payment.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
