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

// Feature to tier mapping - comprehensive list
const FEATURE_TIERS: Record<string, string[]> = {
  // === STARTER FEATURES (All tiers) ===
  'basic_pos': ['starter', 'professional', 'enterprise'],
  'basic_inventory': ['starter', 'professional', 'enterprise'],
  'basic_customers': ['starter', 'professional', 'enterprise'],
  'basic_reports': ['starter', 'professional', 'enterprise'],
  'basic_orders': ['starter', 'professional', 'enterprise'],
  'basic_products': ['starter', 'professional', 'enterprise'],
  'basic_tables': ['starter', 'professional', 'enterprise'],
  'basic_rooms': ['starter', 'professional', 'enterprise'],
  'basic_prescriptions': ['starter', 'professional', 'enterprise'],
  'basic_patients': ['starter', 'professional', 'enterprise'],
  'basic_medications': ['starter', 'professional', 'enterprise'],
  // Property Starter features
  'basic_units': ['starter', 'professional', 'enterprise'],
  'basic_tenants': ['starter', 'professional', 'enterprise'],
  'basic_leases': ['starter', 'professional', 'enterprise'],
  'basic_rent': ['starter', 'professional', 'enterprise'],
  
  // === PROFESSIONAL FEATURES ===
  'advanced_reports': ['professional', 'enterprise'],
  'data_export': ['professional', 'enterprise'],
  'multi_location': ['professional', 'enterprise'],
  'staff_management': ['professional', 'enterprise'],
  'staff_scheduling': ['professional', 'enterprise'],
  'integrations': ['professional', 'enterprise'],
  'custom_branding': ['professional', 'enterprise'],
  
  // Restaurant Professional features
  'kitchen_display': ['professional', 'enterprise'],
  'reservations': ['professional', 'enterprise'],
  'inventory_management': ['professional', 'enterprise'],
  
  // Hotel Professional features
  'housekeeping_management': ['professional', 'enterprise'],
  'maintenance_tracking': ['professional', 'enterprise'],
  'guest_profiles': ['professional', 'enterprise'],
  'guest_services': ['professional', 'enterprise'],
  
  // Pharmacy Professional features
  'insurance_billing': ['professional', 'enterprise'],
  'controlled_substances': ['professional', 'enterprise'],
  'drug_interactions': ['professional', 'enterprise'],
  
  // Retail Professional features
  'customer_management': ['professional', 'enterprise'],
  
  // Property Professional features
  'tenant_screening': ['professional', 'enterprise'],
  'lease_documents': ['professional', 'enterprise'],
  'rent_reminders': ['professional', 'enterprise'],
  'financial_reports': ['professional', 'enterprise'],
  'multi_property': ['professional', 'enterprise'],
  
  // === ENTERPRISE FEATURES ===
  'api_access': ['enterprise'],
  'sso': ['enterprise'],
  'priority_support': ['enterprise'],
  'custom_integrations': ['enterprise'],
  'unlimited_users': ['enterprise'],
  'unlimited_locations': ['enterprise'],
  'dedicated_support': ['enterprise'],
  'white_label': ['enterprise'],
  'advanced_analytics': ['enterprise'],
  // Property Enterprise features
  'accounting_integration': ['enterprise'],
  'bulk_operations': ['enterprise'],
  'custom_lease_templates': ['enterprise'],
  'unlimited_units': ['enterprise'],
};

// Get required tier for a feature
export function getRequiredTier(feature: string): string {
  const tiers = FEATURE_TIERS[feature];
  if (!tiers || tiers.includes('starter')) return 'Starter';
  if (tiers.includes('professional')) return 'Professional';
  return 'Enterprise';
}

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

export { FEATURE_TIERS };
