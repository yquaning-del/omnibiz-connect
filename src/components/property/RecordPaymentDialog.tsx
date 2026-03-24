import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { toast } from 'sonner';

interface Tenant {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
}

interface Lease {
  id: string;
  monthly_rent: number;
  tenant_id: string;
  unit_id: string;
  tenants?: Tenant;
  property_units?: { unit_number: string };
}

interface RecordPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedLeaseId?: string;
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'card', label: 'Credit/Debit Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'other', label: 'Other' },
];

export function RecordPaymentDialog({
  open,
  onClose,
  onSuccess,
  preselectedLeaseId,
}: RecordPaymentDialogProps) {
  const { currentOrganization } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leases, setLeases] = useState<Lease[]>([]);
  
  const [selectedLeaseId, setSelectedLeaseId] = useState(preselectedLeaseId || '');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open && currentOrganization?.id) {
      fetchLeases();
    }
  }, [open, currentOrganization?.id]);

  useEffect(() => {
    if (preselectedLeaseId) {
      setSelectedLeaseId(preselectedLeaseId);
    }
  }, [preselectedLeaseId]);

  // Auto-fill amount when lease is selected
  useEffect(() => {
    if (selectedLeaseId) {
      const lease = leases.find(l => l.id === selectedLeaseId);
      if (lease) {
        setAmount(lease.monthly_rent.toString());
      }
    }
  }, [selectedLeaseId, leases]);

  const fetchLeases = async () => {
    if (!currentOrganization?.id) return;
    setLoading(true);

    try {
      const { data, error } = await (supabase as any)
        .from('leases')
        .select(`
          id,
          monthly_rent,
          tenant_id,
          unit_id,
          tenants (id, first_name, last_name, email),
          property_units (unit_number)
        `)
        .eq('organization_id', currentOrganization.id)
        .eq('status', 'active');

      if (error) throw error;
      setLeases(data || []);
    } catch (error: any) {
      toast.error("Error loading leases", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization?.id || !selectedLeaseId || !amount || !paymentMethod) return;

    setSubmitting(true);

    try {
      const selectedLease = leases.find(l => l.id === selectedLeaseId);
      if (!selectedLease) throw new Error('Lease not found');

      const { error } = await (supabase as any)
        .from('rent_payments')
        .insert({
          organization_id: currentOrganization.id,
          lease_id: selectedLeaseId,
          tenant_id: selectedLease.tenant_id,
          amount: parseFloat(amount),
          payment_method: paymentMethod,
          payment_date: paymentDate,
          status: 'completed',
          notes: notes || null,
        });

      if (error) throw error;

      toast.success("Payment recorded", { description: `${formatCurrency(parseFloat(amount))} payment recorded successfully.` });

      // Reset form
      setSelectedLeaseId(preselectedLeaseId || '');
      setAmount('');
      setPaymentMethod('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setNotes('');

      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error("Error recording payment", { description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedLease = leases.find(l => l.id === selectedLeaseId);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Record Rent Payment
          </DialogTitle>
          <DialogDescription>
            Record a rent payment for an active lease.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Lease Selection */}
            <div className="space-y-2">
              <Label htmlFor="lease">Lease / Tenant</Label>
              <Select value={selectedLeaseId} onValueChange={setSelectedLeaseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a lease..." />
                </SelectTrigger>
                <SelectContent>
                  {leases.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No active leases found
                    </SelectItem>
                  ) : (
                    leases.map((lease) => (
                      <SelectItem key={lease.id} value={lease.id}>
                        {lease.tenants?.first_name} {lease.tenants?.last_name} - 
                        Unit {lease.property_units?.unit_number || 'N/A'} 
                        ({formatCurrency(lease.monthly_rent)}/mo)
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              {selectedLease && (
                <p className="text-xs text-muted-foreground">
                  Monthly rent: {formatCurrency(selectedLease.monthly_rent)}
                </p>
              )}
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method..." />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Date */}
            <div className="space-y-2">
              <Label htmlFor="paymentDate">Payment Date</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this payment..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={submitting || !selectedLeaseId || !amount || !paymentMethod}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Payment
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
