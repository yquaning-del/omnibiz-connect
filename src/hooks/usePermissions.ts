import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { BusinessVertical, AppRole } from '@/types';
import { getDefaultPermissionsForRole, getPermissionKeyFromRoute } from '@/lib/verticalPermissions';

interface UserPermission {
  permission_key: string;
  granted: boolean;
}

export function usePermissions() {
  const { user, roles, currentOrganization, currentLocation, hasRole } = useAuth();
  const [customPermissions, setCustomPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);

  const vertical = (currentLocation?.vertical || currentOrganization?.primary_vertical || 'retail') as BusinessVertical;

  // Get current user's role in this organization
  const currentRole = roles.find(
    (r) => r.organization_id === currentOrganization?.id
  )?.role as AppRole | undefined;

  // Fetch custom permissions for the user
  useEffect(() => {
    const fetchPermissions = async () => {
      if (!user || !currentOrganization) {
        setLoading(false);
        return;
      }

      // Get user's role record
      const userRoleRecord = roles.find(
        (r) => r.organization_id === currentOrganization.id
      );

      if (!userRoleRecord) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_permissions')
        .select('permission_key, granted')
        .eq('user_role_id', userRoleRecord.id);

      if (error) {
        console.error('Error fetching permissions:', error);
      } else if (data) {
        setCustomPermissions(data);
      }

      setLoading(false);
    };

    fetchPermissions();
  }, [user, currentOrganization, roles]);

  // Check if user has a specific permission
  const hasPermission = useCallback(
    (permissionKey: string): boolean => {
      // Super admins have all permissions
      if (hasRole('super_admin')) {
        return true;
      }

      if (!currentRole) {
        return false;
      }

      // Check for custom permission override
      const customPerm = customPermissions.find(
        (p) => p.permission_key === permissionKey
      );

      if (customPerm !== undefined) {
        return customPerm.granted;
      }

      // Fall back to role defaults
      const defaultPermissions = getDefaultPermissionsForRole(vertical, currentRole);
      return defaultPermissions.includes(permissionKey);
    },
    [currentRole, customPermissions, vertical, hasRole]
  );

  // Check if user can access a specific route
  const canAccessRoute = useCallback(
    (route: string): boolean => {
      // Super admins can access everything
      if (hasRole('super_admin')) {
        return true;
      }

      const permissionKey = getPermissionKeyFromRoute(vertical, route);
      
      // If no permission mapping exists, allow access
      if (!permissionKey) {
        return true;
      }

      return hasPermission(permissionKey);
    },
    [hasPermission, vertical, hasRole]
  );

  // Get all granted permissions for the current user
  const getGrantedPermissions = useCallback((): string[] => {
    if (hasRole('super_admin')) {
      return []; // Super admin has all permissions, no need to list
    }

    if (!currentRole) {
      return [];
    }

    const defaultPermissions = getDefaultPermissionsForRole(vertical, currentRole);
    
    // Merge with custom permissions
    const grantedSet = new Set(defaultPermissions);
    
    for (const customPerm of customPermissions) {
      if (customPerm.granted) {
        grantedSet.add(customPerm.permission_key);
      } else {
        grantedSet.delete(customPerm.permission_key);
      }
    }

    return Array.from(grantedSet);
  }, [currentRole, customPermissions, vertical, hasRole]);

  return {
    hasPermission,
    canAccessRoute,
    getGrantedPermissions,
    loading,
    currentRole,
    vertical,
    isSuperAdmin: hasRole('super_admin'),
  };
}

// Hook for fetching another user's permissions (for admins editing staff permissions)
export function useStaffPermissions(userRoleId: string | null) {
  const { currentOrganization, currentLocation } = useAuth();
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(false);

  const vertical = (currentLocation?.vertical || currentOrganization?.primary_vertical || 'retail') as BusinessVertical;

  const fetchPermissions = useCallback(async () => {
    if (!userRoleId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('user_permissions')
      .select('permission_key, granted')
      .eq('user_role_id', userRoleId);

    if (error) {
      console.error('Error fetching staff permissions:', error);
    } else if (data) {
      setPermissions(data);
    }

    setLoading(false);
  }, [userRoleId]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const savePermissions = useCallback(
    async (newPermissions: { permission_key: string; granted: boolean }[]) => {
      if (!userRoleId) return { success: false, error: 'No user role ID' };

      // Delete existing permissions
      await supabase
        .from('user_permissions')
        .delete()
        .eq('user_role_id', userRoleId);

      // Insert new permissions
      if (newPermissions.length > 0) {
        const { error } = await supabase.from('user_permissions').insert(
          newPermissions.map((p) => ({
            user_role_id: userRoleId,
            permission_key: p.permission_key,
            granted: p.granted,
          }))
        );

        if (error) {
          return { success: false, error: error.message };
        }
      }

      // Refresh permissions
      await fetchPermissions();
      return { success: true };
    },
    [userRoleId, fetchPermissions]
  );

  return {
    permissions,
    loading,
    vertical,
    savePermissions,
    refetch: fetchPermissions,
  };
}
