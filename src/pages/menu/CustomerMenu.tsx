import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { 
  Loader2, ShoppingCart, Plus, Minus, Search, 
  UtensilsCrossed, Leaf, Flame, Clock, ChefHat,
  Send, Trash2
} from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  description: string | null;
  unit_price: number;
  category: string | null;
  image_url: string | null;
  is_active: boolean;
  metadata: any;
}

interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
}

interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
  settings: any;
}

interface Location {
  id: string;
  name: string;
  address: string | null;
}

export default function CustomerMenu() {
  const { orgSlug, locationId } = useParams();
  const [searchParams] = useSearchParams();
  const tableId = searchParams.get('table');
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cartOpen, setCartOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tableNumber, setTableNumber] = useState<string>('');

  useEffect(() => {
    fetchMenuData();
  }, [orgSlug, locationId]);

  const fetchMenuData = async () => {
    if (!orgSlug || !locationId) return;

    try {
      // Fetch organization
      const { data: org } = await supabase
        .from('organizations')
        .select('*')
        .eq('slug', orgSlug)
        .single();

      if (!org) throw new Error('Restaurant not found');
      setOrganization(org);

      // Fetch location
      const { data: loc } = await supabase
        .from('locations')
        .select('*')
        .eq('id', locationId)
        .single();

      if (loc) setLocation(loc);

      // Fetch table info if tableId provided
      if (tableId) {
        const { data: table } = await supabase
          .from('restaurant_tables')
          .select('table_number')
          .eq('id', tableId)
          .single();

        if (table) setTableNumber(table.table_number);
      }

      // Fetch products (menu items)
      const { data: menuItems } = await supabase
        .from('products')
        .select('*')
        .eq('organization_id', org.id)
        .eq('location_id', locationId!)
        .eq('is_active', true)
        .order('category')
        .order('name');

      setProducts((menuItems || []).map((item: any) => ({
        ...item,
        name: item.name ?? '',
        description: item.description ?? null,
        unit_price: item.unit_price ?? 0,
        category: item.category ?? null,
        image_url: item.image_url ?? null,
        is_active: item.is_active ?? true,
        metadata: item.metadata ?? {},
      })));
    } catch (error) {
      console.error('Error fetching menu:', error);
      toast.error("Error loading menu", { description: "Please try again later" });
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category || 'Other')))];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
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
    toast.success(`Added ${product.name} to cart`);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter(item => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.product.unit_price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const submitOrder = async () => {
    if (cart.length === 0) return;

    setSubmitting(true);

    try {
      // Create order
      const orderNumber = `QR-${Date.now().toString(36).toUpperCase()}`;
      
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          organization_id: organization!.id,
          location_id: locationId!,
          order_number: orderNumber,
          vertical: 'restaurant',
          status: 'pending',
          subtotal: cartTotal,
          total_amount: cartTotal,
          payment_status: 'pending',
          metadata: {
            table_id: tableId,
            table_number: tableNumber,
            order_type: 'dine_in',
            source: 'qr_menu',
          },
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Add order items
      const orderItems = cart.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.unit_price,
        total_price: item.product.unit_price * item.quantity,
        notes: item.notes,
      }));

      await supabase.from('order_items').insert(orderItems);

      // Clear cart and show success
      setCart([]);
      setCartOpen(false);
      
      toast.success("Order submitted!", { description: `Order ${orderNumber} sent to kitchen. Your food will arrive shortly.` });
    } catch (error) {
      console.error('Order error:', error);
      toast.error("Failed to submit order", { description: "Please try again or call a server." });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Loading menu...</p>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <UtensilsCrossed className="w-12 h-12 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-semibold mt-4">Restaurant Not Found</h1>
          <p className="text-muted-foreground mt-2">This menu link may be invalid.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            {organization.logo_url ? (
              <img 
                src={organization.logo_url} 
                alt={organization.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <ChefHat className="w-5 h-5 text-primary" />
              </div>
            )}
            <div>
              <h1 className="font-bold text-lg">{organization.name}</h1>
              {tableNumber && (
                <Badge variant="secondary" className="text-xs">
                  Table {tableNumber}
                </Badge>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Categories */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2 -mx-4 px-4">
            {categories.map(cat => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                size="sm"
                className="flex-shrink-0"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === 'all' ? 'All' : cat}
              </Button>
            ))}
          </div>
        </div>
      </header>

      {/* Menu Items */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="space-y-4">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <UtensilsCrossed className="w-12 h-12 mx-auto text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">No items found</p>
            </div>
          ) : (
            filteredProducts.map(product => (
              <Card key={product.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex">
                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-24 h-24 object-cover"
                      />
                    )}
                    <div className="flex-1 p-3 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold">{product.name}</h3>
                          <span className="font-bold text-primary">
                            ${product.unit_price.toFixed(2)}
                          </span>
                        </div>
                        {product.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {product.description}
                          </p>
                        )}
                        {/* Dietary badges from metadata */}
                        {product.metadata?.dietary && (
                          <div className="flex gap-1 mt-2">
                            {product.metadata.dietary.includes('vegetarian') && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <Leaf className="w-3 h-3" /> Veg
                              </Badge>
                            )}
                            {product.metadata.dietary.includes('spicy') && (
                              <Badge variant="outline" className="text-xs gap-1 text-destructive">
                                <Flame className="w-3 h-3" /> Spicy
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <Button 
                        size="sm" 
                        className="mt-2 w-full gap-2"
                        onClick={() => addToCart(product)}
                      >
                        <Plus className="w-4 h-4" />
                        Add to Order
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>

      {/* Cart Button */}
      {cart.length > 0 && (
        <Sheet open={cartOpen} onOpenChange={setCartOpen}>
          <SheetTrigger asChild>
            <Button 
              className="fixed bottom-6 left-1/2 -translate-x-1/2 shadow-lg gap-3 px-6"
              size="lg"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>View Order ({cartCount})</span>
              <span className="font-bold">${cartTotal.toFixed(2)}</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] rounded-t-xl">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Your Order
              </SheetTitle>
            </SheetHeader>

            <div className="mt-6 space-y-4 overflow-y-auto max-h-[50vh]">
              {cart.map(item => (
                <div key={item.product.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ${item.product.unit_price.toFixed(2)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(item.product.id, -1)}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(item.product.id, 1)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeFromCart(item.product.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-2xl font-bold">${cartTotal.toFixed(2)}</span>
              </div>
              <Button 
                className="w-full gap-2" 
                size="lg"
                onClick={submitOrder}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                Send to Kitchen
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Payment will be collected at checkout
              </p>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
