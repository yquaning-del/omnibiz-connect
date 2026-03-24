import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Package, CalendarCheck, ShoppingCart, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { currentOrganization, currentLocation } = useAuth();
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);

  useEffect(() => {
    if (!currentOrganization || !currentLocation) return;

    // Clean up existing channels
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];

    // Subscribe to new orders
    const ordersChannel = supabase
      .channel('orders-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `location_id=eq.${currentLocation.id}`,
        },
        (payload) => {
          const order = payload.new as any;
          toast.success("New Order Received", { description: `Order #${order.order_number} - $${Number(order.total_amount).toFixed(2)}` });
        }
      )
      .subscribe();

    // Subscribe to reservations
    const reservationsChannel = supabase
      .channel('reservations-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reservations',
          filter: `location_id=eq.${currentLocation.id}`,
        },
        (payload) => {
          const reservation = payload.new as any;
          toast.success("New Reservation", { description: `${reservation.guest_name} - ${reservation.reservation_type === 'room' ? 'Room' : 'Table'} booking` });
        }
      )
      .subscribe();

    // Subscribe to low stock alerts (product updates)
    const productsChannel = supabase
      .channel('products-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products',
          filter: `organization_id=eq.${currentOrganization.id}`,
        },
        (payload) => {
          const product = payload.new as any;
          if (product.stock_quantity <= product.low_stock_threshold && product.stock_quantity > 0) {
            toast.error("Low Stock Alert", { description: `${product.name} is running low (${product.stock_quantity} remaining)` });
          }
        }
      )
      .subscribe();

    // Subscribe to housekeeping tasks
    const housekeepingChannel = supabase
      .channel('housekeeping-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'housekeeping_tasks',
          filter: `location_id=eq.${currentLocation.id}`,
        },
        (payload) => {
          const task = payload.new as any;
          if (task.priority === 'urgent') {
            toast.error("Urgent Housekeeping Task", { description: `New ${task.task_type} task created` });
          }
        }
      )
      .subscribe();

    channelsRef.current = [ordersChannel, reservationsChannel, productsChannel, housekeepingChannel];

    return () => {
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [currentOrganization?.id, currentLocation?.id, toast]);

  return <>{children}</>;
}
