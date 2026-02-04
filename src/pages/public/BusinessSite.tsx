import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PublicHeader } from '@/components/public/PublicHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { 
  UtensilsCrossed, 
  BedDouble, 
  Store, 
  Pill, 
  Building2, 
  ArrowRight,
  MapPin,
  Phone,
  Mail,
  Clock,
  AlertCircle
} from 'lucide-react';
import { BusinessVertical } from '@/types';

interface OrganizationInfo {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_vertical: BusinessVertical;
  settings: unknown;
}

interface Location {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
}

interface WebsiteSettings {
  enabled?: boolean;
  heroTitle?: string;
  heroSubtitle?: string;
  coverImage?: string;
  contactEmail?: string;
  contactPhone?: string;
  businessHours?: Record<string, { open: string; close: string }>;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
}

const VERTICAL_CONFIG: Record<BusinessVertical, { 
  icon: React.ComponentType<{ className?: string }>; 
  color: string;
  cta: string;
  ctaPath: string;
  description: string;
}> = {
  restaurant: {
    icon: UtensilsCrossed,
    color: 'text-restaurant',
    cta: 'View Menu & Order',
    ctaPath: '/store',
    description: 'Browse our menu and order online for pickup or delivery.',
  },
  hotel: {
    icon: BedDouble,
    color: 'text-hotel',
    cta: 'Book a Room',
    ctaPath: '/book',
    description: 'Find and reserve the perfect room for your stay.',
  },
  retail: {
    icon: Store,
    color: 'text-retail',
    cta: 'Shop Now',
    ctaPath: '/store',
    description: 'Browse our products and shop online with delivery.',
  },
  pharmacy: {
    icon: Pill,
    color: 'text-pharmacy',
    cta: 'Request Refill',
    ctaPath: '/pharmacy',
    description: 'Manage your prescriptions and request refills online.',
  },
  property: {
    icon: Building2,
    color: 'text-property',
    cta: 'View Available Rentals',
    ctaPath: '/rentals',
    description: 'Browse available units and apply for your new home.',
  },
};

export default function BusinessSite() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [organization, setOrganization] = useState<OrganizationInfo | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  const websiteSettings = organization?.settings 
    ? ((organization.settings as Record<string, unknown>).website as WebsiteSettings | undefined)
    : undefined;

  useEffect(() => {
    loadOrganization();
  }, [orgSlug]);

  const loadOrganization = async () => {
    if (!orgSlug) return;
    
    setLoading(true);
    try {
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, slug, logo_url, primary_vertical, settings')
        .eq('slug', orgSlug)
        .single();

      if (orgError) throw orgError;
      setOrganization(orgData);

      // Load locations
      const { data: locData } = await supabase
        .from('locations')
        .select('id, name, address, city, phone, email')
        .eq('organization_id', orgData.id)
        .eq('is_active', true);

      setLocations(locData || []);
    } catch (error) {
      console.error('Error loading organization:', error);
      toast({
        title: 'Business not found',
        description: 'The business you are looking for does not exist.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getCtaPath = () => {
    if (!organization) return '/';
    const config = VERTICAL_CONFIG[organization.primary_vertical];
    
    switch (organization.primary_vertical) {
      case 'restaurant':
        // Restaurant uses /store for online ordering or /menu for QR menu
        return `/store/${organization.slug}`;
      case 'hotel':
        return `/book/${organization.slug}`;
      case 'retail':
        return `/store/${organization.slug}`;
      case 'pharmacy':
        return `/pharmacy/${organization.slug}/refills`;
      case 'property':
        return `/rentals/${organization.slug}`;
      default:
        return `/store/${organization.slug}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border/50">
          <div className="container mx-auto flex h-16 items-center px-4">
            <Skeleton className="h-8 w-48" />
          </div>
        </div>
        <div className="container mx-auto px-4 py-16">
          <Skeleton className="h-64 mb-8" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <AlertCircle className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold text-foreground">Business Not Found</h1>
        <p className="text-muted-foreground">The business you are looking for does not exist.</p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  const verticalConfig = VERTICAL_CONFIG[organization.primary_vertical];
  const VerticalIcon = verticalConfig.icon;

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader orgName={organization.name} logoUrl={organization.logo_url} />

      {/* Hero Section */}
      <section className="relative border-b border-border/50 bg-gradient-to-b from-primary/5 to-transparent py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <div className={`inline-flex p-4 rounded-full bg-primary/10 mb-6`}>
            <VerticalIcon className={`h-12 w-12 ${verticalConfig.color}`} />
          </div>
          <h1 className="text-4xl font-bold text-foreground md:text-5xl lg:text-6xl">
            {websiteSettings?.heroTitle || `Welcome to ${organization.name}`}
          </h1>
          <p className="mt-6 text-lg text-muted-foreground md:text-xl max-w-2xl mx-auto">
            {websiteSettings?.heroSubtitle || verticalConfig.description}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" className="text-lg px-8" onClick={() => navigate(getCtaPath())}>
              {verticalConfig.cta}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features/Services Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-foreground text-center mb-12">
            {organization.primary_vertical === 'restaurant' && 'Order Fresh Food Online'}
            {organization.primary_vertical === 'hotel' && 'Book Your Perfect Stay'}
            {organization.primary_vertical === 'retail' && 'Shop Our Products'}
            {organization.primary_vertical === 'pharmacy' && 'Your Health, Our Priority'}
            {organization.primary_vertical === 'property' && 'Find Your New Home'}
          </h2>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Quick Action Cards */}
            <Card className="border-border/50 bg-card/50 hover:border-primary/30 transition-all cursor-pointer" onClick={() => navigate(getCtaPath())}>
              <CardHeader>
                <VerticalIcon className={`h-8 w-8 ${verticalConfig.color}`} />
                <CardTitle className="mt-4">{verticalConfig.cta}</CardTitle>
                <CardDescription>{verticalConfig.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Contact Card */}
            {(websiteSettings?.contactEmail || websiteSettings?.contactPhone || locations.length > 0) && (
              <Card className="border-border/50 bg-card/50">
                <CardHeader>
                  <Phone className="h-8 w-8 text-primary" />
                  <CardTitle className="mt-4">Contact Us</CardTitle>
                  <CardDescription>Get in touch with our team</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {websiteSettings?.contactPhone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${websiteSettings.contactPhone}`} className="text-foreground hover:text-primary">
                        {websiteSettings.contactPhone}
                      </a>
                    </div>
                  )}
                  {websiteSettings?.contactEmail && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${websiteSettings.contactEmail}`} className="text-foreground hover:text-primary">
                        {websiteSettings.contactEmail}
                      </a>
                    </div>
                  )}
                  {locations[0]?.address && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">{locations[0].address}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Hours Card */}
            {websiteSettings?.businessHours && (
              <Card className="border-border/50 bg-card/50">
                <CardHeader>
                  <Clock className="h-8 w-8 text-primary" />
                  <CardTitle className="mt-4">Business Hours</CardTitle>
                  <CardDescription>When we're open</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(websiteSettings.businessHours).map(([day, hours]) => (
                    <div key={day} className="flex justify-between text-sm">
                      <span className="text-muted-foreground capitalize">{day}</span>
                      <span className="text-foreground">{hours.open} - {hours.close}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* Locations Section */}
      {locations.length > 1 && (
        <section className="border-t border-border/50 py-16 bg-muted/10">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-foreground text-center mb-8">Our Locations</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {locations.map((location) => (
                <Card key={location.id} className="border-border/50 bg-card/50">
                  <CardHeader>
                    <CardTitle className="text-lg">{location.name}</CardTitle>
                    {location.city && (
                      <CardDescription className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {location.city}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {location.address && <p className="text-foreground">{location.address}</p>}
                    {location.phone && (
                      <a href={`tel:${location.phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary">
                        <Phone className="h-3 w-3" />
                        {location.phone}
                      </a>
                    )}
                    {location.email && (
                      <a href={`mailto:${location.email}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary">
                        <Mail className="h-3 w-3" />
                        {location.email}
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 bg-card/30">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} {organization.name}. All rights reserved.</p>
          <p className="mt-2">Powered by HospitalityOS</p>
        </div>
      </footer>
    </div>
  );
}
