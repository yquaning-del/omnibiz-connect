import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  DollarSign, 
  Plus, 
  Search,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { RecordPaymentDialog } from '@/components/property/RecordPaymentDialog';
import { ApplyLateFeeButton } from '@/components/property/ApplyLateFeeButton';
import { toast } from 'sonner';

interface RentPayment {
  id: string;
  payment_number: string;
  period_start: string;
  period_end: string;
  due_date: string;
  paid_date: string | null;
  base_rent: number;
  late_fee: number;
  total_amount: number;
  paid_amount: number;
  balance: number;
  status: string;
  payment_method: string | null;
  lease_id: string;
  tenant_id: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-warning/20 text-warning border-warning/30',
  partial: 'bg-info/20 text-info border-info/30',
  paid: 'bg-success/20 text-success border-success/30',
  overdue: 'bg-destructive/20 text-destructive border-destructive/30',
  waived: 'bg-muted text-muted-foreground border-muted',
};

const statusIcons: Record<string, any> = {
  pending: Clock,
  partial: AlertCircle,
  paid: CheckCircle,
  overdue: AlertCircle,
  waived: CheckCircle,
};

export default function RentCollection() {
  const { currentOrganization } = useAuth();
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showRecordPayment, setShowRecordPayment] = useState(false);

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchPayments();
    }
  }, [currentOrganization?.id]);

  const fetchPayments = async () => {
    if (!currentOrganization?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('rent_payments')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('due_date', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error: any) {
      toast.error("Error loading payments", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.payment_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    totalCollected: payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.paid_amount, 0),
    totalPending: payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.total_amount, 0),
    overdue: payments.filter(p => p.status === 'overdue').length,
    overdueAmount: payments.filter(p => p.status === 'overdue').reduce((sum, p) => sum + p.balance, 0),
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rent Collection</h1>
          <p className="text-muted-foreground">Track and manage rent payments</p>
        </div>
        <div className="flex gap-2">
          <ApplyLateFeeButton onSuccess={fetchPayments} />
          <Button onClick={() => setShowRecordPayment(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        </div>
      </div>

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        open={showRecordPayment}
        onClose={() => setShowRecordPayment(false)}
        onSuccess={fetchPayments}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-success/30 bg-success/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Collected</p>
                <p className="text-2xl font-bold text-success">{formatCurrency(stats.totalCollected)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-warning">{formatCurrency(stats.totalPending)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-muted-foreground">Overdue</p>
              <p className="text-2xl font-bold text-destructive">{stats.overdue}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-muted-foreground">Overdue Amount</p>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(stats.overdueAmount)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search payments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments List */}
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
      ) : filteredPayments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No payments found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Payment records will appear here once leases are created'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPayments.map((payment) => {
            const StatusIcon = statusIcons[payment.status] || Clock;
            return (
              <Card key={payment.id} className="hover:border-property/50 transition-colors cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                        payment.status === 'paid' ? 'bg-success/20' :
                        payment.status === 'overdue' ? 'bg-destructive/20' :
                        'bg-warning/20'
                      }`}>
                        <StatusIcon className={`h-6 w-6 ${
                          payment.status === 'paid' ? 'text-success' :
                          payment.status === 'overdue' ? 'text-destructive' :
                          'text-warning'
                        }`} />
                      </div>
                      <div>
                        <h3 className="font-semibold">Payment #{payment.payment_number}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {formatDate(payment.period_start)} - {formatDate(payment.period_end)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-property" />
                          <span className="font-semibold">{formatCurrency(payment.total_amount)}</span>
                        </div>
                        {payment.balance > 0 && (
                          <p className="text-sm text-muted-foreground">
                            Balance: {formatCurrency(payment.balance)}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Due: {formatDate(payment.due_date)}
                        </p>
                      </div>
                      <Badge className={statusColors[payment.status] || 'bg-muted'}>
                        {payment.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}