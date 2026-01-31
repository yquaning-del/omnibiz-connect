import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, type SupportedCurrency } from '@/lib/currency';
import { format } from 'date-fns';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  XCircle, 
  Search, 
  Eye, 
  Clock,
  ShoppingBag,
  RefreshCw
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface OnlineOrder {
  id: string;
  order_number: string;
  status: string;
  fulfillment_status: string;
  payment_status: string;
  total_amount: number;
  currency: string;
  shipping_method: string;
  tracking_number?: string;
  created_at: string;
  shipping_addresses?: {
    full_name: string;
    city: string;
    country: string;
  };
  online_order_items?: {
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  refunded: 'bg-red-100 text-red-800',
};

export default function OnlineOrders() {
  const { currentOrganization } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<OnlineOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<OnlineOrder | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [actionDialog, setActionDialog] = useState<{ open: boolean; action: string; orderId: string }>({
    open: false,
    action: '',
    orderId: '',
  });
  const [trackingNumber, setTrackingNumber] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (currentOrganization?.id) {
      loadOrders();
    }
  }, [currentOrganization?.id]);

  const loadOrders = async () => {
    if (!currentOrganization?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('online_orders')
        .select(`
          *,
          shipping_addresses (full_name, city, country),
          online_order_items (id, product_name, quantity, unit_price, total_price)
        `)
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to load orders.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-online-order', {
        body: {
          orderId: actionDialog.orderId,
          action: actionDialog.action,
          trackingNumber: trackingNumber || undefined,
          cancellationReason: cancellationReason || undefined,
        },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Order ${actionDialog.action}ed successfully.`,
      });

      setActionDialog({ open: false, action: '', orderId: '' });
      setTrackingNumber('');
      setCancellationReason('');
      await loadOrders();
    } catch (error: any) {
      console.error('Error processing order:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to process order.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.shipping_addresses?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Online Orders</h1>
          <p className="text-muted-foreground">Manage orders from your online store</p>
        </div>
        <Button onClick={loadOrders} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.confirmed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shipped</CardTitle>
            <Truck className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.shipped}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.delivered}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by order number or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">No orders found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.shipping_addresses?.full_name || 'N/A'}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.shipping_addresses?.city}, {order.shipping_addresses?.country}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[order.status] || 'bg-gray-100'}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={PAYMENT_STATUS_COLORS[order.payment_status] || 'bg-gray-100'}>
                        {order.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatCurrency(order.total_amount, (order.currency as SupportedCurrency) || 'KES')}
                    </TableCell>
                    <TableCell>{format(new Date(order.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedOrder(order);
                            setDetailsOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {order.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => setActionDialog({ open: true, action: 'confirm', orderId: order.id })}
                            >
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setActionDialog({ open: true, action: 'cancel', orderId: order.id })}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {order.status === 'confirmed' && (
                          <Button
                            size="sm"
                            onClick={() => setActionDialog({ open: true, action: 'ship', orderId: order.id })}
                          >
                            <Truck className="mr-1 h-4 w-4" />
                            Ship
                          </Button>
                        )}
                        {order.status === 'shipped' && (
                          <Button
                            size="sm"
                            onClick={() => setActionDialog({ open: true, action: 'deliver', orderId: order.id })}
                          >
                            <CheckCircle className="mr-1 h-4 w-4" />
                            Deliver
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details - {selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">Customer</Label>
                  <p className="font-medium">{selectedOrder.shipping_addresses?.full_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Shipping</Label>
                  <p className="font-medium">{selectedOrder.shipping_method}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge className={STATUS_COLORS[selectedOrder.status]}>{selectedOrder.status}</Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Payment</Label>
                  <Badge className={PAYMENT_STATUS_COLORS[selectedOrder.payment_status]}>
                    {selectedOrder.payment_status}
                  </Badge>
                </div>
                {selectedOrder.tracking_number && (
                  <div className="sm:col-span-2">
                    <Label className="text-muted-foreground">Tracking Number</Label>
                    <p className="font-medium">{selectedOrder.tracking_number}</p>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-muted-foreground">Items</Label>
                <div className="mt-2 rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.online_order_items?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.product_name}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.unit_price, (selectedOrder.currency as SupportedCurrency) || 'KES')}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.total_price, (selectedOrder.currency as SupportedCurrency) || 'KES')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex justify-between border-t pt-4">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold">
                  {formatCurrency(selectedOrder.total_amount, (selectedOrder.currency as SupportedCurrency) || 'KES')}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === 'confirm' && 'Confirm Order'}
              {actionDialog.action === 'ship' && 'Ship Order'}
              {actionDialog.action === 'deliver' && 'Mark as Delivered'}
              {actionDialog.action === 'cancel' && 'Cancel Order'}
            </DialogTitle>
          </DialogHeader>

          {actionDialog.action === 'ship' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="tracking">Tracking Number (optional)</Label>
                <Input
                  id="tracking"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number"
                />
              </div>
            </div>
          )}

          {actionDialog.action === 'cancel' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="reason">Cancellation Reason</Label>
                <Textarea
                  id="reason"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Enter reason for cancellation"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({ open: false, action: '', orderId: '' })}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={processing}
              variant={actionDialog.action === 'cancel' ? 'destructive' : 'default'}
            >
              {processing ? 'Processing...' : `${actionDialog.action.charAt(0).toUpperCase() + actionDialog.action.slice(1)} Order`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
