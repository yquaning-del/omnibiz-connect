import { useSubscription } from '@/contexts/SubscriptionContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Crown, Clock, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export function SubscriptionSettings() {
  const { subscription, plan, loading, isTrialing, daysRemaining, isPaid, isExpired } = useSubscription();

  if (loading) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = () => {
    if (isExpired) {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />Expired</Badge>;
    }
    if (isTrialing) {
      return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />Trial</Badge>;
    }
    if (isPaid) {
      return <Badge variant="default" className="gap-1 bg-green-600"><CheckCircle2 className="w-3 h-3" />Active</Badge>;
    }
    return <Badge variant="outline">No Subscription</Badge>;
  };

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader>
        <CardTitle>Subscription</CardTitle>
        <CardDescription>Manage your subscription and billing</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Plan */}
        <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  {plan?.name || 'No Plan Selected'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {plan ? `$${plan.price_monthly}/month` : 'Choose a plan to get started'}
                </p>
              </div>
            </div>
            {getStatusBadge()}
          </div>

          {/* Trial Progress */}
          {isTrialing && daysRemaining > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Trial Period</span>
                <span className="font-medium">{daysRemaining} days remaining</span>
              </div>
              <Progress value={((14 - daysRemaining) / 14) * 100} className="h-2" />
            </div>
          )}

          {/* Billing Period */}
          {subscription?.current_period_end && isPaid && (
            <div className="text-sm text-muted-foreground">
              Current period ends: {format(new Date(subscription.current_period_end), 'MMMM d, yyyy')}
            </div>
          )}
        </div>

        {/* Plan Features */}
        {plan?.features && plan.features.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-foreground">Your Plan Includes</h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {plan.features.slice(0, 6).map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-2">
          <Link to="/subscription">
            <Button variant={isExpired || !plan ? "default" : "outline"}>
              {isExpired ? 'Reactivate' : !plan ? 'Choose Plan' : 'Change Plan'}
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          
          {isTrialing && (
            <Link to="/subscription">
              <Button variant="default">
                Upgrade Now
              </Button>
            </Link>
          )}
        </div>

        {/* Stripe Notice */}
        <p className="text-xs text-muted-foreground">
          Payment processing will be available soon via Stripe integration.
        </p>
      </CardContent>
    </Card>
  );
}
