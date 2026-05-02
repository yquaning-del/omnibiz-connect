import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type Vertical = 'restaurant' | 'hotel' | 'pharmacy' | 'retail' | 'property';

interface VerticalRouteGuardProps {
  allowed: Vertical[];
  children: ReactNode;
}

/**
 * Restricts a route to organizations whose current vertical is in `allowed`.
 * Super admins always pass. Mismatched verticals are redirected to /dashboard
 * with a toast explaining the module isn't available for their business type.
 */
export function VerticalRouteGuard({ allowed, children }: VerticalRouteGuardProps) {
  const { currentOrganization, currentLocation, hasRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (hasRole('super_admin')) {
    return <>{children}</>;
  }

  const vertical = (currentLocation?.vertical ||
    currentOrganization?.primary_vertical) as Vertical | undefined;

  if (!vertical || !allowed.includes(vertical)) {
    toast.error("This module isn't available for your business type.");
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
