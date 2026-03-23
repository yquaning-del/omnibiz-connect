import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Product } from '@/types';
import { cn } from '@/lib/utils';
import {
  Search,
  Plus,
  Package,
  Loader2,
  Edit,
  Trash2,
  MoreVertical,
  Globe,
  X,
  Download,
} from 'lucide-react';
import { exportToCSV, ExportColumn } from '@/lib/export';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Products() {
  const { currentOrganization, currentLocation } = useAuth();
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCost, setFormCost] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formThreshold, setFormThreshold] = useState('10');
  const [formAvailableOnline, setFormAvailableOnline] = useState(false);
  
  // Variant state
  interface ProductVariant {
    name: string;
    value: string;
    price_adjustment: number;
    sku: string;
  }
  const [variants, setVariants] = useState<ProductVariant[]>([]);

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
      .order('name');

    if (error) {
      console.error('Error fetching products:', error);
    } else {
      setProducts(data as Product[]);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormName('');
    setFormSku('');
    setFormCategory('');
    setFormPrice('');
    setFormCost('');
    setFormStock('');
    setFormThreshold('10');
    setFormAvailableOnline(false);
    setVariants([]);
    setEditingProduct(null);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormSku(product.sku || '');
    setFormCategory(product.category || '');
    setFormPrice(product.unit_price.toString());
    setFormCost(product.cost_price?.toString() || '');
    setFormStock((product.stock_quantity ?? 0).toString());
    setFormThreshold(product.low_stock_threshold.toString());
    setFormAvailableOnline((product as any).is_available_online || false);
    
    // Load variants from metadata
    const productVariants = (product.metadata?.variants as ProductVariant[]) || [];
    setVariants(productVariants);
    
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization || !currentLocation) return;

    setSaving(true);

    try {
      // Prepare metadata with variants
      // Preserve existing metadata when editing
      const existingMetadata = editingProduct?.metadata || {};
      const metadata: Record<string, unknown> = { ...existingMetadata };
      
      if (variants.length > 0) {
        metadata.variants = variants;
      } else {
        // Remove variants if empty
        delete metadata.variants;
      }
      
      const productData = {
        name: formName.trim(),
        sku: formSku.trim() || null,
        category: formCategory.trim() || null,
        unit_price: parseFloat(formPrice) || 0,
        cost_price: parseFloat(formCost) || 0,
        stock_quantity: parseInt(formStock) || 0,
        low_stock_threshold: parseInt(formThreshold) || 10,
        organization_id: currentOrganization.id,
        location_id: currentLocation.id,
        vertical: currentLocation.vertical,
        is_available_online: formAvailableOnline,
        metadata: Object.keys(metadata).length > 0 ? (metadata as any) : (editingProduct ? existingMetadata : null),
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;

        toast({ title: 'Product updated successfully' });
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData);

        if (error) throw error;

        toast({ title: 'Product created successfully' });
      }

      setDialogOpen(false);
      resetForm();
      fetchProducts();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (product: Product) => {
    const confirmed = await confirm({ title: `Delete "${product.name}"?`, description: 'This action cannot be undone.', variant: 'destructive', confirmLabel: 'Delete' });
    if (!confirmed) return;

    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', product.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Product deleted' });
      fetchProducts();
    }
  };

  const toggleOnlineAvailability = async (product: Product) => {
    const newStatus = !(product as any).is_available_online;
    const { error } = await supabase
      .from('products')
      .update({ is_available_online: newStatus })
      .eq('id', product.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ 
        title: newStatus ? 'Available online' : 'Removed from online store',
        description: `${product.name} is now ${newStatus ? 'visible' : 'hidden'} in the online store.`
      });
      fetchProducts();
    }
  };

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const filteredProducts = products.filter(p =>
    p.is_active &&
    (p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
     p.sku?.toLowerCase().includes(debouncedSearch.toLowerCase()))
  );

  const totalItems = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

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
          <h1 className="text-2xl font-bold font-display text-foreground">Products</h1>
          <p className="text-muted-foreground">
            Manage your product catalog
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              const cols: ExportColumn<Product>[] = [
                { header: 'Name', accessor: (p) => p.name },
                { header: 'SKU', accessor: (p) => p.sku ?? '' },
                { header: 'Category', accessor: (p) => p.category ?? '' },
                { header: 'Price', accessor: (p) => p.unit_price },
                { header: 'Stock', accessor: (p) => p.stock_quantity ?? 0 },
                { header: 'Low Stock Threshold', accessor: (p) => p.low_stock_threshold },
                { header: 'Active', accessor: (p) => p.is_active ? 'Yes' : 'No' },
              ];
              exportToCSV('products', cols, products);
            }}
            disabled={products.length === 0}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Product name"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    placeholder="SKU-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="Category"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Selling Price *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost">Cost Price</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formCost}
                    onChange={(e) => setFormCost(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock Quantity</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="threshold">Low Stock Alert</Label>
                  <Input
                    id="threshold"
                    type="number"
                    min="0"
                    value={formThreshold}
                    onChange={(e) => setFormThreshold(e.target.value)}
                    placeholder="10"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="online">Available Online</Label>
                  <p className="text-sm text-muted-foreground">
                    Show this product in your online store
                  </p>
                </div>
                <Switch
                  id="online"
                  checked={formAvailableOnline}
                  onCheckedChange={setFormAvailableOnline}
                />
              </div>

              {/* Variants Section */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label>Product Variants</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setVariants([...variants, { name: '', value: '', price_adjustment: 0, sku: '' }])}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Variant
                  </Button>
                </div>
                
                {variants.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No variants added. Click "Add Variant" to create size, color, or other options.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {variants.map((variant, index) => (
                      <div key={index} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Variant {index + 1}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setVariants(variants.filter((_, i) => i !== index))}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label htmlFor={`variant-name-${index}`} className="text-xs">Name</Label>
                            <Input
                              id={`variant-name-${index}`}
                              placeholder="e.g., Size, Color"
                              value={variant.name}
                              onChange={(e) => {
                                const updated = [...variants];
                                updated[index].name = e.target.value;
                                setVariants(updated);
                              }}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`variant-value-${index}`} className="text-xs">Value</Label>
                            <Input
                              id={`variant-value-${index}`}
                              placeholder="e.g., Small, Red"
                              value={variant.value}
                              onChange={(e) => {
                                const updated = [...variants];
                                updated[index].value = e.target.value;
                                setVariants(updated);
                              }}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label htmlFor={`variant-price-${index}`} className="text-xs">Price Adjustment</Label>
                            <Input
                              id={`variant-price-${index}`}
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={variant.price_adjustment || ''}
                              onChange={(e) => {
                                const updated = [...variants];
                                updated[index].price_adjustment = parseFloat(e.target.value) || 0;
                                setVariants(updated);
                              }}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`variant-sku-${index}`} className="text-xs">SKU</Label>
                            <Input
                              id={`variant-sku-${index}`}
                              placeholder="Variant SKU"
                              value={variant.sku}
                              onChange={(e) => {
                                const updated = [...variants];
                                updated[index].sku = e.target.value;
                                setVariants(updated);
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : editingProduct ? (
                  'Update Product'
                ) : (
                  'Create Product'
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Products Grid */}
      {totalItems === 0 ? (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Package className="w-12 h-12 mb-4" />
            <p>No products found</p>
            <p className="text-sm">Add your first product to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedProducts.map(product => (
            <Card key={product.id} className="border-border/50 bg-card/50 hover:bg-card transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <Package className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(product)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleOnlineAvailability(product)}>
                        <Globe className="w-4 h-4 mr-2" />
                        {(product as any).is_available_online ? 'Remove from Online Store' : 'Add to Online Store'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => deleteProduct(product)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <h3 className="font-medium text-foreground mb-1 truncate">{product.name}</h3>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {product.sku && (
                    <span className="text-xs text-muted-foreground">SKU: {product.sku}</span>
                  )}
                  {(product as any).is_available_online && (
                    <Badge variant="secondary" className="text-xs">
                      <Globe className="w-3 h-3 mr-1" />
                      Online
                    </Badge>
                  )}
                  {(() => {
                    const productVariants = Array.isArray(product.metadata?.variants) ? product.metadata.variants : [];
                    return productVariants.length > 0 ? (
                      <Badge variant="outline" className="text-xs">
                        {productVariants.length} variant{productVariants.length !== 1 ? 's' : ''}
                      </Badge>
                    ) : null;
                  })()}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-primary">
                    ${product.unit_price.toFixed(2)}
                  </span>
                  <Badge 
                    variant="outline"
                    className={cn(
                      (product.stock_quantity ?? 0) <= product.low_stock_threshold
                        ? 'bg-warning/20 text-warning border-warning/30'
                        : 'bg-success/20 text-success border-success/30'
                    )}
                  >
                    {product.stock_quantity ?? 0} in stock
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalItems > 0 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} items
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
