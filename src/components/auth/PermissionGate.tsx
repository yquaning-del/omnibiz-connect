import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Loader2 } from 'lucide-react';
import { AccessDenied } from './AccessDenied';

interface PermissionGateProps {
  /** Single permission key or array of permission keys */
  permission: string | string[];
  children: ReactNode;
  /** Custom fallback component when access is denied */
  fallback?: ReactNode;
  /** If true, user must have ALL permissions; otherwise ANY is sufficient */
  requireAll?: boolean;
  /** Show loading spinner while checking permissions */
  showLoading?: boolean;
}

/**
 * Protects content based on user permissions.
 * Wraps pages or components that require specific permissions to access.
 * 
 * @example
 * <PermissionGate permission="property.leases">
 *   <LeasesContent />
 * </PermissionGate>
 * 
 * @example
 * <PermissionGate permission={["property.leases", "property.tenants"]} requireAll>
 *   <LeasingDashboard />
 * </PermissionGate>
 */
export function PermissionGate({
  permission,
  children,
  fallback,
  requireAll = false,
  showLoading = true,
}: PermissionGateProps) {
  const { hasPermission, loading, isSuperAdmin } = usePermissions();

  // Show loading state
  if (loading && showLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Super admins bypass all permission checks
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // Check permissions
  const permissions = Array.isArray(permission) ? permission : [permission];
  const hasAccess = requireAll
    ? permissions.every((p) => hasPermission(p))
    : permissions.some((p) => hasPermission(p));

  if (!hasAccess) {
    return <>{fallback || <AccessDenied />}</>;
  }

  return <>{children}</>;
}

/**
 * Hook variant for programmatic permission checking
 */
export function usePermissionCheck(permission: string | string[], requireAll = false): {
  hasAccess: boolean;
  loading: boolean;
} {
  const { hasPermission, loading, isSuperAdmin } = usePermissions();

  if (isSuperAdmin) {
    return { hasAccess: true, loading };
  }

  const permissions = Array.isArray(permission) ? permission : [permission];
  const hasAccess = requireAll
    ? permissions.every((p) => hasPermission(p))
    : permissions.some((p) => hasPermission(p));

  return { hasAccess, loading };
}
