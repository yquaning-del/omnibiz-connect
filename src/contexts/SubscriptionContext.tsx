import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Plan {
  id: string;
  name: string;
  tier: string;
  price_monthly: number;
  price_yearly: number | null;
  features: string[];
  max_users: number | null;
  max_locations: number | null;
}

interface Subscription {
  id: string;
  organization_id: string;
  plan_id: string | null;
  status: string;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
}

interface SubscriptionContextType {
  subscription: Subscription | null;
  plan: Plan | null;
  loading: boolean;
  isTrialing: boolean;
  daysRemaining: number;
  isPaid: boolean;
  isExpired: boolean;
  canAccess: (feature: string) => boolean;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

// Feature to tier mapping
const FEATURE_TIERS: Record<string, string[]> = {
  // Starter features
  'basic_pos': ['starter', 'professional', 'enterprise'],
  'basic_inventory': ['starter', 'professional', 'enterprise'],
  'basic_customers': ['starter', 'professional', 'enterprise'],
  'basic_reports': ['starter', 'professional', 'enterprise'],
  
  // Professional features
  'advanced_reports': ['professional', 'enterprise'],
  'multi_location': ['professional', 'enterprise'],
  'staff_management': ['professional', 'enterprise'],
  'integrations': ['professional', 'enterprise'],
  'custom_branding': ['professional', 'enterprise'],
  
  // Enterprise features
  'api_access': ['enterprise'],
  'sso': ['enterprise'],
  'priority_support': ['enterprise'],
  'custom_integrations': ['enterprise'],
  'unlimited_users': ['enterprise'],
  'dedicated_support': ['enterprise'],
};

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { currentOrganization } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = async () => {
    if (!currentOrganization?.id) {
      setSubscription(null);
      setPlan(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch subscription
      const { data: subData, error: subError } = await supabase
        .from('organization_subscriptions')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .maybeSingle();

      if (subError) throw subError;

      if (subData) {
        setSubscription(subData);

        // Fetch plan if subscription has one
        if (subData.plan_id) {
          const { data: planData, error: planError } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('id', subData.plan_id)
            .single();

          if (planError) throw planError;
          
          // Parse features from JSON
          const features = Array.isArray(planData.features) 
            ? planData.features as string[]
            : [];
          
          setPlan({ ...planData, features });
        } else {
          setPlan(null);
        }
      } else {
        setSubscription(null);
        setPlan(null);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setSubscription(null);
      setPlan(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [currentOrganization?.id]);

  // Calculate trial status
  const isTrialing = subscription?.status === 'trial' || subscription?.status === 'trialing';
  
  const daysRemaining = (() => {
    if (!subscription?.trial_ends_at) return 0;
    const trialEnd = new Date(subscription.trial_ends_at);
    const now = new Date();
    const diff = trialEnd.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  const isPaid = subscription?.status === 'active' && !isTrialing;
  
  const isExpired = (() => {
    if (subscription?.status === 'cancelled' || subscription?.status === 'expired') return true;
    if (isTrialing && daysRemaining === 0) return true;
    return false;
  })();

  // Feature gating function
  const canAccess = (feature: string): boolean => {
    // If no subscription or plan, only allow basic features
    if (!subscription || !plan) {
      return FEATURE_TIERS[feature]?.includes('starter') ?? false;
    }

    // If trial is expired, no access
    if (isExpired && !isPaid) {
      return false;
    }

    // Check if the current plan tier allows this feature
    const allowedTiers = FEATURE_TIERS[feature];
    if (!allowedTiers) {
      // Unknown feature - allow by default
      return true;
    }

    return allowedTiers.includes(plan.tier.toLowerCase());
  };

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        plan,
        loading,
        isTrialing,
        daysRemaining,
        isPaid,
        isExpired,
        canAccess,
        refresh: fetchSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
