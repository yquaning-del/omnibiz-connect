import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface AdminRouteGuardProps {
  children: ReactNode;
}

/**
 * Protects admin routes from non-super-admin users.
 * Redirects to /dashboard if the user doesn't have super_admin role.
 */
export function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  const { hasRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!hasRole('super_admin')) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
