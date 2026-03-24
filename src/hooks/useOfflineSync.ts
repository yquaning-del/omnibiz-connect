import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineDB, OfflineOrder } from '@/lib/offlineDB';
import { toast } from 'sonner';
interface SyncStatus {
  isSyncing: boolean;
  lastSyncAt: Date | null;
  pendingCount: number;
  failedCount: number;
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSyncAt: null,
    pendingCount: 0,
    failedCount: 0,
  });
  const syncInProgress = useRef(false);

  // Ref to always hold the latest syncOrders without re-registering listeners
  const syncOrdersRef = useRef<() => void>(() => {});

  // Update online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Back online! Syncing pending orders...");
      syncOrdersRef.current();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({ variant: 'destructive', title: 'You\'re offline', description: 'Orders will be saved locally and synced when you\'re back online.' });
    };

    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_ORDERS') {
        syncOrdersRef.current();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for SW sync messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
    };
  }, []);

  // Check pending orders on mount
  useEffect(() => {
    updatePendingCount();
  }, []);

  const updatePendingCount = useCallback(async () => {
    try {
      const stats = await offlineDB.getStats();
      setSyncStatus((prev) => ({
        ...prev,
        pendingCount: stats.unsyncedOrders,
      }));
    } catch (error) {
      console.error('[Sync] Error getting stats:', error);
    }
  }, []);

  const syncOrders = useCallback(async () => {
    if (syncInProgress.current || !navigator.onLine) return;
    
    syncInProgress.current = true;
    setSyncStatus((prev) => ({ ...prev, isSyncing: true }));

    try {
      const unsyncedOrders = await offlineDB.getUnsyncedOrders();
      console.log(`[Sync] Found ${unsyncedOrders.length} unsynced orders`);

      let successCount = 0;
      let failCount = 0;

      for (const order of unsyncedOrders) {
        try {
          await syncSingleOrder(order);
          await offlineDB.markOrderSynced(order.id);
          successCount++;
        } catch (error: any) {
          console.error(`[Sync] Failed to sync order ${order.orderNumber}:`, error);
          await offlineDB.markOrderError(order.id, error.message);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Orders synced! ${successCount} order(s) synced successfully.`);
      }

      if (failCount > 0) {
        toast({ variant: 'destructive', title: 'Sync incomplete', description: `${failCount} order(s) failed to sync and need attention.` });
      }

      setSyncStatus((prev) => ({
        ...prev,
        lastSyncAt: new Date(),
        failedCount: failCount,
      }));

      await updatePendingCount();
    } catch (error) {
      console.error('[Sync] Error syncing orders:', error);
      toast.error("Sync failed", { description: "Failed to sync orders. Please try again." });
    } finally {
      syncInProgress.current = false;
      setSyncStatus((prev) => ({ ...prev, isSyncing: false }));
    }
  }, [updatePendingCount]);

  // Keep the ref in sync so event listeners always call the latest version
  syncOrdersRef.current = syncOrders;

  const syncSingleOrder = async (order: OfflineOrder): Promise<void> => {
    // Create the order in Supabase
    const { data: createdOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        organization_id: order.organizationId,
        location_id: order.locationId,
        order_number: order.orderNumber,
        vertical: order.vertical as any,
        status: 'completed',
        subtotal: order.subtotal,
        tax_amount: order.taxAmount,
        discount_amount: order.discountAmount,
        total_amount: order.totalAmount,
        payment_method: order.paymentMethod,
        payment_status: 'paid',
        created_by: order.createdBy,
        created_at: order.createdAt,
        metadata: { offline_id: order.id, synced_at: new Date().toISOString() },
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items
    const orderItems = order.items.map((item) => ({
      order_id: createdOrder.id,
      product_id: item.productId,
      product_name: item.productName,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.totalPrice,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    // Update stock for each item using atomic decrement via RPC or
    // read-then-write with optimistic locking (check current value).
    for (const item of order.items) {
      // Use a retry loop to handle concurrent updates
      let retries = 3;
      while (retries > 0) {
        const { data: product } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', item.productId)
          .single();

        if (product && product.stock_quantity !== null) {
          const newQty = Math.max(0, product.stock_quantity - item.quantity);
          // Only update if the stock hasn't changed since we read it
          const { error: updateError } = await supabase
            .from('products')
            .update({ stock_quantity: newQty })
            .eq('id', item.productId)
            .eq('stock_quantity', product.stock_quantity); // optimistic lock

          if (!updateError) break; // Success
        } else {
          break; // Product not found or null stock, skip
        }
        retries--;
      }
    }
  };

  // Request background sync if available
  const requestSync = useCallback(async () => {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await (registration as any).sync.register('sync-offline-orders');
        console.log('[Sync] Background sync registered');
      } catch (error) {
        console.log('[Sync] Background sync not available, syncing directly');
        syncOrders();
      }
    } else {
      syncOrders();
    }
  }, [syncOrders]);

  return {
    isOnline,
    syncStatus,
    syncOrders,
    requestSync,
    updatePendingCount,
  };
}
