import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ProductGrid } from '@/components/ecommerce/ProductGrid';
import { CartDrawer } from '@/components/ecommerce/CartDrawer';
import { useCart } from '@/hooks/useCart';
import { ShoppingCart, Store } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface StoreInfo {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  primary_vertical: string;
}

export default function StoreCatalog() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const navigate = useNavigate();
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);

  const cart = useCart({ organizationId: store?.id || '' });

  useEffect(() => {
    loadStore();
  }, [orgSlug]);

  const loadStore = async () => {
    if (!orgSlug) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug, logo_url, primary_vertical')
        .eq('slug', orgSlug)
        .single();

      if (error) throw error;
      setStore({
        ...data,
        name: data.name ?? '',
        slug: data.slug ?? '',
        primary_vertical: data.primary_vertical ?? '',
        logo_url: data.logo_url ?? undefined,
      });
    } catch (error) {
      console.error('Error loading store:', error);
      toast({
        title: 'Store not found',
        description: 'The store you are looking for does not exist.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (productId: string, price: number) => {
    try {
      await cart.addItem(productId, price, 1);
      toast.success("Added to cart", { description: "Product has been added to your cart." });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add product to cart.',
        variant: 'destructive',
      });
    }
  };

  const handleViewProduct = (productId: string) => {
    navigate(`/store/${orgSlug}/product/${productId}`);
  };

  const handleCheckout = () => {
    setCartOpen(false);
    navigate(`/store/${orgSlug}/checkout`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="mb-8 h-10 w-64" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <Store className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Store Not Found</h1>
        <p className="text-muted-foreground">The store you are looking for does not exist.</p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {store.logo_url ? (
              <img src={store.logo_url} alt={store.name} className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Store className="h-5 w-5 text-primary-foreground" />
              </div>
            )}
            <h1 className="text-xl font-bold">{store.name}</h1>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="relative"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingCart className="h-5 w-5" />
            {cart.itemCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                {cart.itemCount}
              </span>
            )}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight">Shop Our Products</h2>
          <p className="mt-2 text-muted-foreground">
            Browse our collection and find what you need
          </p>
        </div>

        <ProductGrid
          organizationId={store.id}
          onAddToCart={handleAddToCart}
          onViewProduct={handleViewProduct}
        />
      </main>

      {/* Cart Drawer */}
      <CartDrawer
        open={cartOpen}
        onOpenChange={setCartOpen}
        items={cart.items}
        subtotal={cart.subtotal}
        onUpdateQuantity={cart.updateQuantity}
        onRemoveItem={cart.removeItem}
        onCheckout={handleCheckout}
        loading={cart.loading}
      />
    </div>
  );
}
