import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Product } from '@/types';

interface LowStockAlertProps {
  products: Product[];
  onProductClick?: (product: Product) => void;
}

export function LowStockAlert({ products, onProductClick }: LowStockAlertProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>All items are well stocked</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {products.slice(0, 5).map((product) => (
        <button
          key={product.id}
          onClick={() => onProductClick?.(product)}
          className={cn(
            'w-full flex items-center gap-3 p-3 rounded-lg',
            'bg-warning/5 border border-warning/20',
            'hover:bg-warning/10 transition-colors text-left'
          )}
        >
          <div className="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-warning" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground text-sm truncate">
              {product.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {product.stock_quantity} left (min: {product.low_stock_threshold})
            </p>
          </div>
          <span className="text-sm font-bold text-warning">
            {product.stock_quantity}
          </span>
        </button>
      ))}
    </div>
  );
}
