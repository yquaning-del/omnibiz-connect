import { Link } from 'react-router-dom';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Sparkles, ArrowRight, Crown, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Feature display names
const FEATURE_NAMES: Record<string, string> = {
  staff_management: 'Staff Management',
  advanced_reports: 'Advanced Reports',
  multi_location: 'Multi-Location Support',
  integrations: 'Third-Party Integrations',
  custom_branding: 'Custom Branding',
  api_access: 'API Access',
  sso: 'Single Sign-On',
  priority_support: 'Priority Support',
  custom_integrations: 'Custom Integrations',
  unlimited_users: 'Unlimited Users',
  dedicated_support: 'Dedicated Support',
  staff_scheduling: 'Staff Scheduling',
  reservations: 'Reservations',
  guest_profiles: 'Guest Profiles',
  maintenance_tracking: 'Maintenance Tracking',
  data_export: 'Data Export',
};

// Tier benefits for upgrade messaging
const TIER_BENEFITS: Record<string, string[]> = {
  professional: [
    'Manage your entire team',
    'Advanced analytics & reports',
    'Up to 3 business locations',
    'Priority email support',
    'Custom integrations',
  ],
  enterprise: [
    'Unlimited team members',
    'Unlimited locations',
    'API access for automation',
    'Single Sign-On (SSO)',
    'Dedicated account manager',
  ],
};

interface UpgradePromptProps {
  feature: string;
  requiredTier?: string;
  inline?: boolean;
  isExpired?: boolean;
}

export function UpgradePrompt({ 
  feature, 
  requiredTier = 'Professional',
  inline = false,
  isExpired = false
}: UpgradePromptProps) {
  const { plan } = useSubscription();
  const featureName = FEATURE_NAMES[feature] || feature.replace(/_/g, ' ');
  const tierBenefits = TIER_BENEFITS[requiredTier.toLowerCase()] || TIER_BENEFITS.professional;

  // Inline version - compact for inline content locks
  if (inline) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 border border-border/50">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Lock className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-foreground text-sm">{featureName}</p>
          <p className="text-xs text-muted-foreground">
            {isExpired ? 'Trial expired' : `Available in ${requiredTier}`}
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/subscription">
            Upgrade <ArrowRight className="w-3 h-3 ml-1" />
          </Link>
        </Button>
      </div>
    );
  }

  // Full page version
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <Card className="max-w-lg w-full border-border/50 bg-card/50">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
            {isExpired ? (
              <AlertTriangle className="w-8 h-8 text-warning" />
            ) : (
              <Crown className="w-8 h-8 text-primary" />
            )}
          </div>
          <CardTitle className="text-xl">
            {isExpired ? 'Trial Expired' : 'Upgrade Required'}
          </CardTitle>
          <CardDescription className="text-base">
            {isExpired 
              ? 'Your free trial has ended. Upgrade to continue using all features.'
              : `${featureName} is available on the ${requiredTier} plan.`
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Plan Badge */}
          {plan && (
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm text-muted-foreground">Current plan:</span>
              <Badge variant="outline" className="capitalize">
                {plan.name}
              </Badge>
            </div>
          )}

          {/* Benefits List */}
          <div className="space-y-3 p-4 rounded-lg bg-muted/20">
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              {requiredTier} includes:
            </p>
            <ul className="space-y-2">
              {tierBenefits.map((benefit, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-3">
            <Button asChild className="w-full" size="lg">
              <Link to="/subscription">
                <Crown className="w-4 h-4 mr-2" />
                View Plans & Upgrade
              </Link>
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link to="/dashboard">
                Return to Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * LockedFeatureOverlay - For overlaying on partially visible locked content
 */
export function LockedFeatureOverlay({ 
  feature, 
  requiredTier = 'Professional' 
}: { 
  feature: string; 
  requiredTier?: string;
}) {
  const featureName = FEATURE_NAMES[feature] || feature.replace(/_/g, ' ');
  
  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-10">
      <div className="text-center p-6">
        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
          <Lock className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="font-medium text-foreground mb-1">{featureName}</p>
        <p className="text-sm text-muted-foreground mb-4">
          Available in {requiredTier}
        </p>
        <Button asChild size="sm">
          <Link to="/subscription">
            Unlock Feature
          </Link>
        </Button>
      </div>
    </div>
  );
}
