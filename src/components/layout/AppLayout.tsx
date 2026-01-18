import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SubscriptionProvider, useSubscription } from '@/contexts/SubscriptionContext';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { NotificationProvider } from '@/components/notifications/NotificationProvider';
import { TrialBadge } from '@/components/subscription/TrialBadge';
import { ExpiredTrialOverlay } from '@/components/subscription/ExpiredTrialOverlay';
import { Loader2, Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Inner component that can access subscription context
function AppLayoutContent() {
  const { isExpired, isPaid, loading: subscriptionLoading } = useSubscription();
  const showExpiredOverlay = !subscriptionLoading && isExpired && !isPaid;

  return (
    <>
      {showExpiredOverlay && <ExpiredTrialOverlay />}
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <header className="h-14 border-b border-border/50 flex items-center justify-between px-4 bg-card/50 backdrop-blur sticky top-0 z-40">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="lg:hidden" />
                
                <div className="hidden md:flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search products, orders..."
                    className="border-0 bg-transparent h-7 w-64 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <kbd className="hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                    ⌘K
                  </kbd>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <TrialBadge />
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
                </Button>
              </div>
            </header>

            {/* Main content */}
            <main className="flex-1 overflow-auto">
              <div className="p-6">
                <Outlet />
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </>
  );
}

export function AppLayout() {
  const { user, loading, organizations } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If user has no organizations, redirect to onboarding
  if (organizations.length === 0 && !loading) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <NotificationProvider>
      <SubscriptionProvider>
        <AppLayoutContent />
      </SubscriptionProvider>
    </NotificationProvider>
  );
}
