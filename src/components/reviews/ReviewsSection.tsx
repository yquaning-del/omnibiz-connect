import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface Review {
  id: string;
  entityId: string;
  entityType: 'product' | 'hotel_room' | 'property_unit';
  organizationId: string;
  reviewerName: string;
  rating: number;
  comment: string;
  date: string;
}

interface ReviewsSectionProps {
  entityId: string;
  entityType: 'product' | 'hotel_room' | 'property_unit';
  organizationId: string;
}

export function ReviewsSection({ entityId, entityType, organizationId }: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    reviewerName: '',
    rating: 0,
    comment: '',
  });
  const [hoveredRating, setHoveredRating] = useState(0);

  // Calculate average rating
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.reviewerName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter your name.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.rating === 0) {
      toast({
        title: 'Rating required',
        description: 'Please select a rating.',
        variant: 'destructive',
      });
      return;
    }

    const newReview: Review = {
      id: `review-${Date.now()}-${Math.random()}`,
      entityId,
      entityType,
      organizationId,
      reviewerName: formData.reviewerName.trim(),
      rating: formData.rating,
      comment: formData.comment.trim(),
      date: new Date().toISOString(),
    };

    setReviews([...reviews, newReview]);
    setFormData({ reviewerName: '', rating: 0, comment: '' });
    setShowForm(false);
    setHoveredRating(0);
    
    toast.success("Review submitted", { description: "Thank you for your review!" });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderStars = (rating: number, interactive = false, onRatingChange?: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = interactive
            ? star <= (hoveredRating || formData.rating)
            : star <= rating;
          
          return (
            <button
              key={star}
              type={interactive ? 'button' : undefined}
              onClick={interactive && onRatingChange ? () => onRatingChange(star) : undefined}
              onMouseEnter={interactive ? () => setHoveredRating(star) : undefined}
              onMouseLeave={interactive ? () => setHoveredRating(0) : undefined}
              className={cn(
                'transition-colors',
                interactive && 'cursor-pointer',
                !interactive && 'pointer-events-none'
              )}
            >
              <Star
                className={cn(
                  'h-5 w-5',
                  isFilled ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                )}
              />
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Average Rating */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {renderStars(Math.round(averageRating))}
          <span className="text-lg font-semibold">
            {averageRating > 0 ? averageRating.toFixed(1) : '0.0'}
          </span>
          <span className="text-sm text-muted-foreground">
            ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : 'Write a Review'}
        </Button>
      </div>

      {/* Review Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Write a Review</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="reviewerName" className="text-sm font-medium">
                  Your Name
                </label>
                <Input
                  id="reviewerName"
                  value={formData.reviewerName}
                  onChange={(e) => setFormData({ ...formData, reviewerName: e.target.value })}
                  placeholder="Enter your name"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Rating</label>
                <div className="mt-2">
                  {renderStars(formData.rating, true, (rating) =>
                    setFormData({ ...formData, rating })
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="comment" className="text-sm font-medium">
                  Your Review
                </label>
                <Textarea
                  id="comment"
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  placeholder="Share your experience..."
                  className="mt-1 min-h-[100px]"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit">Submit Review</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({ reviewerName: '', rating: 0, comment: '' });
                    setHoveredRating(0);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      {reviews.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Reviews</h3>
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{review.reviewerName}</p>
                      <div className="mt-1 flex items-center gap-2">
                        {renderStars(review.rating)}
                        <span className="text-xs text-muted-foreground">
                          {formatDate(review.date)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-muted-foreground">{review.comment}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {reviews.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground">No reviews yet. Be the first to review!</p>
      )}
    </div>
  );
}
