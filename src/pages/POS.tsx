import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Product } from '@/types';
import { cn } from '@/lib/utils';
import { BarcodeScanner } from '@/components/pos/BarcodeScanner';
import { OfflineIndicator } from '@/components/pos/OfflineIndicator';
import { TipInput } from '@/components/pos/TipInput';
import { EmployeePinLogin } from '@/components/pos/EmployeePinLogin';
import { useIsMobile } from '@/hooks/use-mobile';
import { useOfflinePOS } from '@/hooks/useOfflinePOS';
import { toast } from 'sonner';
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
  ScanLine,
  Smartphone,
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
  tip: number;
  tax: number;
  total: number;
  paymentMethod: string;
  date: Date;
  offline?: boolean;
}

export default function POS() {
  const { currentOrganization, currentLocation, user } = useAuth();
  const isRestaurant = currentLocation?.vertical === 'restaurant';

  // Table assignment state (restaurant vertical) — must be declared before useOfflinePOS
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [orderType, setOrderType] = useState<'dine_in' | 'takeout' | 'delivery'>('dine_in');
  const [tables, setTables] = useState<Array<{ id: string; table_number: string; status: string; capacity: number }>>([]);

  // Use offline-capable POS hook
  const {
    products,
    loading,
    isOnline,
    offlineMode,
    syncStatus,
    processOrder,
    requestSync,
  } = useOfflinePOS({
    organizationId: currentOrganization?.id,
    locationId: currentLocation?.id,
    vertical: currentLocation?.vertical,
    userId: user?.id,
    tableId: selectedTableId || undefined,
    orderType,
  });
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  
  // Discount state
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  
  // Tip state (restaurant vertical)
  const [tipAmount, setTipAmount] = useState(0);

  // Fetch restaurant tables
  useEffect(() => {
    if (isRestaurant && currentLocation?.id) {
      supabase
        .from('restaurant_tables')
        .select('id, table_number, status, capacity')
        .eq('location_id', currentLocation.id)
        .order('table_number')
        .then(({ data }) => {
          if (data) setTables(data);
        });
    }
  }, [isRestaurant, currentLocation?.id]);
  
  // Receipt state
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  
  // Barcode scanner state
  const [showScanner, setShowScanner] = useState(false);
  const isMobile = useIsMobile();
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  
  // Employee PIN login state
  const [activeEmployeeId, setActiveEmployeeId] = useState<string | undefined>(user?.id);
  const [activeEmployeeEmail, setActiveEmployeeEmail] = useState<string | undefined>(user?.email || undefined);

  const handleEmployeeLogin = (userId: string, email: string) => {
    setActiveEmployeeId(userId);
    setActiveEmployeeEmail(email);
    toast.success(`Switched to ${email}`);
  };

  const handleBarcodeScan = (barcode: string) => {
    // Search for product by SKU or barcode
    const product = products.find(p => 
      p.sku?.toLowerCase() === barcode.toLowerCase() ||
      p.barcode === barcode
    );
    
    if (product) {
      addToCart(product);
    } else {
      // Set search query to barcode for manual lookup
      setSearchQuery(barcode);
      toast.error("Product not found", { description: `No product found with barcode: ${barcode}` });
    }
  };

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
    setTipAmount(0);
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.product.unit_price * item.quantity), 0);
  
  // Calculate discount
  const discountAmount = discountValue
    ? discountType === 'percent'
      ? (subtotal * parseFloat(discountValue || '0')) / 100
      : parseFloat(discountValue || '0')
    : 0;
  
  const afterDiscount = Math.max(0, subtotal - discountAmount);
  // Tax rate from org/location settings, default to 0% if not configured
  const orgSettings = currentOrganization?.settings as Record<string, unknown> | undefined;
  const taxRate = typeof orgSettings?.tax_rate === 'number' ? orgSettings.tax_rate / 100 : 0;
  const tax = afterDiscount * taxRate;
  const total = afterDiscount + tax + tipAmount;

  const applyDiscount = () => {
    if (!discountValue) return;
    setShowDiscountInput(false);
    toast.success(`Discount applied: ${discountType === 'percent' ? discountValue + '%' : '$' + discountValue}`);
  };

  const handlePayment = async (paymentMethod: string) => {
    if (cart.length === 0) return;

    setProcessing(true);

    try {
      const result = await processOrder(
        cart,
        subtotal,
        tax,
        discountAmount,
        total - tipAmount, // Total without tip for order processing
        paymentMethod
      );

      // Generate receipt
      setReceiptData({
        orderNumber: result.orderNumber,
        items: [...cart],
        subtotal,
        discount: discountAmount,
        tip: tipAmount,
        tax,
        total,
        paymentMethod,
        date: new Date(),
        offline: result.offline,
      });
      setShowReceipt(true);

      if (!result.offline) {
        toast.success("Payment successful!", { description: `Order ${result.orderNumber} completed. Total: $${total.toFixed(2)}` });
      }

      clearCart();
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error("Payment failed");
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

  // Cart content component for reuse
  const CartContent = () => (
    <>
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

        {/* Tip Section (Restaurant only) */}
        {isRestaurant && cart.length > 0 && (
          <div className="border-t border-border/50 pt-3">
            <TipInput
              subtotal={afterDiscount}
              tipAmount={tipAmount}
              onTipChange={setTipAmount}
            />
          </div>
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
            <span>Tax ({(taxRate * 100).toFixed(0)}%)</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          {tipAmount > 0 && (
            <div className="flex justify-between text-info">
              <span>Tip</span>
              <span>${tipAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-xl font-bold text-foreground pt-2 border-t border-border/50">
            <span>Total</span>
            <span className="text-primary">${total.toFixed(2)}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" className="flex flex-col gap-1 h-auto py-3" disabled={cart.length === 0 || processing} onClick={() => handlePayment('cash')}>
            <Banknote className="w-5 h-5" />
            <span className="text-xs">Cash</span>
          </Button>
          <Button variant="outline" className="flex flex-col gap-1 h-auto py-3" disabled={cart.length === 0 || processing} onClick={() => handlePayment('card')}>
            <CreditCard className="w-5 h-5" />
            <span className="text-xs">Card</span>
          </Button>
          <Button variant="outline" className="flex flex-col gap-1 h-auto py-3" disabled={cart.length === 0 || processing} onClick={() => handlePayment('mobile_money')}>
            <Smartphone className="w-5 h-5" />
            <span className="text-xs">M-Pesa</span>
          </Button>
        </div>

        <Button className="w-full h-14 text-lg" disabled={cart.length === 0 || processing} onClick={() => handlePayment('card')}>
          {processing ? (
            <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Processing...</>
          ) : (
            <>Pay ${total.toFixed(2)}</>
          )}
        </Button>
      </div>
    </>
  );

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-4 lg:gap-6 animate-fade-in">
      {/* Products Grid */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="space-y-4 mb-4">
          {/* Offline indicator, employee switch, and search */}
          <div className="flex gap-2 items-center">
            <OfflineIndicator
              isOnline={isOnline}
              offlineMode={offlineMode}
              syncStatus={syncStatus}
              onSync={requestSync}
            />
            <EmployeePinLogin 
              onLoginSuccess={handleEmployeeLogin}
              currentUserId={activeEmployeeId}
            />
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-lg"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 shrink-0"
              onClick={() => setShowScanner(true)}
            >
              <ScanLine className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Restaurant: Order type and table selection */}
          {isRestaurant && (
            <div className="flex gap-2 items-center">
              <Select value={orderType} onValueChange={(v: 'dine_in' | 'takeout' | 'delivery') => { setOrderType(v); if (v !== 'dine_in') setSelectedTableId(''); }}>
                <SelectTrigger className="w-32 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dine_in">Dine In</SelectItem>
                  <SelectItem value="takeout">Takeout</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                </SelectContent>
              </Select>
              {orderType === 'dine_in' && (
                <Select value={selectedTableId} onValueChange={setSelectedTableId}>
                  <SelectTrigger className="w-40 h-9">
                    <SelectValue placeholder="Select Table" />
                  </SelectTrigger>
                  <SelectContent>
                    {tables.filter(t => t.status === 'available').map((table) => (
                      <SelectItem key={table.id} value={table.id}>
                        Table {table.table_number} ({table.capacity} seats)
                      </SelectItem>
                    ))}
                    {tables.filter(t => t.status !== 'available').map((table) => (
                      <SelectItem key={table.id} value={table.id} disabled>
                        Table {table.table_number} ({table.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

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
                  disabled={(product.stock_quantity ?? 0) <= 0}
                  className={cn(
                    'relative flex flex-col p-4 rounded-xl border border-border/50',
                    'bg-card/50 backdrop-blur transition-all duration-200',
                    'hover:bg-card hover:border-primary/30 hover:shadow-lg',
                    'active:scale-[0.97] text-left',
                    (product.stock_quantity ?? 0) <= 0 && 'opacity-50 cursor-not-allowed'
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
                    <span className="text-xs text-muted-foreground">{product.stock_quantity ?? 0} left</span>
                  </div>

                  {(product.stock_quantity ?? 0) <= product.low_stock_threshold && (product.stock_quantity ?? 0) > 0 && (
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

      {/* Desktop Cart Panel */}
      <Card className="hidden lg:flex w-96 shrink-0 flex-col border-border/50 bg-card/50 backdrop-blur">
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
          <CartContent />
        </CardContent>
      </Card>

      {/* Mobile Cart Button & Sheet */}
      {isMobile && (
        <>
          <div className="fixed bottom-4 left-4 right-4 z-50 lg:hidden">
            <Sheet open={mobileCartOpen} onOpenChange={setMobileCartOpen}>
              <SheetTrigger asChild>
                <Button className="w-full h-14 text-lg shadow-lg relative">
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  {cart.length > 0 ? (
                    <>
                      View Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)}) - ${total.toFixed(2)}
                    </>
                  ) : (
                    'Cart is empty'
                  )}
                  {cart.length > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-6 w-6 p-0 flex items-center justify-center">
                      {cart.reduce((sum, item) => sum + item.quantity, 0)}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0">
                <SheetHeader className="p-4 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <SheetTitle className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-primary" />
                      Current Order
                    </SheetTitle>
                    {cart.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearCart}>Clear</Button>
                    )}
                  </div>
                </SheetHeader>
                <div className="flex-1 flex flex-col overflow-hidden">
                  <CartContent />
                </div>
              </SheetContent>
            </Sheet>
          </div>
          {/* Spacer for mobile to prevent cart button overlay */}
          <div className="h-20 lg:hidden" />
        </>
      )}

      {/* Barcode Scanner */}
      <BarcodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScan}
      />

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
                {receiptData.tip > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tip</span>
                    <span>${receiptData.tip.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2">
                  <span>TOTAL</span>
                  <span>${receiptData.total.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="text-center text-muted-foreground text-xs mt-4">
                <p>Order #{receiptData.orderNumber}</p>
                <p>Paid by {receiptData.paymentMethod.toUpperCase()}</p>
                {receiptData.offline && (
                  <p className="text-warning mt-1">⏳ Pending sync</p>
                )}
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
