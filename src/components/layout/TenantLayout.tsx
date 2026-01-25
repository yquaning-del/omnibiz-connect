import { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Home, 
  FileText, 
  CreditCard, 
  Wrench, 
  User, 
  LogOut,
  Menu,
  X,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { title: 'Dashboard', href: '/tenant/dashboard', icon: Home },
  { title: 'My Leases', href: '/tenant/leases', icon: FileText },
  { title: 'Payments', href: '/tenant/payments', icon: CreditCard },
  { title: 'Maintenance', href: '/tenant/maintenance', icon: Wrench },
  { title: 'Profile', href: '/tenant/profile', icon: User },
];

export function TenantLayout() {
  const { user, loading, signOut, profile, hasRole } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tenantData, setTenantData] = useState<any>(null);
  const [tenantLoading, setTenantLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTenantData();
    }
  }, [user]);

  const fetchTenantData = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('tenants')
        .select('*, leases(*)')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setTenantData(data);
    } catch (error) {
      console.error('Error fetching tenant data:', error);
    } finally {
      setTenantLoading(false);
    }
  };

  if (loading || tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-property" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/tenant/auth" replace />;
  }

  // Check if user has tenant role
  const isTenant = hasRole('tenant');
  if (!isTenant && !loading) {
    // User is logged in but not a tenant - redirect to main app or show message
    return <Navigate to="/dashboard" replace />;
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'T';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 bg-card border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-property" />
              <span className="font-semibold">Tenant Portal</span>
            </div>
          </div>
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-property/10 text-property">
              {getInitials(profile?.full_name)}
            </AvatarFallback>
          </Avatar>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border/50 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="hidden lg:flex items-center gap-3 px-6 py-5 border-b border-border/50">
              <Building2 className="h-8 w-8 text-property" />
              <div>
                <h1 className="font-bold text-lg">Tenant Portal</h1>
                <p className="text-xs text-muted-foreground">Property Management</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-property/10 text-property"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.title}
                  </Link>
                );
              })}
            </nav>

            {/* User Footer */}
            <div className="px-4 py-4 border-t border-border/50">
              <div className="flex items-center gap-3 px-3 py-2">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-property/10 text-property">
                    {getInitials(profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {profile?.full_name || 'Tenant'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {profile?.email}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start mt-2 text-muted-foreground hover:text-destructive"
                onClick={() => signOut()}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0 lg:min-h-screen">
          <div className="p-4 lg:p-6">
            <Outlet context={{ tenantData, refreshTenantData: fetchTenantData }} />
          </div>
        </main>
      </div>
    </div>
  );
}
