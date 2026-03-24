import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UtensilsCrossed, Building2, Pill, ShoppingCart, Check, ArrowRight, ArrowLeft, RotateCcw, Home, Building } from 'lucide-react';
import { BusinessVertical } from '@/types';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { PlanSelectionStep } from '@/components/subscription/PlanSelectionStep';
import { toast } from 'sonner';

const verticals = [
  {
    id: 'restaurant' as BusinessVertical,
    name: 'Restaurant',
    description: 'Cafes, restaurants, bars, food trucks',
    icon: UtensilsCrossed,
    color: 'restaurant',
    bgClass: 'bg-restaurant/20 border-restaurant/30',
    activeClass: 'bg-restaurant/30 border-restaurant ring-2 ring-restaurant/50',
  },
  {
    id: 'hotel' as BusinessVertical,
    name: 'Hotel',
    description: 'Hotels, resorts, B&Bs, hostels',
    icon: Building2,
    color: 'hotel',
    bgClass: 'bg-hotel/20 border-hotel/30',
    activeClass: 'bg-hotel/30 border-hotel ring-2 ring-hotel/50',
  },
  {
    id: 'pharmacy' as BusinessVertical,
    name: 'Pharmacy',
    description: 'Pharmacies, drugstores, medical supplies',
    icon: Pill,
    color: 'pharmacy',
    bgClass: 'bg-pharmacy/20 border-pharmacy/30',
    activeClass: 'bg-pharmacy/30 border-pharmacy ring-2 ring-pharmacy/50',
  },
  {
    id: 'retail' as BusinessVertical,
    name: 'Retail / Grocery',
    description: 'Supermarkets, convenience stores, retail shops',
    icon: ShoppingCart,
    color: 'retail',
    bgClass: 'bg-retail/20 border-retail/30',
    activeClass: 'bg-retail/30 border-retail ring-2 ring-retail/50',
  },
  {
    id: 'property' as BusinessVertical,
    name: 'Property Management',
    description: 'Apartments, condos, single/multi-unit rentals',
    icon: Building,
    color: 'property',
    bgClass: 'bg-property/20 border-property/30',
    activeClass: 'bg-property/30 border-property ring-2 ring-property/50',
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, loading, refreshUserData } = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isResuming, setIsResuming] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  
  // Partial records for resume flow
  const [existingOrg, setExistingOrg] = useState<{ id: string; name: string; primary_vertical: BusinessVertical } | null>(null);
  const [existingLocation, setExistingLocation] = useState<{ id: string } | null>(null);
  
  // Step 1: Business info
  const [businessName, setBusinessName] = useState('');
  const [selectedVertical, setSelectedVertical] = useState<BusinessVertical | null>(null);
  
  // Step 2: Location info
  const [locationName, setLocationName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  
  // Step 3: Plan selection
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // Check for partial onboarding state and resume
  useEffect(() => {
    const checkPartialOnboarding = async () => {
      if (!user) {
        setIsResuming(false);
        return;
      }

      try {
        // Check if user has any roles already (fully onboarded)
        const { data: roles } = await supabase
          .from('user_roles')
          .select('organization_id, location_id')
          .eq('user_id', user.id)
          .limit(1);

        if (roles && roles.length > 0 && roles[0].organization_id && roles[0].location_id) {
          // Fully onboarded - redirect
          navigate('/dashboard', { replace: true });
          return;
        }

        // Check for partially created org (created_by = user but no role assigned)
        const { data: partialOrg } = await supabase
          .from('organizations')
          .select('id, name, primary_vertical')
          .eq('created_by', user.id)
          .limit(1);

        if (partialOrg && partialOrg.length > 0) {
          const org = partialOrg[0];
          setExistingOrg(org);
          setBusinessName(org.name);
          setSelectedVertical(org.primary_vertical as BusinessVertical);

          // Check for existing location for this org
          const { data: partialLoc } = await supabase
            .from('locations')
            .select('id, name, address, city, country')
            .eq('organization_id', org.id)
            .limit(1);

          if (partialLoc && partialLoc.length > 0) {
            const loc = partialLoc[0];
            setExistingLocation(loc);
            setLocationName(loc.name || '');
            setAddress(loc.address || '');
            setCity(loc.city || '');
            setCountry(loc.country || '');
            // Org + location exist, just need role - go to step 2 to confirm
            setStep(2);
            toast.success("Resuming setup", { description: "We found your partial setup. Just confirm to complete!" });
          } else {
            // Org exists but no location - skip to step 2
            setLocationName(org.name + ' - Main');
            setStep(2);
            toast.success("Resuming setup", { description: "We found your business. Add your first location to continue." });
          }
        }
      } catch (error) {
        console.error('Resume check error:', error);
      } finally {
        setIsResuming(false);
      }
    };

    if (!loading) {
      checkPartialOnboarding();
    }
  }, [user, loading, navigate, toast]);

  // Redirect if no user
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [loading, user, navigate]);

  // Show loading while checking auth or resume state
  if (loading || isResuming) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 50) + '-' + Date.now().toString(36);
  };

  const handleNext = () => {
    if (step === 1) {
      if (!businessName.trim()) {
        toast.error("Business name required", { description: "Please enter your business name." });
        return;
      }
      if (!selectedVertical) {
        toast.error("Business type required", { description: "Please select your business type." });
        return;
      }
      setLocationName(businessName + ' - Main');
      setStep(2);
    }
  };

  const handleLocationComplete = () => {
    // Move to plan selection step
    setStep(3);
  };

  const handlePlanSelect = async (planId: string, startTrial: boolean) => {
    if (!user || !selectedVertical) return;
    
    setSelectedPlanId(planId);
    setIsLoading(true);

    try {
      let orgId = existingOrg?.id;
      let locId = existingLocation?.id;

      // Create organization only if we don't have one
      if (!orgId) {
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: businessName.trim(),
            slug: generateSlug(businessName),
            primary_vertical: selectedVertical,
            created_by: user.id,
          })
          .select()
          .single();

        if (orgError) throw orgError;
        orgId = org.id;
      }

      // Create location only if we don't have one
      if (!locId) {
        const { data: loc, error: locError } = await supabase
          .from('locations')
          .insert({
            organization_id: orgId,
            name: locationName.trim() || businessName + ' - Main',
            address: address.trim() || null,
            city: city.trim() || null,
            country: country.trim() || null,
            vertical: selectedVertical,
          })
          .select()
          .single();

        if (locError) throw locError;
        locId = loc.id;
      }

      // Check if role already exists
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', user.id)
        .eq('organization_id', orgId)
        .limit(1);

      // Assign org_admin role only if not already assigned
      if (!existingRole || existingRole.length === 0) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: user.id,
            organization_id: orgId,
            location_id: locId,
            role: 'org_admin',
          });

        if (roleError) throw roleError;
      }

      // Create subscription with trial
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);

      const { error: subError } = await supabase
        .from('organization_subscriptions')
        .upsert({
          organization_id: orgId,
          plan_id: planId,
          status: startTrial ? 'trial' : 'active',
          trial_ends_at: startTrial ? trialEndsAt.toISOString() : null,
          current_period_start: new Date().toISOString(),
          current_period_end: trialEndsAt.toISOString(),
        }, {
          onConflict: 'organization_id',
        });

      if (subError) throw subError;

      toast.success("Setup complete!");

      // Force refresh auth state to populate organizations/roles before navigating
      await refreshUserData();

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Onboarding error:', error);
      toast.error("Setup failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartFresh = async () => {
    if (!user) return;
    
    setIsClearing(true);
    try {
      // Delete user roles first (FK constraint)
      await supabase.from('user_roles').delete().eq('user_id', user.id);
      
      // Delete locations for orgs created by user
      const { data: userOrgs } = await supabase
        .from('organizations')
        .select('id')
        .eq('created_by', user.id);
      
      if (userOrgs && userOrgs.length > 0) {
        for (const org of userOrgs) {
          await supabase.from('locations').delete().eq('organization_id', org.id);
        }
      }
      
      // Delete organizations created by user
      await supabase.from('organizations').delete().eq('created_by', user.id);
      
      // Reset local state
      setExistingOrg(null);
      setExistingLocation(null);
      setBusinessName('');
      setSelectedVertical(null);
      setLocationName('');
      setAddress('');
      setCity('');
      setCountry('');
      setStep(1);
      
      toast.success("Fresh start!", { description: "All partial data has been cleared. You can start over." });
    } catch (error: any) {
      console.error('Clear data error:', error);
      toast.error("Failed to clear data");
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      <div className="absolute top-0 left-0 w-full h-full gradient-glow" />
      
      <Card className="w-full max-w-2xl border-border/50 bg-card/80 backdrop-blur relative z-10">
        <CardHeader className="text-center">
          <div className="flex items-center justify-between mb-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-muted-foreground hover:text-foreground"
                  disabled={isClearing}
                >
                  {isClearing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4 mr-1" />
                  )}
                  Start Fresh
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Start fresh?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete any partially created business data and let you start the setup from scratch. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleStartFresh}>
                    Yes, start fresh
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={cn(
                  'w-3 h-3 rounded-full transition-all',
                  s === step ? 'bg-primary w-8' : s < step ? 'bg-primary' : 'bg-muted'
                )}
              />
            ))}
            </div>
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <Home className="h-4 w-4 mr-1" />
                Home
              </Button>
            </Link>
          </div>
          <CardTitle className="text-2xl font-display">
            {step === 1 ? 'Set up your business' : step === 2 ? 'Add your first location' : 'Choose your plan'}
          </CardTitle>
          <CardDescription>
            {step === 1 
              ? 'Tell us about your business to get started' 
              : step === 2 
                ? 'Where is your business located?'
                : 'Start with a 14-day free trial'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="business-name">Business Name</Label>
                <Input
                  id="business-name"
                  type="text"
                  placeholder="My Awesome Business"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="text-lg"
                />
              </div>

              <div className="space-y-3">
                <Label>Business Type</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {verticals.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVertical(v.id)}
                      className={cn(
                        'relative flex items-start gap-4 p-4 rounded-xl border transition-all text-left',
                        selectedVertical === v.id ? v.activeClass : v.bgClass,
                        'hover:scale-[1.02] active:scale-[0.98]'
                      )}
                    >
                      {selectedVertical === v.id && (
                        <div className="absolute top-2 right-2">
                          <Check className="w-5 h-5 text-primary" />
                        </div>
                      )}
                      <div className={cn(
                        'w-12 h-12 rounded-lg flex items-center justify-center shrink-0',
                        v.bgClass
                      )}>
                        <v.icon className={cn('w-6 h-6', `text-${v.color}`)} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{v.name}</h3>
                        <p className="text-sm text-muted-foreground">{v.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <Button onClick={handleNext} className="w-full" size="lg">
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="location-name">Location Name</Label>
                <Input
                  id="location-name"
                  type="text"
                  placeholder="Main Branch"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address (Optional)</Label>
                <Input
                  id="address"
                  type="text"
                  placeholder="123 Main Street"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City (Optional)</Label>
                  <Input
                    id="city"
                    type="text"
                    placeholder="New York"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country (Optional)</Label>
                  <Input
                    id="country"
                    type="text"
                    placeholder="USA"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button 
                  onClick={handleLocationComplete}
                  className="flex-1"
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {step === 3 && selectedVertical && (
            <PlanSelectionStep
              vertical={selectedVertical}
              onSelect={handlePlanSelect}
              onBack={() => setStep(2)}
              isLoading={isLoading}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
