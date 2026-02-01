import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Product } from '@/types';
import { cn } from '@/lib/utils';
import {
  Search,
  Warehouse,
  Loader2,
  Package,
  AlertTriangle,
  Plus,
  Minus,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
} from 'lucide-react';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { StockTransferDialog } from '@/components/inventory/StockTransferDialog';

export default function Inventory() {
  const { currentOrganization } = useAuth();
  const { toast } = useToast();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustmentQty, setAdjustmentQty] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentOrganization) return;
    fetchProducts();
  }, [currentOrganization]);

  const fetchProducts = async () => {
    if (!currentOrganization) return;
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('organization_id', currentOrganization.id)
      .eq('is_active', true)
      .order('stock_quantity', { ascending: true });

    if (error) {
      console.error('Error fetching products:', error);
    } else {
      setProducts(data as Product[]);
    }
    setLoading(false);
  };

  const openAdjustDialog = (product: Product, type: 'add' | 'remove') => {
    setSelectedProduct(product);
    setAdjustmentType(type);
    setAdjustmentQty('');
    setAdjustDialogOpen(true);
  };

  const handleAdjustment = async () => {
    if (!selectedProduct || !adjustmentQty) return;

    setSaving(true);
    const qty = parseInt(adjustmentQty);
    const newStock = adjustmentType === 'add' 
      ? selectedProduct.stock_quantity + qty
      : Math.max(0, selectedProduct.stock_quantity - qty);

    const { error } = await supabase
      .from('products')
      .update({ stock_quantity: newStock })
      .eq('id', selectedProduct.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ 
        title: 'Stock updated', 
        description: `${selectedProduct.name}: ${selectedProduct.stock_quantity} → ${newStock}` 
      });
      fetchProducts();
      setAdjustDialogOpen(false);
    }
    setSaving(false);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockProducts = products.filter(p => p.stock_quantity <= p.low_stock_threshold);
  const outOfStock = products.filter(p => p.stock_quantity === 0);
  const totalValue = products.reduce((sum, p) => sum + (p.stock_quantity * p.unit_price), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <FeatureGate feature="inventory_management" requiredTier="Professional">
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Inventory</h1>
            <p className="text-muted-foreground">
              Track and manage your stock levels
            </p>
          </div>
          <Button onClick={() => setTransferDialogOpen(true)} variant="outline">
            <ArrowLeftRight className="w-4 h-4 mr-2" />
            Transfer Stock
          </Button>
        </div>

        {/* Stock Transfer Dialog */}
        <StockTransferDialog
          open={transferDialogOpen}
          onClose={() => setTransferDialogOpen(false)}
          onSuccess={fetchProducts}
        />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border/50 bg-card/50 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-xl font-bold text-foreground">{products.length}</p>
              </div>
            </div>
          </Card>
          <Card className="border-border/50 bg-card/50 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-xl font-bold text-warning">{lowStockProducts.length}</p>
              </div>
            </div>
          </Card>
          <Card className="border-border/50 bg-card/50 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center">
                <Package className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Out of Stock</p>
                <p className="text-xl font-bold text-destructive">{outOfStock.length}</p>
              </div>
            </div>
          </Card>
          <Card className="border-border/50 bg-card/50 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                <Warehouse className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-xl font-bold text-foreground">${totalValue.toFixed(2)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search inventory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Inventory Table */}
        {filteredProducts.length === 0 ? (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Warehouse className="w-12 h-12 mb-4" />
              <p>No products found</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/50 bg-card/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Product
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Min Level
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Value
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(product => {
                    const isLowStock = product.stock_quantity <= product.low_stock_threshold;
                    const isOutOfStock = product.stock_quantity === 0;
                    
                    return (
                      <tr 
                        key={product.id} 
                        className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                              {product.image_url ? (
                                <img src={product.image_url} alt="" className="w-full h-full object-cover rounded-lg" />
                              ) : (
                                <Package className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{product.name}</p>
                              {product.category && (
                                <p className="text-xs text-muted-foreground">{product.category}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground font-mono">
                          {product.sku || '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge 
                            variant="outline"
                            className={cn(
                              isOutOfStock
                                ? 'bg-destructive/20 text-destructive border-destructive/30'
                                : isLowStock
                                ? 'bg-warning/20 text-warning border-warning/30'
                                : 'bg-success/20 text-success border-success/30'
                            )}
                          >
                            {product.stock_quantity}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center text-sm text-muted-foreground">
                          {product.low_stock_threshold}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-foreground">
                          ${(product.stock_quantity * product.unit_price).toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-success hover:text-success hover:bg-success/20"
                              onClick={() => openAdjustDialog(product, 'add')}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/20"
                              onClick={() => openAdjustDialog(product, 'remove')}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Stock Adjustment Dialog */}
        <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {adjustmentType === 'add' ? (
                  <TrendingUp className="w-5 h-5 text-success" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-destructive" />
                )}
                {adjustmentType === 'add' ? 'Add Stock' : 'Remove Stock'}
              </DialogTitle>
            </DialogHeader>

            {selectedProduct && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="font-medium text-foreground">{selectedProduct.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Current stock: {selectedProduct.stock_quantity}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qty">Quantity</Label>
                  <Input
                    id="qty"
                    type="number"
                    min="1"
                    value={adjustmentQty}
                    onChange={(e) => setAdjustmentQty(e.target.value)}
                    placeholder="Enter quantity"
                  />
                </div>

                {adjustmentQty && (
                  <div className="p-3 rounded-lg bg-muted/30 text-center">
                    <p className="text-sm text-muted-foreground">New stock level</p>
                    <p className="text-2xl font-bold text-foreground">
                      {adjustmentType === 'add'
                        ? selectedProduct.stock_quantity + parseInt(adjustmentQty || '0')
                        : Math.max(0, selectedProduct.stock_quantity - parseInt(adjustmentQty || '0'))
                      }
                    </p>
                  </div>
                )}

                <Button 
                  onClick={handleAdjustment} 
                  className="w-full" 
                  disabled={saving || !adjustmentQty}
                  variant={adjustmentType === 'add' ? 'default' : 'destructive'}
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : adjustmentType === 'add' ? (
                    <Plus className="w-4 h-4 mr-2" />
                  ) : (
                    <Minus className="w-4 h-4 mr-2" />
                  )}
                  {adjustmentType === 'add' ? 'Add Stock' : 'Remove Stock'}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </FeatureGate>
  );
}
