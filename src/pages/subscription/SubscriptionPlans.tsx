import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PaystackCheckout } from '@/components/payment/PaystackCheckout';
import type { Country } from '@/components/payment/CountrySelector';

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
  currency?: string | null;
  country_code?: string | null;
}

interface SubscriptionPlansProps {
  onPlanSelected?: (planId: string) => void;
  showCurrentPlan?: boolean;
}

// Default country for Paystack
const DEFAULT_COUNTRY: Country = {
  code: 'GH',
  name: 'Ghana',
  currency: 'GHS',
  symbol: '₵',
  flag: '🇬🇭',
};

export function SubscriptionPlans({ onPlanSelected, showCurrentPlan = true }: SubscriptionPlansProps) {
  const navigate = useNavigate();
  const { currentOrganization } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<{ plan_id: string | null; status: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  useEffect(() => {
    fetchPlansAndSubscription();
  }, [currentOrganization]);

  const fetchPlansAndSubscription = async () => {
    if (!currentOrganization) return;

    try {
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

  const handleSubscribe = (plan: Plan) => {
    setSelectedPlan(plan);
    setCheckoutOpen(true);
  };

  const handlePaymentSuccess = async (reference: string) => {
    setCheckoutOpen(false);
    toast.success('Payment successful! Your subscription is now active.');
    
    if (onPlanSelected && selectedPlan) {
      onPlanSelected(selectedPlan.id);
    } else {
      await fetchPlansAndSubscription();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getPrice = (plan: Plan) => {
    if (billingCycle === 'yearly' && plan.price_yearly) {
      return plan.price_yearly;
    }
    return plan.price_monthly;
  };

  const getDisplayPrice = (plan: Plan) => {
    if (billingCycle === 'yearly' && plan.price_yearly) {
      return plan.price_yearly / 12;
    }
    return plan.price_monthly;
  };

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
          const displayPrice = getDisplayPrice(plan);

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
                  <span className="text-4xl font-bold">${displayPrice.toFixed(0)}</span>
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
                  disabled={isCurrentPlan}
                  onClick={() => handleSubscribe(plan)}
                >
                  {isCurrentPlan ? 'Current Plan' : 'Subscribe'}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        💳 Payments processed securely via Paystack.
      </p>

      {/* Paystack Checkout Dialog */}
      {selectedPlan && (
        <PaystackCheckout
          open={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          planName={selectedPlan.name}
          planId={selectedPlan.id}
          amount={getPrice(selectedPlan)}
          currency={selectedPlan.currency || 'USD'}
          currencySymbol="$"
          country={DEFAULT_COUNTRY}
          onSuccess={handlePaymentSuccess}
          billingCycle={billingCycle}
        />
      )}
    </div>
  );
}
