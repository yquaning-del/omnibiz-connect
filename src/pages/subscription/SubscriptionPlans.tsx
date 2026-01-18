import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Plan {
  id: string;
  name: string;
  tier: string;
  price_monthly: number;
  price_yearly: number | null;
  description: string | null;
  features: string[] | null;
  max_locations: number | null;
  max_users: number | null;
}

interface SubscriptionPlansProps {
  onPlanSelected?: (planId: string) => void;
  showCurrentPlan?: boolean;
}

export function SubscriptionPlans({ onPlanSelected, showCurrentPlan = true }: SubscriptionPlansProps) {
  const navigate = useNavigate();
  const { currentOrganization } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<{ plan_id: string | null; status: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    fetchPlansAndSubscription();
  }, [currentOrganization]);

  const fetchPlansAndSubscription = async () => {
    if (!currentOrganization) return;

    try {
      // Fetch plans for the organization's vertical
      const { data: orgData } = await supabase
        .from('organizations')
        .select('primary_vertical')
        .eq('id', currentOrganization.id)
        .single();

      if (orgData) {
        const { data: plansData } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('vertical', orgData.primary_vertical)
          .eq('is_active', true)
          .order('price_monthly', { ascending: true });

        if (plansData) {
          setPlans(plansData.map(p => ({
            ...p,
            features: p.features as string[] | null
          })));
        }
      }

      // Fetch current subscription
      const { data: subData } = await supabase
        .from('organization_subscriptions')
        .select('plan_id, status')
        .eq('organization_id', currentOrganization.id)
        .maybeSingle();

      if (subData) {
        setCurrentSubscription(subData);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    if (!currentOrganization) return;

    setSubscribing(planId);

    try {
      // Placeholder: In production, this would redirect to Stripe checkout
      // For now, we'll create/update the subscription directly
      
      const { data: existingSub } = await supabase
        .from('organization_subscriptions')
        .select('id')
        .eq('organization_id', currentOrganization.id)
        .maybeSingle();

      if (existingSub) {
        await supabase
          .from('organization_subscriptions')
          .update({
            plan_id: planId,
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq('id', existingSub.id);
      } else {
        await supabase
          .from('organization_subscriptions')
          .insert({
            organization_id: currentOrganization.id,
            plan_id: planId,
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          });
      }

      toast.success('Subscription updated successfully!');
      
      if (onPlanSelected) {
        onPlanSelected(planId);
      } else {
        await fetchPlansAndSubscription();
      }
    } catch (error) {
      console.error('Error subscribing:', error);
      toast.error('Failed to update subscription');
    } finally {
      setSubscribing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant={billingCycle === 'monthly' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setBillingCycle('monthly')}
        >
          Monthly
        </Button>
        <Button
          variant={billingCycle === 'yearly' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setBillingCycle('yearly')}
        >
          Yearly
          <Badge variant="secondary" className="ml-2">Save 20%</Badge>
        </Button>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrentPlan = currentSubscription?.plan_id === plan.id;
          const price = billingCycle === 'yearly' && plan.price_yearly 
            ? plan.price_yearly / 12 
            : plan.price_monthly;

          return (
            <Card 
              key={plan.id} 
              className={`relative ${plan.tier === 'professional' ? 'border-primary shadow-lg' : 'border-border/50'}`}
            >
              {plan.tier === 'professional' && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Most Popular
                </Badge>
              )}
              
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  {isCurrentPlan && showCurrentPlan && (
                    <Badge variant="secondary">Current</Badge>
                  )}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">${price.toFixed(0)}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                
                {billingCycle === 'yearly' && plan.price_yearly && (
                  <p className="text-sm text-muted-foreground">
                    Billed ${plan.price_yearly}/year
                  </p>
                )}

                <ul className="space-y-2">
                  {plan.features?.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      {feature}
                    </li>
                  ))}
                  {plan.max_locations && (
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      Up to {plan.max_locations} location{plan.max_locations > 1 ? 's' : ''}
                    </li>
                  )}
                  {plan.max_users && (
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      Up to {plan.max_users} users
                    </li>
                  )}
                </ul>
              </CardContent>
              
              <CardFooter>
                <Button 
                  className="w-full" 
                  variant={plan.tier === 'professional' ? 'default' : 'outline'}
                  disabled={isCurrentPlan || subscribing !== null}
                  onClick={() => handleSubscribe(plan.id)}
                >
                  {subscribing === plan.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {isCurrentPlan ? 'Current Plan' : 'Subscribe'}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Placeholder Notice */}
      <p className="text-center text-sm text-muted-foreground">
        💳 Stripe payment integration coming soon. Subscriptions are currently simulated.
      </p>
    </div>
  );
}
