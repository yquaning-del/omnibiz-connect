import { useSubscription } from '@/contexts/SubscriptionContext';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

export function TrialBadge() {
  const { isTrialing, daysRemaining, isPaid, isExpired, plan, loading } = useSubscription();

  if (loading) return null;

  // Paid user - show plan badge
  if (isPaid && plan) {
    return (
      <Link to="/subscription">
        <Badge 
          variant="outline" 
          className="gap-1.5 cursor-pointer hover:bg-accent transition-colors border-primary/30 text-primary"
        >
          <Crown className="w-3 h-3" />
          {plan.name}
        </Badge>
      </Link>
    );
  }

  // Trial expired
  if (isExpired) {
    return (
      <Link to="/subscription">
        <Badge 
          variant="destructive" 
          className="gap-1.5 cursor-pointer hover:bg-destructive/90 transition-colors"
        >
          <AlertTriangle className="w-3 h-3" />
          Trial Expired
        </Badge>
      </Link>
    );
  }

  // Active trial
  if (isTrialing && daysRemaining > 0) {
    const isUrgent = daysRemaining <= 3;
    
    return (
      <Link to="/subscription">
        <Badge 
          variant={isUrgent ? "destructive" : "secondary"}
          className={cn(
            "gap-1.5 cursor-pointer transition-colors",
            isUrgent 
              ? "hover:bg-destructive/90 animate-pulse" 
              : "hover:bg-secondary/80"
          )}
        >
          <Clock className="w-3 h-3" />
          {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left
        </Badge>
      </Link>
    );
  }

  // No subscription
  return (
    <Link to="/subscription">
      <Badge 
        variant="outline" 
        className="gap-1.5 cursor-pointer hover:bg-accent transition-colors"
      >
        <Crown className="w-3 h-3" />
        Choose Plan
      </Badge>
    </Link>
  );
}
