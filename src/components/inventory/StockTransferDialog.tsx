import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight, Loader2, Package } from 'lucide-react';
import { toast } from 'sonner';

interface Location {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  stock_quantity: number;
  sku: string | null;
}

interface StockTransferDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function StockTransferDialog({ open, onClose, onSuccess }: StockTransferDialogProps) {
  const { currentOrganization, user } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open && currentOrganization?.id) {
      fetchLocations();
      fetchProducts();
    }
  }, [open, currentOrganization?.id]);

  const fetchLocations = async () => {
    if (!currentOrganization?.id) return;

    const { data, error } = await supabase
      .from('locations')
      .select('id, name')
      .eq('organization_id', currentOrganization.id)
      .eq('is_active', true);

    if (!error && data) {
      setLocations(data);
    }
  };

  const fetchProducts = async () => {
    if (!currentOrganization?.id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('products')
      .select('id, name, stock_quantity, sku')
      .eq('organization_id', currentOrganization.id)
      .eq('is_active', true)
      .gt('stock_quantity', 0)
      .order('name');

    if (!error && data) {
      setProducts(data.map(p => ({
        ...p,
        stock_quantity: p.stock_quantity ?? 0,
      })));
    }
    setLoading(false);
  };

  const selectedProduct = products.find((p) => p.id === productId);
  const maxQuantity = selectedProduct?.stock_quantity ?? 0;

  const handleSubmit = async () => {
    if (!fromLocationId || !toLocationId || !productId || !quantity) {
      toast.error("Missing fields", { description: "Please fill in all required fields." });
      return;
    }

    if (fromLocationId === toLocationId) {
      toast.error("Invalid transfer", { description: "Source and destination locations must be different." });
      return;
    }

    const qty = parseInt(quantity);
    if (qty <= 0 || qty > maxQuantity) {
      toast({
        variant: 'destructive',
        title: 'Invalid quantity',
        description: `Quantity must be between 1 and ${maxQuantity}.`,
      });
      return;
    }

    setSaving(true);
    try {
      // Create transfer record
      const { error: transferError } = await supabase.from('stock_transfers').insert({
        organization_id: currentOrganization!.id,
        product_id: productId,
        from_location_id: fromLocationId,
        to_location_id: toLocationId,
        quantity: qty,
        notes: notes || null,
        initiated_by: user?.id,
        status: 'completed',
        completed_at: new Date().toISOString(),
      });

      if (transferError) throw transferError;

      // Update product stock (deduct from source)
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock_quantity: maxQuantity - qty })
        .eq('id', productId);

      if (updateError) throw updateError;

      toast({
        title: 'Stock transferred',
        description: `Successfully transferred ${qty} units of ${selectedProduct?.name}.`,
      });

      resetForm();
      onClose();
      onSuccess?.();
    } catch (error: any) {
      console.error('Transfer error:', error);
      toast({
        variant: 'destructive',
        title: 'Transfer failed',
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFromLocationId('');
    setToLocationId('');
    setProductId('');
    setQuantity('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Transfer Stock
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Locations */}
          <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-end">
            <div className="space-y-2">
              <Label>From Location</Label>
              <Select value={fromLocationId} onValueChange={setFromLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ArrowRight className="h-5 w-5 text-muted-foreground mb-2" />

            <div className="space-y-2">
              <Label>To Location</Label>
              <Select value={toLocationId} onValueChange={setToLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Destination" />
                </SelectTrigger>
                <SelectContent>
                  {locations
                    .filter((loc) => loc.id !== fromLocationId)
                    .map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Product */}
          <div className="space-y-2">
            <Label>Product</Label>
            <Select value={productId} onValueChange={setProductId} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder={loading ? 'Loading...' : 'Select product'} />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    <div className="flex items-center justify-between gap-4">
                      <span>{product.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({product.stock_quantity} in stock)
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input
              type="number"
              min="1"
              max={maxQuantity}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={`Max: ${maxQuantity}`}
              disabled={!productId}
            />
            {selectedProduct && (
              <p className="text-xs text-muted-foreground">
                Available: {selectedProduct.stock_quantity} units
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add transfer notes..."
              rows={2}
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Transferring...
              </>
            ) : (
              'Transfer Stock'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
