import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Product } from '@/types';
import { cn } from '@/lib/utils';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  QrCode,
  ShoppingCart,
  Package,
  Loader2,
  Percent,
  Receipt,
  Printer,
  X,
  Check,
} from 'lucide-react';

interface CartItem {
  product: Product;
  quantity: number;
}

interface ReceiptData {
  orderNumber: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  date: Date;
}

export default function POS() {
  const { currentOrganization, currentLocation, user } = useAuth();
  const { toast } = useToast();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // Discount state
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  
  // Receipt state
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentOrganization) return;

    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching products:', error);
      } else {
        setProducts(data as Product[]);
      }
      setLoading(false);
    };

    fetchProducts();
  }, [currentOrganization]);

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQuantity = item.quantity + delta;
          if (newQuantity <= 0) return item;
          return { ...item, quantity: newQuantity };
        }
        return item;
      });
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountValue('');
    setShowDiscountInput(false);
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.product.unit_price * item.quantity), 0);
  
  // Calculate discount
  const discountAmount = discountValue
    ? discountType === 'percent'
      ? (subtotal * parseFloat(discountValue || '0')) / 100
      : parseFloat(discountValue || '0')
    : 0;
  
  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const taxRate = 0.1; // 10% tax
  const tax = afterDiscount * taxRate;
  const total = afterDiscount + tax;

  const applyDiscount = () => {
    if (!discountValue) return;
    setShowDiscountInput(false);
    toast({ title: `Discount applied: ${discountType === 'percent' ? discountValue + '%' : '$' + discountValue}` });
  };

  const processPayment = async (paymentMethod: string) => {
    if (!currentOrganization || !currentLocation || !user || cart.length === 0) return;

    setProcessing(true);

    try {
      const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          organization_id: currentOrganization.id,
          location_id: currentLocation.id,
          order_number: orderNumber,
          vertical: currentLocation.vertical,
          status: 'completed',
          subtotal: subtotal,
          tax_amount: tax,
          discount_amount: discountAmount,
          total_amount: total,
          payment_method: paymentMethod,
          payment_status: 'paid',
          created_by: user.id,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cart.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.unit_price,
        total_price: item.product.unit_price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Update stock
      for (const item of cart) {
        await supabase
          .from('products')
          .update({ stock_quantity: item.product.stock_quantity - item.quantity })
          .eq('id', item.product.id);
      }

      // Generate receipt
      setReceiptData({
        orderNumber,
        items: [...cart],
        subtotal,
        discount: discountAmount,
        tax,
        total,
        paymentMethod,
        date: new Date(),
      });
      setShowReceipt(true);

      toast({
        title: 'Payment successful!',
        description: `Order ${orderNumber} completed. Total: $${total.toFixed(2)}`,
      });

      clearCart();
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        variant: 'destructive',
        title: 'Payment failed',
        description: error.message || 'An error occurred processing the payment.',
      });
    } finally {
      setProcessing(false);
    }
  };

  const printReceipt = () => {
    if (receiptRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Receipt</title>
              <style>
                body { font-family: monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 20px; }
                .items { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; }
                .item { display: flex; justify-content: space-between; margin: 5px 0; }
                .totals { margin-top: 10px; }
                .total-row { display: flex; justify-content: space-between; }
                .grand-total { font-weight: bold; font-size: 1.2em; margin-top: 10px; }
                .footer { text-align: center; margin-top: 20px; font-size: 0.8em; }
              </style>
            </head>
            <body>${receiptRef.current.innerHTML}</body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6 animate-fade-in">
      {/* Products Grid */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="space-y-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search products or scan barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-lg"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              All
            </Button>
            {categories.map(cat => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat || null)}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Package className="w-12 h-12 mb-4" />
              <p>No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredProducts.map(product => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={product.stock_quantity <= 0}
                  className={cn(
                    'relative flex flex-col p-4 rounded-xl border border-border/50',
                    'bg-card/50 backdrop-blur transition-all duration-200',
                    'hover:bg-card hover:border-primary/30 hover:shadow-lg',
                    'active:scale-[0.97] text-left',
                    product.stock_quantity <= 0 && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {product.image_url ? (
                    <div className="w-full aspect-square rounded-lg bg-muted mb-3 overflow-hidden">
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-full aspect-square rounded-lg bg-muted/50 mb-3 flex items-center justify-center">
                      <Package className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  
                  <p className="font-medium text-foreground text-sm truncate">{product.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-lg font-bold text-primary">${product.unit_price.toFixed(2)}</span>
                    <span className="text-xs text-muted-foreground">{product.stock_quantity} left</span>
                  </div>

                  {product.stock_quantity <= product.low_stock_threshold && product.stock_quantity > 0 && (
                    <Badge variant="outline" className="absolute top-2 right-2 bg-warning/20 text-warning border-warning/30 text-xs">
                      Low
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart Panel */}
      <Card className="w-96 shrink-0 flex flex-col border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Current Order</CardTitle>
            </div>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart}>Clear</Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <ShoppingCart className="w-10 h-10 mb-2" />
                <p>Cart is empty</p>
                <p className="text-sm">Tap products to add</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.product.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{item.product.name}</p>
                    <p className="text-sm text-muted-foreground">${item.product.unit_price.toFixed(2)} each</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.product.id, -1)}>
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.product.id, 1)}>
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeFromCart(item.product.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-border/50 p-4 space-y-4">
            {/* Discount Section */}
            {showDiscountInput ? (
              <div className="flex gap-2">
                <div className="flex-1 flex gap-1">
                  <Button
                    variant={discountType === 'percent' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDiscountType('percent')}
                  >
                    <Percent className="w-3 h-3" />
                  </Button>
                  <Button
                    variant={discountType === 'fixed' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDiscountType('fixed')}
                  >
                    $
                  </Button>
                  <Input
                    type="number"
                    placeholder="0"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-20 h-8"
                  />
                </div>
                <Button size="sm" onClick={applyDiscount}><Check className="w-4 h-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => setShowDiscountInput(false)}><X className="w-4 h-4" /></Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowDiscountInput(true)}
                disabled={cart.length === 0}
              >
                <Percent className="w-4 h-4 mr-2" />
                Add Discount
              </Button>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-success">
                  <span>Discount</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Tax (10%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-foreground pt-2 border-t border-border/50">
                <span>Total</span>
                <span className="text-primary">${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" className="flex flex-col gap-1 h-auto py-3" disabled={cart.length === 0 || processing} onClick={() => processPayment('cash')}>
                <Banknote className="w-5 h-5" />
                <span className="text-xs">Cash</span>
              </Button>
              <Button variant="outline" className="flex flex-col gap-1 h-auto py-3" disabled={cart.length === 0 || processing} onClick={() => processPayment('card')}>
                <CreditCard className="w-5 h-5" />
                <span className="text-xs">Card</span>
              </Button>
              <Button variant="outline" className="flex flex-col gap-1 h-auto py-3" disabled={cart.length === 0 || processing} onClick={() => processPayment('qr')}>
                <QrCode className="w-5 h-5" />
                <span className="text-xs">QR Pay</span>
              </Button>
            </div>

            <Button className="w-full h-14 text-lg" disabled={cart.length === 0 || processing} onClick={() => processPayment('card')}>
              {processing ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Processing...</>
              ) : (
                <>Pay ${total.toFixed(2)}</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Receipt
            </DialogTitle>
          </DialogHeader>
          
          {receiptData && (
            <div ref={receiptRef} className="font-mono text-sm">
              <div className="text-center mb-4">
                <h3 className="font-bold text-lg">{currentOrganization?.name}</h3>
                <p className="text-muted-foreground text-xs">{currentLocation?.address}</p>
                <p className="text-muted-foreground text-xs">{receiptData.date.toLocaleString()}</p>
              </div>
              
              <div className="border-t border-dashed py-3 space-y-2">
                {receiptData.items.map((item, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{item.quantity}x {item.product.name}</span>
                    <span>${(item.product.unit_price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-dashed py-3 space-y-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>${receiptData.subtotal.toFixed(2)}</span>
                </div>
                {receiptData.discount > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Discount</span>
                    <span>-${receiptData.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax</span>
                  <span>${receiptData.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2">
                  <span>TOTAL</span>
                  <span>${receiptData.total.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="text-center text-muted-foreground text-xs mt-4">
                <p>Order #{receiptData.orderNumber}</p>
                <p>Paid by {receiptData.paymentMethod.toUpperCase()}</p>
                <p className="mt-2">Thank you for your business!</p>
              </div>
            </div>
          )}
          
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={printReceipt}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button className="flex-1" onClick={() => setShowReceipt(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
