import { ReactNode } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { UpgradePrompt } from './UpgradePrompt';

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
  inline?: boolean;
  requiredTier?: string;
}

/**
 * FeatureGate - Wraps content that requires a specific subscription tier
 * 
 * Usage:
 * <FeatureGate feature="staff_management">
 *   <StaffContent />
 * </FeatureGate>
 */
export function FeatureGate({ 
  feature, 
  children, 
  fallback,
  inline = false,
  requiredTier = 'Professional'
}: FeatureGateProps) {
  const { canAccess, loading, isExpired } = useSubscription();

  // Show nothing while loading
  if (loading) {
    return null;
  }

  // If trial is expired, show upgrade prompt
  if (isExpired) {
    return fallback || <UpgradePrompt feature={feature} requiredTier={requiredTier} inline={inline} isExpired />;
  }

  // Check if user can access this feature
  if (!canAccess(feature)) {
    return fallback || <UpgradePrompt feature={feature} requiredTier={requiredTier} inline={inline} />;
  }

  return <>{children}</>;
}

/**
 * useFeatureAccess - Hook for checking feature access programmatically
 */
export function useFeatureAccess(feature: string) {
  const { canAccess, loading, isExpired, plan } = useSubscription();
  
  return {
    hasAccess: !isExpired && canAccess(feature),
    loading,
    isExpired,
    currentTier: plan?.tier || 'starter',
  };
}
