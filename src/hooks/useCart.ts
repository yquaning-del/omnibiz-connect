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

const SESSION_KEY = 'cart_session_id';

function getSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

export function useCart({ organizationId }: UseCartOptions) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const sessionId = getSessionId();

  // Check auth state
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  // Load cart from database
  const loadCart = useCallback(async () => {
    if (!organizationId) return;
    
    setLoading(true);
    try {
      let query = supabase
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
        .eq('organization_id', organizationId);

      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        query = query.eq('session_id', sessionId);
      }

      const { data, error } = await query;
      
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
  }, [organizationId, userId, sessionId]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const addItem = async (
    productId: string,
    unitPrice: number,
    quantity: number = 1,
    variantId?: string
  ) => {
    try {
      // Check if item already exists
      const existingItem = items.find(
        i => i.product_id === productId && i.variant_id === variantId
      );

      if (existingItem) {
        await updateQuantity(existingItem.id, existingItem.quantity + quantity);
        return;
      }

      const insertData: any = {
        organization_id: organizationId,
        product_id: productId,
        variant_id: variantId || null,
        quantity,
        unit_price: unitPrice,
      };

      if (userId) {
        insertData.user_id = userId;
      } else {
        insertData.session_id = sessionId;
      }

      const { error } = await supabase
        .from('cart_items')
        .insert(insertData);

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
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      await loadCart();
    } catch (error) {
      console.error('Error removing item:', error);
      throw error;
    }
  };

  const clearCart = async () => {
    try {
      let query = supabase
        .from('cart_items')
        .delete()
        .eq('organization_id', organizationId);

      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        query = query.eq('session_id', sessionId);
      }

      const { error } = await query;
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
