import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';

interface LimitStatus {
  // User limits
  currentUsers: number;
  maxUsers: number | null; // null = unlimited
  canAddUser: boolean;
  usersRemaining: number | null;
  
  // Location limits
  currentLocations: number;
  maxLocations: number | null; // null = unlimited
  canAddLocation: boolean;
  locationsRemaining: number | null;
  
  loading: boolean;
}

/**
 * useLimitChecker - Hook for checking user and location limits
 * 
 * -1 in max_users or max_locations means unlimited (Enterprise)
 */
export function useLimitChecker(): LimitStatus {
  const { currentOrganization } = useAuth();
  const { plan, loading: planLoading } = useSubscription();
  const [counts, setCounts] = useState({ users: 0, locations: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentOrganization?.id) {
      setLoading(false);
      return;
    }

    const fetchCounts = async () => {
      setLoading(true);
      
      try {
        // Count users in organization
        const { count: userCount } = await supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', currentOrganization.id);

        // Count locations in organization
        const { count: locationCount } = await supabase
          .from('locations')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', currentOrganization.id);

        setCounts({
          users: userCount || 0,
          locations: locationCount || 0,
        });
      } catch (error) {
        console.error('Error fetching limit counts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();
  }, [currentOrganization?.id]);

  // Get limits from plan (-1 means unlimited)
  const maxUsers = plan?.max_users ?? 5; // Default to 5 for starter
  const maxLocations = plan?.max_locations ?? 1; // Default to 1 for starter

  // Check if unlimited (-1)
  const isUnlimitedUsers = maxUsers === -1;
  const isUnlimitedLocations = maxLocations === -1;

  // Calculate remaining
  const usersRemaining = isUnlimitedUsers ? null : Math.max(0, maxUsers - counts.users);
  const locationsRemaining = isUnlimitedLocations ? null : Math.max(0, maxLocations - counts.locations);

  // Check if can add more
  const canAddUser = isUnlimitedUsers || counts.users < maxUsers;
  const canAddLocation = isUnlimitedLocations || counts.locations < maxLocations;

  return {
    currentUsers: counts.users,
    maxUsers: isUnlimitedUsers ? null : maxUsers,
    canAddUser,
    usersRemaining,
    
    currentLocations: counts.locations,
    maxLocations: isUnlimitedLocations ? null : maxLocations,
    canAddLocation,
    locationsRemaining,
    
    loading: loading || planLoading,
  };
}

/**
 * LimitBadge - Display current usage vs limit
 */
export function formatLimitDisplay(current: number, max: number | null): string {
  if (max === null) {
    return `${current} (Unlimited)`;
  }
  return `${current} / ${max}`;
}
