import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CartItem {
  id: string;
  product_id: string;
  variant_id?: string;
  product_name: string;
  variant_name?: string;
  quantity: number;
  unit_price: number;
  image_url?: string;
}

interface UseCartOptions {
  organizationId: string;
}

const guestKey = (orgId: string) => `cart_guest_${orgId}`;

function loadGuestCart(orgId: string): CartItem[] {
  try {
    const raw = localStorage.getItem(guestKey(orgId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveGuestCart(orgId: string, items: CartItem[]) {
  try {
    localStorage.setItem(guestKey(orgId), JSON.stringify(items));
  } catch {
    // ignore quota errors
  }
}

/**
 * Cart hook.
 * - Authenticated users: persisted to `cart_items` table (org + user scoped via RLS).
 * - Guest users: stored entirely in localStorage. Server-side guest carts were
 *   removed because the previous session-id RLS policy allowed enumeration.
 */
export function useCart({ organizationId }: UseCartOptions) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const loadCart = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      if (!userId) {
        setItems(loadGuestCart(organizationId));
        return;
      }

      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          id,
          product_id,
          variant_id,
          quantity,
          unit_price,
          products!inner(name, image_url),
          product_variants(name)
        `)
        .eq('organization_id', organizationId)
        .eq('user_id', userId);

      if (error) throw error;

      const cartItems: CartItem[] = (data || []).map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        variant_id: item.variant_id,
        product_name: item.products?.name || 'Unknown Product',
        variant_name: item.product_variants?.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        image_url: item.products?.image_url,
      }));

      setItems(cartItems);
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId, userId]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const addItem = async (
    productId: string,
    unitPrice: number,
    quantity: number = 1,
    variantId?: string,
    productName?: string,
    imageUrl?: string,
  ) => {
    try {
      const existingItem = items.find(
        i => i.product_id === productId && i.variant_id === variantId,
      );

      if (existingItem) {
        await updateQuantity(existingItem.id, existingItem.quantity + quantity);
        return;
      }

      if (!userId) {
        const newItem: CartItem = {
          id: `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          product_id: productId,
          variant_id: variantId,
          product_name: productName || 'Item',
          quantity,
          unit_price: unitPrice,
          image_url: imageUrl,
        };
        const next = [...items, newItem];
        saveGuestCart(organizationId, next);
        setItems(next);
        return;
      }

      const insertData: any = {
        organization_id: organizationId,
        product_id: productId,
        variant_id: variantId || null,
        quantity,
        unit_price: unitPrice,
        user_id: userId,
      };

      const { error } = await supabase.from('cart_items').insert(insertData);
      if (error) throw error;
      await loadCart();
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    try {
      if (quantity <= 0) {
        await removeItem(itemId);
        return;
      }

      if (!userId) {
        const next = items.map(i => (i.id === itemId ? { ...i, quantity } : i));
        saveGuestCart(organizationId, next);
        setItems(next);
        return;
      }

      const { error } = await supabase
        .from('cart_items')
        .update({ quantity, updated_at: new Date().toISOString() })
        .eq('id', itemId);

      if (error) throw error;
      await loadCart();
    } catch (error) {
      console.error('Error updating quantity:', error);
      throw error;
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      if (!userId) {
        const next = items.filter(i => i.id !== itemId);
        saveGuestCart(organizationId, next);
        setItems(next);
        return;
      }

      const { error } = await supabase.from('cart_items').delete().eq('id', itemId);
      if (error) throw error;
      await loadCart();
    } catch (error) {
      console.error('Error removing item:', error);
      throw error;
    }
  };

  const clearCart = async () => {
    try {
      if (!userId) {
        saveGuestCart(organizationId, []);
        setItems([]);
        return;
      }

      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('organization_id', organizationId)
        .eq('user_id', userId);
      if (error) throw error;
      setItems([]);
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    }
  };

  const subtotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    items,
    loading,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    itemCount,
    refresh: loadCart,
  };
}
