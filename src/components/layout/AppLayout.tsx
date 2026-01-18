import { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SubscriptionProvider, useSubscription } from '@/contexts/SubscriptionContext';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { NotificationProvider } from '@/components/notifications/NotificationProvider';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { TrialBadge } from '@/components/subscription/TrialBadge';
import { ExpiredTrialOverlay } from '@/components/subscription/ExpiredTrialOverlay';
import { CommandPalette } from '@/components/ui/command-palette';
import { ProductTour } from '@/components/onboarding/ProductTour';
import { FeedbackWidget } from '@/components/feedback/FeedbackWidget';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

// Inner component that can access subscription context
function AppLayoutContent() {
  const { isExpired, isPaid, loading: subscriptionLoading } = useSubscription();
  const { user, profile } = useAuth();
  const showExpiredOverlay = !subscriptionLoading && isExpired && !isPaid;
  
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);

  // Initialize keyboard shortcuts
  useKeyboardShortcuts(() => setCommandPaletteOpen(true));

  // Check if user needs to see the product tour
  useEffect(() => {
    const checkTourStatus = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('tour_completed')
        .eq('id', user.id)
        .single();
      
      if (data && !data.tour_completed) {
        // Small delay to let the app load first
        setTimeout(() => setShowTour(true), 1000);
      }
    };
    
    checkTourStatus();
  }, [user]);

  const handleSearchClick = () => {
    setCommandPaletteOpen(true);
  };

  return (
    <>
      {showExpiredOverlay && <ExpiredTrialOverlay />}
      {showTour && (
        <ProductTour 
          onComplete={() => setShowTour(false)} 
          onSkip={() => setShowTour(false)} 
        />
      )}
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
      <FeedbackWidget />
      
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <header className="h-14 border-b border-border/50 flex items-center justify-between px-4 bg-card/50 backdrop-blur sticky top-0 z-40">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="lg:hidden" />
                
                <button 
                  onClick={handleSearchClick}
                  className="hidden md:flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5 hover:bg-muted transition-colors cursor-pointer"
                >
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground w-48 text-left">
                    Search or jump to...
                  </span>
                  <kbd className="hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                    ⌘K
                  </kbd>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <TrialBadge />
                <NotificationCenter />
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
