import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineDB, OfflineOrder, OfflineOrderItem, CachedProduct } from '@/lib/offlineDB';
import { useOfflineSync } from './useOfflineSync';
import { Product } from '@/types';
import { toast } from 'sonner';

interface UseOfflinePOSOptions {
  organizationId: string | undefined;
  locationId: string | undefined;
  vertical: string | undefined;
  userId: string | undefined;
  /** For restaurant vertical, the table ID to link the order to */
  tableId?: string | undefined;
  /** Order type: dine-in, takeout, delivery */
  orderType?: 'dine_in' | 'takeout' | 'delivery';
}

interface CartItem {
  product: Product;
  quantity: number;
}

export function useOfflinePOS({ organizationId, locationId, vertical, userId, tableId, orderType }: UseOfflinePOSOptions) {
  const { isOnline, syncStatus, requestSync, updatePendingCount } = useOfflineSync();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);

  // Fetch and cache products
  const fetchProducts = useCallback(async () => {
    if (!organizationId) return;

    setLoading(true);

    if (navigator.onLine) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .order('name');

        if (error) throw error;

        setProducts(data as Product[]);
        setOfflineMode(false);

        // Cache products for offline use
        await offlineDB.cacheProducts(data as Product[]);
        console.log('[OfflinePOS] Products cached for offline use');
      } catch (error) {
        console.error('[OfflinePOS] Error fetching products:', error);
        // Fall back to cached products
        await loadCachedProducts();
      }
    } else {
      await loadCachedProducts();
    }

    setLoading(false);
  }, [organizationId]);

  const loadCachedProducts = useCallback(async () => {
    if (!organizationId) return;

    try {
      const cached = await offlineDB.getCachedProducts(organizationId);
      if (cached.length > 0) {
        setProducts(cached as Product[]);
        setOfflineMode(true);
        console.log(`[OfflinePOS] Loaded ${cached.length} cached products`);
      } else {
        toast.error("No cached products", { description: "Please connect to the internet to load products." });
      }
    } catch (error) {
      console.error('[OfflinePOS] Error loading cached products:', error);
    }
  }, [organizationId, toast]);

  // Update local product stock
  const updateLocalStock = useCallback(async (productId: string, quantityUsed: number) => {
    // Update in-memory products
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? { ...p, stock_quantity: Math.max(0, (p.stock_quantity ?? 0) - quantityUsed) }
          : p
      )
    );

    // Update in IndexedDB
    const product = products.find((p) => p.id === productId);
    if (product) {
      await offlineDB.updateProductStock(productId, Math.max(0, (product.stock_quantity ?? 0) - quantityUsed));
    }
  }, [products]);

  // Process order (online or offline)
  const processOrder = useCallback(async (
    cart: CartItem[],
    subtotal: number,
    taxAmount: number,
    discountAmount: number,
    totalAmount: number,
    paymentMethod: string
  ): Promise<{ success: boolean; orderNumber: string; offline: boolean }> => {
    if (!organizationId || !locationId || !userId || !vertical) {
      throw new Error('Missing required context');
    }

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
    const now = new Date().toISOString();

    // Try online first
    if (navigator.onLine && !offlineMode) {
      try {
        // Restaurant dine-in orders start as 'pending' so they flow to kitchen display
        const isRestaurantDineIn = vertical === 'restaurant' && orderType !== 'takeout';
        const orderStatus = isRestaurantDineIn ? 'pending' : 'completed';
        const paymentStatus = isRestaurantDineIn ? 'pending' : 'paid';

        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            organization_id: organizationId,
            location_id: locationId,
            order_number: orderNumber,
            vertical: vertical as any,
            status: orderStatus,
            subtotal,
            tax_amount: taxAmount,
            discount_amount: discountAmount,
            total_amount: totalAmount,
            payment_method: paymentMethod,
            payment_status: paymentStatus,
            created_by: userId,
            metadata: {
              ...(tableId ? { table_id: tableId } : {}),
              ...(orderType ? { order_type: orderType } : {}),
            },
          })
          .select()
          .single();

        if (orderError) throw orderError;

        const orderItems = cart.map((item) => ({
          order_id: order.id,
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.unit_price,
          total_price: item.product.unit_price * item.quantity,
        }));

        await supabase.from('order_items').insert(orderItems);

        // Update table status to occupied if a table was assigned
        if (tableId && vertical === 'restaurant') {
          await supabase
            .from('restaurant_tables')
            .update({ status: 'occupied' })
            .eq('id', tableId);
        }

        // Update stock with optimistic locking to prevent race conditions
        for (const item of cart) {
          const currentQty = item.product.stock_quantity ?? 0;
          const newQty = Math.max(0, currentQty - item.quantity);
          await supabase
            .from('products')
            .update({ stock_quantity: newQty })
            .eq('id', item.product.id)
            .eq('stock_quantity', currentQty); // optimistic lock: only update if unchanged
          
          await updateLocalStock(item.product.id, item.quantity);
        }

        return { success: true, orderNumber, offline: false };
      } catch (error) {
        console.error('[OfflinePOS] Online order failed, saving offline:', error);
        // Fall through to offline save
      }
    }

    // Save offline
    const offlineOrder: OfflineOrder = {
      id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      organizationId,
      locationId,
      orderNumber,
      vertical,
      items: cart.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.unit_price,
        totalPrice: item.product.unit_price * item.quantity,
      })),
      subtotal,
      taxAmount,
      discountAmount,
      totalAmount,
      paymentMethod,
      createdBy: userId,
      createdAt: now,
      synced: false,
    };

    await offlineDB.saveOfflineOrder(offlineOrder);

    // Update local stock
    for (const item of cart) {
      await updateLocalStock(item.product.id, item.quantity);
    }

    await updatePendingCount();

    toast.success("Order saved offline", { description: `Order ${orderNumber} will sync when you're back online.` });

    return { success: true, orderNumber, offline: true };
  }, [organizationId, locationId, userId, vertical, offlineMode, updateLocalStock, updatePendingCount, toast]);

  // Load products on mount
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Sync when coming online
  useEffect(() => {
    if (isOnline && syncStatus.pendingCount > 0) {
      requestSync();
    }
  }, [isOnline, syncStatus.pendingCount, requestSync]);

  return {
    products,
    loading,
    isOnline,
    offlineMode,
    syncStatus,
    processOrder,
    refreshProducts: fetchProducts,
    requestSync,
  };
}
