import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Eye, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency, type SupportedCurrency } from '@/lib/currency';
import { ReviewsSection } from '@/components/reviews/ReviewsSection';

interface ProductCardProps {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  category?: string;
  inStock: boolean;
  currency?: SupportedCurrency;
  organizationId: string;
  onAddToCart: () => void;
  onViewDetails: () => void;
}

export function ProductCard({
  id,
  name,
  description,
  price,
  imageUrl,
  category,
  inStock,
  currency = 'KES',
  organizationId,
  onAddToCart,
  onViewDetails,
}: ProductCardProps) {
  const [showReviews, setShowReviews] = useState(false);

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg">
      <div className="relative aspect-video overflow-hidden bg-muted">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <Package className="h-16 w-16 text-muted-foreground" />
          </div>
        )}
        {!inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Badge variant="destructive" className="text-sm">Out of Stock</Badge>
          </div>
        )}
        {category && (
          <Badge className="absolute left-2 top-2" variant="secondary">
            {category}
          </Badge>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-foreground line-clamp-1">{name}</h3>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{description}</p>
        )}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-lg font-bold text-primary">
            {formatCurrency(price, currency)}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onViewDetails}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={onAddToCart}
              disabled={!inStock}
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Reviews Section */}
        <div className="mt-4 border-t pt-4">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between"
            onClick={() => setShowReviews(!showReviews)}
          >
            <span className="text-sm">Reviews</span>
            {showReviews ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
          {showReviews && (
            <div className="mt-4">
              <ReviewsSection
                entityId={id}
                entityType="product"
                organizationId={organizationId}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
