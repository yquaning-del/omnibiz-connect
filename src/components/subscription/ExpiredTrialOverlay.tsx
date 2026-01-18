import { useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ALLOWED_PATHS = ['/subscription', '/settings', '/auth', '/onboarding'];

export function ExpiredTrialOverlay() {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show overlay on allowed paths
  if (ALLOWED_PATHS.some(path => location.pathname.startsWith(path))) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-lg w-full border-destructive/50 bg-card shadow-2xl animate-fade-in">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold">Your Trial Has Expired</CardTitle>
          <p className="text-muted-foreground">
            Your 14-day free trial has ended. Choose a plan to continue using all features.
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* What you'll lose access to */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Access Blocked To:
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                'Point of Sale',
                'Inventory Management',
                'Customer Data',
                'Reports & Analytics',
                'Staff Management',
                'All Business Features',
              ].map((feature) => (
                <div 
                  key={feature}
                  className="flex items-center gap-2 text-sm text-muted-foreground p-2 rounded bg-muted/50"
                >
                  <Lock className="w-3 h-3" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3 pt-4">
            <Button 
              className="w-full h-12 text-base gap-2"
              onClick={() => navigate('/subscription')}
            >
              <Sparkles className="w-4 h-4" />
              Choose a Plan
              <ArrowRight className="w-4 h-4 ml-auto" />
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full text-muted-foreground"
              onClick={() => navigate('/settings')}
            >
              Go to Settings
            </Button>
          </div>

          {/* Support link */}
          <p className="text-center text-sm text-muted-foreground">
            Questions? Contact our{' '}
            <a href="mailto:support@example.com" className="text-primary hover:underline">
              support team
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
