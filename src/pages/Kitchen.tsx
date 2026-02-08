import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Loader2, ChefHat, Clock, CheckCircle, AlertCircle, Play } from 'lucide-react';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { OrderAgingBadge } from '@/components/kitchen/OrderAgingBadge';

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  notes: string | null;
}

interface KitchenOrder {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  notes: string | null;
  order_items: OrderItem[];
}

const statusFlow = ['pending', 'preparing', 'ready', 'completed'];

const statusColors: Record<string, string> = {
  pending: 'bg-warning/20 text-warning border-warning/30',
  preparing: 'bg-info/20 text-info border-info/30',
  ready: 'bg-success/20 text-success border-success/30',
  completed: 'bg-muted text-muted-foreground border-muted',
};

const columnLabels: Record<string, { title: string; icon: any }> = {
  pending: { title: 'New Orders', icon: AlertCircle },
  preparing: { title: 'In Progress', icon: Play },
  ready: { title: 'Ready', icon: CheckCircle },
};

export default function Kitchen() {
  const { currentOrganization, currentLocation } = useAuth();
  const { toast } = useToast();
  
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentOrganization || !currentLocation) return;
    
    fetchOrders();

    // Set up realtime subscription
    const channel = supabase
      .channel('kitchen-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `location_id=eq.${currentLocation.id}`,
        },
        (payload) => {
          console.log('Order update:', payload);
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrganization, currentLocation]);

  const fetchOrders = async () => {
    if (!currentLocation) return;

    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        created_at,
        notes,
        order_items (
          id,
          product_name,
          quantity,
          notes
        )
      `)
      .eq('location_id', currentLocation.id)
      .eq('vertical', 'restaurant')
      .in('status', ['pending', 'preparing', 'ready'])
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching orders:', error);
    } else {
      setOrders(data as KitchenOrder[]);
    }
    setLoading(false);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      // Realtime will handle the update
      toast({ title: `Order ${newStatus === 'completed' ? 'completed' : 'updated'}` });
    }
  };

  const getNextStatus = (currentStatus: string) => {
    const currentIndex = statusFlow.indexOf(currentStatus);
    if (currentIndex < statusFlow.length - 1) {
      return statusFlow[currentIndex + 1];
    }
    return null;
  };

  const ordersByStatus = {
    pending: orders.filter(o => o.status === 'pending'),
    preparing: orders.filter(o => o.status === 'preparing'),
    ready: orders.filter(o => o.status === 'ready'),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <FeatureGate feature="kitchen_display" requiredTier="Professional">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-restaurant/20 flex items-center justify-center">
              <ChefHat className="w-6 h-6 text-restaurant" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-foreground">Kitchen Display</h1>
              <p className="text-muted-foreground">
                {orders.length} active orders • Real-time updates
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-success rounded-full animate-pulse" />
            <span className="text-sm text-muted-foreground">Live</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(columnLabels).map(([status, { title, icon: Icon }]) => (
            <Card key={status} className={cn('border-border/50', statusColors[status].split(' ')[0])}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{title}</p>
                    <p className="text-3xl font-bold">{ordersByStatus[status as keyof typeof ordersByStatus].length}</p>
                  </div>
                  <Icon className="w-8 h-8 opacity-50" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {Object.entries(columnLabels).map(([status, { title, icon: Icon }]) => (
            <div key={status} className="space-y-4">
              <div className="flex items-center gap-2">
                <Icon className={cn('w-5 h-5', status === 'pending' ? 'text-warning' : status === 'preparing' ? 'text-info' : 'text-success')} />
                <h2 className="font-semibold text-foreground">{title}</h2>
                <Badge variant="outline" className="ml-auto">
                  {ordersByStatus[status as keyof typeof ordersByStatus].length}
                </Badge>
              </div>

              <div className="space-y-3 min-h-[400px]">
                {ordersByStatus[status as keyof typeof ordersByStatus].map(order => (
                  <Card 
                    key={order.id} 
                    className={cn(
                      'border-2 transition-all hover:shadow-lg',
                      status === 'pending' && 'border-warning/50 animate-pulse',
                      status === 'preparing' && 'border-info/50',
                      status === 'ready' && 'border-success/50'
                    )}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-mono">
                          #{order.order_number}
                        </CardTitle>
                        <OrderAgingBadge 
                          createdAt={order.created_at}
                          urgentThresholdMinutes={10}
                          criticalThresholdMinutes={15}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Order Items */}
                      <div className="space-y-2 mb-4">
                        {order.order_items.map(item => (
                          <div key={item.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-primary">{item.quantity}x</span>
                              <span className="text-foreground">{item.product_name}</span>
                            </div>
                            {item.notes && (
                              <span className="text-xs text-warning">{item.notes}</span>
                            )}
                          </div>
                        ))}
                      </div>

                      {order.notes && (
                        <p className="text-sm text-warning bg-warning/10 p-2 rounded mb-4">
                          Note: {order.notes}
                        </p>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        {status === 'pending' && (
                          <Button 
                            className="flex-1 bg-info hover:bg-info/80"
                            onClick={() => updateOrderStatus(order.id, 'preparing')}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Start
                          </Button>
                        )}
                        {status === 'preparing' && (
                          <Button 
                            className="flex-1 bg-success hover:bg-success/80"
                            onClick={() => updateOrderStatus(order.id, 'ready')}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Ready
                          </Button>
                        )}
                        {status === 'ready' && (
                          <Button 
                            className="flex-1"
                            variant="outline"
                            onClick={() => updateOrderStatus(order.id, 'completed')}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Complete
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {ordersByStatus[status as keyof typeof ordersByStatus].length === 0 && (
                  <div className="flex items-center justify-center h-32 border-2 border-dashed border-border/50 rounded-xl text-muted-foreground">
                    No orders
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </FeatureGate>
  );
}
