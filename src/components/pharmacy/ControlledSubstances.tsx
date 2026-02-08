import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, AlertTriangle, Shield, Plus, Loader2 } from "lucide-react";

interface ControlledSubstanceLog {
  id: string;
  action: string;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  lot_number: string | null;
  expiry_date: string | null;
  notes: string | null;
  created_at: string;
  medications?: {
    name: string;
    controlled_substance_schedule: string;
  };
  products?: {
    name: string;
    sku: string;
  };
  profiles?: {
    full_name: string;
  };
}

const ControlledSubstances = () => {
  const { currentOrganization, currentLocation } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<ControlledSubstanceLog[]>([]);
  const [controlledProducts, setControlledProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newEntry, setNewEntry] = useState({
    product_id: "",
    action: "received",
    quantity_change: 0,
    lot_number: "",
    expiry_date: "",
    notes: ""
  });

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchData();
    }
  }, [currentOrganization?.id, currentLocation?.id]);

  const fetchData = async () => {
    try {
      // Fetch controlled substance logs
      const logsQuery = supabase
        .from('controlled_substance_log')
        .select(`
          *,
          medications (name, controlled_substance_schedule),
          products (name, sku)
        `)
        .eq('organization_id', currentOrganization!.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (currentLocation?.id) {
        logsQuery.eq('location_id', currentLocation.id);
      }

      // Fetch products that might be controlled substances
      const productsQuery = supabase
        .from('products')
        .select('*')
        .eq('organization_id', currentOrganization!.id)
        .eq('is_active', true)
        .eq('vertical', 'pharmacy');

      const [logsResult, productsResult] = await Promise.all([
        logsQuery,
        productsQuery
      ]);

      if (logsResult.error) throw logsResult.error;
      if (productsResult.error) throw productsResult.error;

      setLogs((logsResult.data || []).map((log: any) => ({
        ...log,
        medications: log.medications
          ? { ...log.medications, controlled_substance_schedule: log.medications.controlled_substance_schedule ?? '' }
          : undefined,
        products: log.products ?? undefined,
        profiles: log.profiles ?? undefined,
      })));
      setControlledProducts(productsResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: "Error", description: "Failed to load controlled substance data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogEntry = async () => {
    if (!newEntry.product_id || newEntry.quantity_change === 0) {
      toast({ title: "Error", description: "Please select a product and enter quantity", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Get current quantity
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', newEntry.product_id)
        .single();

      if (productError) throw productError;

      const currentQty = product?.stock_quantity || 0;
      const quantityChange = newEntry.action === 'received' 
        ? Math.abs(newEntry.quantity_change) 
        : -Math.abs(newEntry.quantity_change);
      const newQty = currentQty + quantityChange;

      // Get current user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        toast({ title: "Error", description: "You must be logged in", variant: "destructive" });
        setSaving(false);
        return;
      }

      if (!currentLocation) {
        toast({ title: "Error", description: "No location selected. Please select a location first.", variant: "destructive" });
        setSaving(false);
        return;
      }

      // Create log entry
      const { error: logError } = await supabase
        .from('controlled_substance_log')
        .insert({
          organization_id: currentOrganization!.id,
          location_id: currentLocation.id,
          product_id: newEntry.product_id,
          action: newEntry.action,
          quantity_change: quantityChange,
          quantity_before: currentQty,
          quantity_after: newQty,
          lot_number: newEntry.lot_number || null,
          expiry_date: newEntry.expiry_date || null,
          performed_by: authUser.id,
          notes: newEntry.notes || null
        } as any);

      if (logError) throw logError;

      // Update product quantity
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock_quantity: newQty })
        .eq('id', newEntry.product_id);

      if (updateError) throw updateError;

      toast({ title: "Success", description: "Controlled substance log entry created" });
      setDialogOpen(false);
      setNewEntry({
        product_id: "",
        action: "received",
        quantity_change: 0,
        lot_number: "",
        expiry_date: "",
        notes: ""
      });
      fetchData();
    } catch (error) {
      console.error('Error creating log entry:', error);
      toast({ title: "Error", description: "Failed to create log entry", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const getActionBadge = (action: string) => {
    const styles: Record<string, string> = {
      received: "bg-green-100 text-green-800",
      dispensed: "bg-blue-100 text-blue-800",
      destroyed: "bg-red-100 text-red-800",
      transferred: "bg-purple-100 text-purple-800",
      adjusted: "bg-yellow-100 text-yellow-800"
    };
    return <Badge className={styles[action] || "bg-gray-100"}>{action}</Badge>;
  };

  const filteredLogs = logs.filter(log =>
    log.products?.name?.toLowerCase().includes(search.toLowerCase()) ||
    log.medications?.name?.toLowerCase().includes(search.toLowerCase()) ||
    log.lot_number?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Warning Banner */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-600" />
            <CardTitle className="text-red-800">Controlled Substance Tracking</CardTitle>
          </div>
          <CardDescription className="text-red-700">
            All controlled substance transactions are logged for DEA compliance. 
            Maintain accurate records for Schedule II-V medications.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Transaction Log</CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Log Transaction
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Log Controlled Substance Transaction</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Product *</Label>
                    <Select
                      value={newEntry.product_id}
                      onValueChange={(v) => setNewEntry({ ...newEntry, product_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {controlledProducts.map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} ({product.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Action *</Label>
                      <Select
                        value={newEntry.action}
                        onValueChange={(v) => setNewEntry({ ...newEntry, action: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="received">Received</SelectItem>
                          <SelectItem value="dispensed">Dispensed</SelectItem>
                          <SelectItem value="destroyed">Destroyed</SelectItem>
                          <SelectItem value="transferred">Transferred</SelectItem>
                          <SelectItem value="adjusted">Adjusted</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity *</Label>
                      <Input
                        type="number"
                        value={newEntry.quantity_change}
                        onChange={(e) => setNewEntry({ ...newEntry, quantity_change: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Lot Number</Label>
                      <Input
                        value={newEntry.lot_number}
                        onChange={(e) => setNewEntry({ ...newEntry, lot_number: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Expiry Date</Label>
                      <Input
                        type="date"
                        value={newEntry.expiry_date}
                        onChange={(e) => setNewEntry({ ...newEntry, expiry_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={newEntry.notes}
                      onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                      placeholder="Additional notes for this transaction..."
                    />
                  </div>

                  <Button onClick={handleLogEntry} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Log Transaction
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by product or lot number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date/Time</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Qty Change</TableHead>
                <TableHead>Before → After</TableHead>
                <TableHead>Lot #</TableHead>
                <TableHead>Expiry</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">
                    {new Date(log.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span>{log.products?.name || log.medications?.name || 'Unknown'}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getActionBadge(log.action)}</TableCell>
                  <TableCell>
                    <span className={log.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}>
                      {log.quantity_change > 0 ? '+' : ''}{log.quantity_change}
                    </span>
                  </TableCell>
                  <TableCell>
                    {log.quantity_before} → {log.quantity_after}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {log.lot_number || '-'}
                  </TableCell>
                  <TableCell>
                    {log.expiry_date ? new Date(log.expiry_date).toLocaleDateString() : '-'}
                  </TableCell>
                </TableRow>
              ))}
              {filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No controlled substance transactions found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ControlledSubstances;
