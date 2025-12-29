import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Order } from '@/types';

interface RecentOrdersTableProps {
  orders: Order[];
  onOrderClick?: (order: Order) => void;
}

const statusStyles: Record<string, string> = {
  pending: 'bg-warning/20 text-warning border-warning/30',
  processing: 'bg-info/20 text-info border-info/30',
  completed: 'bg-success/20 text-success border-success/30',
  cancelled: 'bg-destructive/20 text-destructive border-destructive/30',
};

export function RecentOrdersTable({ orders, onOrderClick }: RecentOrdersTableProps) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No recent orders
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/50">
            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Order
            </th>
            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Status
            </th>
            <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Amount
            </th>
            <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Time
            </th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr
              key={order.id}
              onClick={() => onOrderClick?.(order)}
              className="border-b border-border/30 hover:bg-muted/30 cursor-pointer transition-colors"
            >
              <td className="py-3 px-4">
                <span className="font-mono text-sm text-foreground">
                  #{order.order_number}
                </span>
              </td>
              <td className="py-3 px-4">
                <Badge 
                  variant="outline" 
                  className={cn('capitalize', statusStyles[order.status] || '')}
                >
                  {order.status}
                </Badge>
              </td>
              <td className="py-3 px-4 text-right">
                <span className="font-medium text-foreground">
                  ${order.total_amount.toFixed(2)}
                </span>
              </td>
              <td className="py-3 px-4 text-right text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
