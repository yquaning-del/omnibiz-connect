import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
import { toast } from 'sonner';
  Loader2,
  Search,
  FileText,
  DollarSign,
  CreditCard,
  Plus,
  Printer,
  CheckCircle2,
  Clock,
  AlertCircle,
  Receipt,
  Split,
  Trash2,
} from 'lucide-react';

interface GuestFolio {
  id: string;
  folio_number: string;
  guest_name: string;
  room_number: string | null;
  check_in: string | null;
  check_out: string | null;
  status: string;
  room_charges: number;
  incidental_charges: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  payment_method: string | null;
  created_at: string;
}

interface FolioCharge {
  id: string;
  folio_id: string;
  charge_type: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  posted_at: string;
  voided: boolean;
}

const chargeTypes = ['room', 'restaurant', 'minibar', 'spa', 'laundry', 'parking', 'telephone', 'other'];

const statusColors: Record<string, string> = {
  open: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  pending_payment: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  paid: 'bg-green-500/10 text-green-500 border-green-500/20',
  closed: 'bg-muted text-muted-foreground border-muted',
};

export default function Billing() {
  const { currentOrganization, currentLocation, user } = useAuth();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const [loading, setLoading] = useState(true);
  const [folios, setFolios] = useState<GuestFolio[]>([]);
  const [selectedFolio, setSelectedFolio] = useState<GuestFolio | null>(null);
  const [charges, setCharges] = useState<FolioCharge[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('open');
  const [chargeDialogOpen, setChargeDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [chargeForm, setChargeForm] = useState({
    charge_type: 'other',
    description: '',
    quantity: '1',
    unit_price: '',
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'credit_card',
  });

  useEffect(() => {
    if (currentOrganization) {
      fetchFolios();
    }
  }, [currentOrganization]);

  const fetchFolios = async () => {
    if (!currentOrganization) return;
    setLoading(true);

    const { data } = await supabase
      .from('guest_folios')
      .select('*')
      .eq('organization_id', currentOrganization.id)
      .order('created_at', { ascending: false });

    if (data) setFolios(data as GuestFolio[]);
    setLoading(false);
  };

  const fetchCharges = async (folioId: string) => {
    const { data } = await supabase
      .from('folio_charges')
      .select('*')
      .eq('folio_id', folioId)
      .order('posted_at', { ascending: false });

    if (data) setCharges(data as FolioCharge[]);
  };

  const openFolioDetails = async (folio: GuestFolio) => {
    setSelectedFolio(folio);
    await fetchCharges(folio.id);
  };

  const handleAddCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFolio || !user) return;
    setSaving(true);

    try {
      const quantity = parseInt(chargeForm.quantity);
      const unitPrice = parseFloat(chargeForm.unit_price);
      const totalAmount = quantity * unitPrice;

      const { error } = await supabase.from('folio_charges').insert({
        folio_id: selectedFolio.id,
        charge_type: chargeForm.charge_type,
        description: chargeForm.description,
        quantity: quantity,
        unit_price: unitPrice,
        total_amount: totalAmount,
        posted_by: user.id,
      });

      if (error) throw error;

      // Update folio totals
      const newIncidentals = selectedFolio.incidental_charges + totalAmount;
      const newTotal = selectedFolio.room_charges + newIncidentals + selectedFolio.tax_amount - selectedFolio.discount_amount;
      const newBalance = newTotal - selectedFolio.paid_amount;

      await supabase
        .from('guest_folios')
        .update({
          incidental_charges: newIncidentals,
          total_amount: newTotal,
          balance_due: newBalance,
        })
        .eq('id', selectedFolio.id);

      toast.success("Charge added successfully");
      setChargeDialogOpen(false);
      setChargeForm({ charge_type: 'other', description: '', quantity: '1', unit_price: '' });
      fetchFolios();
      fetchCharges(selectedFolio.id);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFolio) return;
    setSaving(true);

    try {
      const paymentAmount = parseFloat(paymentForm.amount);
      const newPaidAmount = selectedFolio.paid_amount + paymentAmount;
      const newBalance = selectedFolio.total_amount - newPaidAmount;
      const newStatus = newBalance <= 0 ? 'paid' : 'pending_payment';

      await supabase
        .from('guest_folios')
        .update({
          paid_amount: newPaidAmount,
          balance_due: Math.max(0, newBalance),
          payment_method: paymentForm.method,
          status: newStatus,
        })
        .eq('id', selectedFolio.id);

      toast.success("Payment recorded successfully");
      setPaymentDialogOpen(false);
      setPaymentForm({ amount: '', method: 'credit_card' });
      fetchFolios();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const voidCharge = async (chargeId: string, amount: number) => {
    if (!selectedFolio || !user) return;
    const confirmed = await confirm({ title: 'Void this charge?', description: 'This will reverse the charge amount.', variant: 'destructive', confirmLabel: 'Void Charge' }); if (!confirmed) return;

    try {
      await supabase
        .from('folio_charges')
        .update({
          voided: true,
          voided_by: user.id,
          voided_at: new Date().toISOString(),
          void_reason: 'Voided by staff',
        })
        .eq('id', chargeId);

      // Update folio totals
      const newIncidentals = selectedFolio.incidental_charges - amount;
      const newTotal = selectedFolio.room_charges + newIncidentals + selectedFolio.tax_amount - selectedFolio.discount_amount;
      const newBalance = newTotal - selectedFolio.paid_amount;

      await supabase
        .from('guest_folios')
        .update({
          incidental_charges: newIncidentals,
          total_amount: newTotal,
          balance_due: newBalance,
        })
        .eq('id', selectedFolio.id);

      toast.success("Charge voided");
      fetchFolios();
      fetchCharges(selectedFolio.id);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const filteredFolios = folios.filter((f) => {
    const matchesSearch =
      f.guest_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.folio_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.room_number?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'open') return matchesSearch && f.status === 'open';
    if (activeTab === 'pending') return matchesSearch && f.status === 'pending_payment';
    if (activeTab === 'closed') return matchesSearch && ['paid', 'closed'].includes(f.status);
    return matchesSearch;
  });

  const stats = {
    open: folios.filter((f) => f.status === 'open').length,
    pendingPayment: folios.filter((f) => f.status === 'pending_payment').length,
    totalOutstanding: folios.filter((f) => f.status !== 'closed').reduce((sum, f) => sum + f.balance_due, 0),
    todayRevenue: folios
      .filter((f) => new Date(f.created_at).toDateString() === new Date().toDateString())
      .reduce((sum, f) => sum + f.paid_amount, 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <ConfirmDialog />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Billing & Folios</h1>
          <p className="text-muted-foreground">Manage guest charges and invoicing</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search folios..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Folios</p>
                <p className="text-2xl font-bold">{stats.open}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Payment</p>
                <p className="text-2xl font-bold">{stats.pendingPayment}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold">${stats.totalOutstanding.toFixed(2)}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Revenue</p>
                <p className="text-2xl font-bold">${stats.todayRevenue.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Folios List */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="open">Open ({folios.filter((f) => f.status === 'open').length})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({folios.filter((f) => f.status === 'pending_payment').length})</TabsTrigger>
              <TabsTrigger value="closed">Closed</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              <div className="space-y-3">
                {filteredFolios.length === 0 ? (
                  <Card className="border-border/50 bg-card/50">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Receipt className="w-12 h-12 mb-4" />
                      <p>No folios found</p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredFolios.map((folio) => (
                    <Card
                      key={folio.id}
                      className={cn(
                        'border-border/50 bg-card/50 cursor-pointer transition-colors hover:bg-muted/50',
                        selectedFolio?.id === folio.id && 'ring-2 ring-primary'
                      )}
                      onClick={() => openFolioDetails(folio)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm text-muted-foreground">#{folio.folio_number}</span>
                              <Badge variant="outline" className={cn(statusColors[folio.status])}>
                                {folio.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            <p className="font-semibold mt-1">{folio.guest_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {folio.room_number && `Room ${folio.room_number} • `}
                              {folio.check_in && format(new Date(folio.check_in), 'MMM d')}
                              {folio.check_out && ` - ${format(new Date(folio.check_out), 'MMM d')}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">${folio.total_amount.toFixed(2)}</p>
                            {folio.balance_due > 0 && (
                              <p className="text-sm text-destructive">Due: ${folio.balance_due.toFixed(2)}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Folio Details */}
        <div>
          {selectedFolio ? (
            <Card className="border-border/50 bg-card/50 sticky top-6">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Folio Details</CardTitle>
                  <Button variant="ghost" size="icon">
                    <Printer className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground font-mono">#{selectedFolio.folio_number}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-semibold">{selectedFolio.guest_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedFolio.room_number && `Room ${selectedFolio.room_number}`}
                  </p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Room Charges</span>
                    <span>${selectedFolio.room_charges.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Incidentals</span>
                    <span>${selectedFolio.incidental_charges.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>${selectedFolio.tax_amount.toFixed(2)}</span>
                  </div>
                  {selectedFolio.discount_amount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-${selectedFolio.discount_amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold pt-2 border-t">
                    <span>Total</span>
                    <span>${selectedFolio.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paid</span>
                    <span className="text-green-600">${selectedFolio.paid_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Balance Due</span>
                    <span className={selectedFolio.balance_due > 0 ? 'text-destructive' : 'text-green-600'}>
                      ${selectedFolio.balance_due.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1" size="sm" onClick={() => setChargeDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Charge
                  </Button>
                  <Button
                    className="flex-1"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setPaymentForm({ ...paymentForm, amount: selectedFolio.balance_due.toString() });
                      setPaymentDialogOpen(true);
                    }}
                    disabled={selectedFolio.balance_due <= 0}
                  >
                    <CreditCard className="h-4 w-4 mr-1" />
                    Payment
                  </Button>
                </div>

                {/* Recent Charges */}
                <div>
                  <p className="text-sm font-medium mb-2">Recent Charges</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {charges.filter(c => !c.voided).slice(0, 5).map((charge) => (
                      <div key={charge.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                        <div>
                          <p className="font-medium">{charge.description}</p>
                          <p className="text-xs text-muted-foreground capitalize">{charge.charge_type}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>${charge.total_amount.toFixed(2)}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => voidCharge(charge.id, charge.total_amount)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50 bg-card/50">
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mb-4" />
                <p>Select a folio to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add Charge Dialog */}
      <Dialog open={chargeDialogOpen} onOpenChange={setChargeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Charge</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCharge} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Charge Type</Label>
                <Select
                  value={chargeForm.charge_type}
                  onValueChange={(v) => setChargeForm({ ...chargeForm, charge_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {chargeTypes.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={chargeForm.quantity}
                  onChange={(e) => setChargeForm({ ...chargeForm, quantity: e.target.value })}
                  min="1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Input
                value={chargeForm.description}
                onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Unit Price *</Label>
              <Input
                type="number"
                value={chargeForm.unit_price}
                onChange={(e) => setChargeForm({ ...chargeForm, unit_price: e.target.value })}
                step="0.01"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setChargeDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Add Charge
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePayment} className="space-y-4">
            <div className="space-y-2">
              <Label>Amount *</Label>
              <Input
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                step="0.01"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={paymentForm.method}
                onValueChange={(v) => setPaymentForm({ ...paymentForm, method: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="debit_card">Debit Card</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="room_charge">Room Charge</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Record Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
