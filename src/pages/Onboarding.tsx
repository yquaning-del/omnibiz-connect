import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UtensilsCrossed, Building2, Pill, ShoppingCart, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { BusinessVertical } from '@/types';
import { cn } from '@/lib/utils';

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
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, loading, organizations } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  // Step 1: Business info
  const [businessName, setBusinessName] = useState('');
  const [selectedVertical, setSelectedVertical] = useState<BusinessVertical | null>(null);
  
  // Step 2: Location info
  const [locationName, setLocationName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');

  // Redirect if user already has organizations
  useEffect(() => {
    if (!loading && organizations.length > 0) {
      navigate('/dashboard', { replace: true });
    }
    if (!loading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [loading, organizations, user, navigate]);

  // Show loading while checking auth state
  if (loading) {
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
        toast({
          variant: 'destructive',
          title: 'Business name required',
          description: 'Please enter your business name.',
        });
        return;
      }
      if (!selectedVertical) {
        toast({
          variant: 'destructive',
          title: 'Business type required',
          description: 'Please select your business type.',
        });
        return;
      }
      setLocationName(businessName + ' - Main');
      setStep(2);
    }
  };

  const handleComplete = async () => {
    if (!user || !selectedVertical) return;
    
    setIsLoading(true);

    try {
      // Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: businessName.trim(),
          slug: generateSlug(businessName),
          primary_vertical: selectedVertical,
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Create first location
      const { data: loc, error: locError } = await supabase
        .from('locations')
        .insert({
          organization_id: org.id,
          name: locationName.trim() || businessName + ' - Main',
          address: address.trim() || null,
          city: city.trim() || null,
          country: country.trim() || null,
          vertical: selectedVertical,
        })
        .select()
        .single();

      if (locError) throw locError;

      // Assign org_admin role to user
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          organization_id: org.id,
          location_id: loc.id,
          role: 'org_admin',
        });

      if (roleError) throw roleError;

      toast({
        title: 'Setup complete!',
        description: 'Your business has been created. Redirecting to dashboard...',
      });

      // Brief delay then navigate
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (error: any) {
      console.error('Onboarding error:', error);
      toast({
        variant: 'destructive',
        title: 'Setup failed',
        description: error.message || 'An error occurred during setup.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      <div className="absolute top-0 left-0 w-full h-full gradient-glow" />
      
      <Card className="w-full max-w-2xl border-border/50 bg-card/80 backdrop-blur relative z-10">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={cn(
                  'w-3 h-3 rounded-full transition-all',
                  s === step ? 'bg-primary w-8' : s < step ? 'bg-primary' : 'bg-muted'
                )}
              />
            ))}
          </div>
          <CardTitle className="text-2xl font-display">
            {step === 1 ? 'Set up your business' : 'Add your first location'}
          </CardTitle>
          <CardDescription>
            {step === 1 
              ? 'Tell us about your business to get started' 
              : 'Where is your business located?'}
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
                  onClick={handleComplete}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      Complete Setup
                      <Check className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
