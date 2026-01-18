import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BusinessVertical } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Sparkles, Zap, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Plan {
  id: string;
  name: string;
  tier: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number | null;
  features: string[];
  max_users: number | null;
  max_locations: number | null;
}

interface PlanSelectionStepProps {
  vertical: BusinessVertical;
  onSelect: (planId: string, startTrial: boolean) => void;
  onBack: () => void;
  isLoading?: boolean;
}

const tierIcons: Record<string, React.ElementType> = {
  starter: Zap,
  professional: Crown,
  enterprise: Sparkles,
};

const tierColors: Record<string, string> = {
  starter: 'from-blue-500 to-cyan-500',
  professional: 'from-violet-500 to-purple-500',
  enterprise: 'from-amber-500 to-orange-500',
};

export function PlanSelectionStep({ vertical, onSelect, onBack, isLoading = false }: PlanSelectionStepProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isYearly, setIsYearly] = useState(false);

  useEffect(() => {
    const fetchPlans = async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('vertical', vertical)
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });

      if (!error && data) {
        const formattedPlans = data.map(plan => ({
          ...plan,
          features: Array.isArray(plan.features) ? plan.features as string[] : [],
        }));
        setPlans(formattedPlans);
        
        // Auto-select professional tier
        const professionalPlan = formattedPlans.find(p => p.tier.toLowerCase() === 'professional');
        if (professionalPlan) {
          setSelectedPlan(professionalPlan.id);
        }
      }
      setLoading(false);
    };

    fetchPlans();
  }, [vertical]);

  const handleContinue = () => {
    if (selectedPlan) {
      onSelect(selectedPlan, true); // Start trial
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">Choose Your Plan</h2>
        <p className="text-sm text-muted-foreground">
          Start with a 14-day free trial. No credit card required.
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4">
        <span className={cn("text-sm", !isYearly && "font-semibold text-foreground")}>Monthly</span>
        <button
          onClick={() => setIsYearly(!isYearly)}
          className={cn(
            "relative w-14 h-7 rounded-full transition-colors",
            isYearly ? "bg-primary" : "bg-muted"
          )}
        >
          <div
            className={cn(
              "absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow-sm",
              isYearly ? "translate-x-8" : "translate-x-1"
            )}
          />
        </button>
        <span className={cn("text-sm", isYearly && "font-semibold text-foreground")}>
          Yearly
          <Badge variant="secondary" className="ml-2 text-xs">Save 20%</Badge>
        </span>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const Icon = tierIcons[plan.tier.toLowerCase()] || Zap;
          const isSelected = selectedPlan === plan.id;
          const price = isYearly && plan.price_yearly 
            ? Math.round(plan.price_yearly / 12) 
            : plan.price_monthly;

          return (
            <Card
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={cn(
                "relative cursor-pointer transition-all hover:scale-[1.02]",
                isSelected 
                  ? "ring-2 ring-primary border-primary shadow-lg" 
                  : "border-border/50 hover:border-border"
              )}
            >
              {plan.tier.toLowerCase() === 'professional' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                </div>
              )}
              
              <CardHeader className="pb-4">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br mb-2",
                  tierColors[plan.tier.toLowerCase()] || 'from-gray-500 to-gray-600'
                )}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <CardDescription className="text-xs line-clamp-2">
                  {plan.description || `Perfect for ${plan.tier.toLowerCase()} businesses`}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div>
                  <span className="text-3xl font-bold">${price}</span>
                  <span className="text-muted-foreground text-sm">/month</span>
                </div>

                <ul className="space-y-2 text-sm">
                  {plan.features.slice(0, 5).map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                  {plan.max_users && (
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">
                        Up to {plan.max_users} users
                      </span>
                    </li>
                  )}
                </ul>

                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onBack} className="flex-1" disabled={isLoading}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button 
          onClick={handleContinue} 
          className="flex-1" 
          disabled={!selectedPlan || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Setting up...
            </>
          ) : (
            <>
              Start 14-Day Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
