import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PublicHeader } from '@/components/public/PublicHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  AlertCircle,
  Star,
  Shield,
  CheckCircle,
  Users,
  Award,
  Heart,
  Sparkles,
  Globe,
  Zap,
  Facebook,
  Instagram,
  Twitter,
} from 'lucide-react';
import { BusinessVertical } from '@/types';
import { toast } from 'sonner';

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
  bgColor: string;
  cta: string;
  ctaPath: string;
  description: string;
  features: { icon: React.ComponentType<{ className?: string }>; title: string; description: string }[];
  stats: { value: string; label: string }[];
}> = {
  restaurant: {
    icon: UtensilsCrossed,
    color: 'text-restaurant',
    bgColor: 'bg-restaurant/10',
    cta: 'View Menu & Order',
    ctaPath: '/store',
    description: 'Experience culinary excellence with our carefully crafted menu, fresh ingredients, and exceptional service.',
    features: [
      { icon: UtensilsCrossed, title: 'Fresh Ingredients', description: 'Locally sourced, quality ingredients for every dish' },
      { icon: Zap, title: 'Fast Delivery', description: 'Quick and reliable delivery to your doorstep' },
      { icon: Heart, title: 'Made with Love', description: 'Every meal prepared with passion and care' },
    ],
    stats: [
      { value: '1000+', label: 'Happy Customers' },
      { value: '50+', label: 'Menu Items' },
      { value: '4.8', label: 'Average Rating' },
    ],
  },
  hotel: {
    icon: BedDouble,
    color: 'text-hotel',
    bgColor: 'bg-hotel/10',
    cta: 'Book a Room',
    ctaPath: '/book',
    description: 'Discover comfort and luxury in every stay. Your perfect escape awaits with world-class amenities.',
    features: [
      { icon: BedDouble, title: 'Luxury Rooms', description: 'Elegantly designed rooms for ultimate comfort' },
      { icon: Sparkles, title: 'Premium Amenities', description: 'Pool, spa, fitness center, and more' },
      { icon: Users, title: '24/7 Service', description: 'Round-the-clock concierge and room service' },
    ],
    stats: [
      { value: '100+', label: 'Rooms Available' },
      { value: '4.9', label: 'Guest Rating' },
      { value: '10K+', label: 'Happy Guests' },
    ],
  },
  retail: {
    icon: Store,
    color: 'text-retail',
    bgColor: 'bg-retail/10',
    cta: 'Shop Now',
    ctaPath: '/store',
    description: 'Discover quality products at great prices. Shop online with fast delivery and excellent customer service.',
    features: [
      { icon: Shield, title: 'Quality Guaranteed', description: 'Only the best products make our catalog' },
      { icon: Zap, title: 'Fast Shipping', description: 'Quick delivery right to your door' },
      { icon: Award, title: 'Best Prices', description: 'Competitive pricing on all products' },
    ],
    stats: [
      { value: '500+', label: 'Products' },
      { value: '5000+', label: 'Orders Delivered' },
      { value: '98%', label: 'Satisfaction Rate' },
    ],
  },
  pharmacy: {
    icon: Pill,
    color: 'text-pharmacy',
    bgColor: 'bg-pharmacy/10',
    cta: 'Request Refill',
    ctaPath: '/pharmacy',
    description: 'Your trusted healthcare partner. Professional pharmacy services with personalized care and expert advice.',
    features: [
      { icon: Shield, title: 'Licensed Pharmacists', description: 'Expert guidance for all your medication needs' },
      { icon: CheckCircle, title: 'Easy Refills', description: 'Quick online prescription refill requests' },
      { icon: Heart, title: 'Patient Care', description: 'Personalized attention to your health needs' },
    ],
    stats: [
      { value: '10K+', label: 'Prescriptions Filled' },
      { value: '99%', label: 'Accuracy Rate' },
      { value: '15+', label: 'Years Experience' },
    ],
  },
  property: {
    icon: Building2,
    color: 'text-property',
    bgColor: 'bg-property/10',
    cta: 'View Available Rentals',
    ctaPath: '/rentals',
    description: 'Find your perfect home with our quality rental properties. Professional management and responsive service.',
    features: [
      { icon: Building2, title: 'Quality Properties', description: 'Well-maintained units in great locations' },
      { icon: Shield, title: 'Secure Living', description: 'Safe communities with modern security' },
      { icon: Users, title: 'Responsive Management', description: 'Quick response to maintenance requests' },
    ],
    stats: [
      { value: '200+', label: 'Units Available' },
      { value: '95%', label: 'Occupancy Rate' },
      { value: '4.7', label: 'Tenant Rating' },
    ],
  },
};

export default function BusinessSite() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const navigate = useNavigate();
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
    
    switch (organization.primary_vertical) {
      case 'restaurant':
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
          <Skeleton className="h-96 mb-8" />
          <div className="grid gap-6 md:grid-cols-3">
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

      {/* Hero Section - Enhanced */}
      <section className="relative overflow-hidden border-b border-border/50">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
        
        <div className="container relative mx-auto px-4 py-20 md:py-32 lg:py-40">
          <div className="mx-auto max-w-4xl text-center">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2">
              <VerticalIcon className={`h-4 w-4 ${verticalConfig.color}`} />
              <span className="text-sm font-medium text-foreground">
                {organization.primary_vertical.charAt(0).toUpperCase() + organization.primary_vertical.slice(1)} Business
              </span>
            </div>

            {/* Main heading */}
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
              {websiteSettings?.heroTitle || `Welcome to ${organization.name}`}
            </h1>
            
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
              {websiteSettings?.heroSubtitle || verticalConfig.description}
            </p>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button 
                size="lg" 
                className="h-12 px-8 text-lg shadow-lg hover:shadow-xl transition-all"
                onClick={() => navigate(getCtaPath())}
              >
                {verticalConfig.cta}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="h-12 px-8 text-lg"
                onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Contact Us
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <span className="text-sm">Verified Business</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                <span className="text-sm">Top Rated</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <span className="text-sm">Trusted Service</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-b border-border/50 bg-muted/30 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-3 gap-8 text-center">
            {verticalConfig.stats.map((stat, index) => (
              <div key={index} className="space-y-2">
                <p className={`text-3xl font-bold md:text-4xl ${verticalConfig.color}`}>
                  {stat.value}
                </p>
                <p className="text-sm text-muted-foreground md:text-base">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <Badge className={`${verticalConfig.bgColor} ${verticalConfig.color} border-0 mb-4`}>
              Why Choose Us
            </Badge>
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              {organization.primary_vertical === 'restaurant' && 'Exceptional Dining Experience'}
              {organization.primary_vertical === 'hotel' && 'Your Comfort, Our Priority'}
              {organization.primary_vertical === 'retail' && 'Shop with Confidence'}
              {organization.primary_vertical === 'pharmacy' && 'Your Health Partner'}
              {organization.primary_vertical === 'property' && 'Quality Living Spaces'}
            </h2>
            <p className="mt-4 text-muted-foreground">
              Discover what makes us the preferred choice for customers like you.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {verticalConfig.features.map((feature, index) => {
              const FeatureIcon = feature.icon;
              return (
                <Card 
                  key={index} 
                  className="group border-border/50 bg-card/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300"
                >
                  <CardHeader>
                    <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg ${verticalConfig.bgColor} group-hover:scale-110 transition-transform`}>
                      <FeatureIcon className={`h-6 w-6 ${verticalConfig.color}`} />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                    <CardDescription className="text-base">{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <div className={`inline-flex h-16 w-16 items-center justify-center rounded-full ${verticalConfig.bgColor} mb-6`}>
              <VerticalIcon className={`h-8 w-8 ${verticalConfig.color}`} />
            </div>
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              Ready to Get Started?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {verticalConfig.description}
            </p>
            <Button 
              size="lg" 
              className="mt-8 h-12 px-10 text-lg shadow-lg"
              onClick={() => navigate(getCtaPath())}
            >
              {verticalConfig.cta}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground">Get in Touch</h2>
            <p className="mt-4 text-muted-foreground">
              Have questions? We'd love to hear from you.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
            {/* Phone */}
            {(websiteSettings?.contactPhone || locations[0]?.phone) && (
              <Card className="border-border/50 bg-card/50 hover:border-primary/30 transition-all">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full ${verticalConfig.bgColor}`}>
                    <Phone className={`h-5 w-5 ${verticalConfig.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <a 
                      href={`tel:${websiteSettings?.contactPhone || locations[0]?.phone}`}
                      className="font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {websiteSettings?.contactPhone || locations[0]?.phone}
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Email */}
            {(websiteSettings?.contactEmail || locations[0]?.email) && (
              <Card className="border-border/50 bg-card/50 hover:border-primary/30 transition-all">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full ${verticalConfig.bgColor}`}>
                    <Mail className={`h-5 w-5 ${verticalConfig.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <a 
                      href={`mailto:${websiteSettings?.contactEmail || locations[0]?.email}`}
                      className="font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {websiteSettings?.contactEmail || locations[0]?.email}
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Address */}
            {locations[0]?.address && (
              <Card className="border-border/50 bg-card/50 hover:border-primary/30 transition-all">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full ${verticalConfig.bgColor}`}>
                    <MapPin className={`h-5 w-5 ${verticalConfig.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium text-foreground">{locations[0].address}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Business Hours */}
          {websiteSettings?.businessHours && Object.keys(websiteSettings.businessHours).length > 0 && (
            <Card className="border-border/50 bg-card/50 mt-8 max-w-md mx-auto">
              <CardHeader className="text-center">
                <Clock className={`h-6 w-6 mx-auto ${verticalConfig.color}`} />
                <CardTitle className="mt-2">Business Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(websiteSettings.businessHours).map(([day, hours]) => (
                    <div key={day} className="flex justify-between text-sm">
                      <span className="text-muted-foreground capitalize">{day}</span>
                      <span className="font-medium text-foreground">{hours.open} - {hours.close}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Locations Section */}
      {locations.length > 1 && (
        <section className="border-t border-border/50 py-20 bg-muted/10">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground">Our Locations</h2>
              <p className="mt-4 text-muted-foreground">
                Find us at a location convenient for you.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {locations.map((location) => (
                <Card key={location.id} className="border-border/50 bg-card/50 hover:shadow-lg transition-all">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className={`h-4 w-4 ${verticalConfig.color}`} />
                      {location.name}
                    </CardTitle>
                    {location.city && (
                      <CardDescription>{location.city}</CardDescription>
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
      <footer className="border-t border-border/50 bg-card/50">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col items-center gap-6">
            {/* Logo and Name */}
            <div className="flex items-center gap-3">
              {organization.logo_url ? (
                <img src={organization.logo_url} alt={organization.name} className="h-10 w-10 rounded-lg object-cover" />
              ) : (
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${verticalConfig.bgColor}`}>
                  <VerticalIcon className={`h-5 w-5 ${verticalConfig.color}`} />
                </div>
              )}
              <span className="text-xl font-bold text-foreground">{organization.name}</span>
            </div>

            {/* Social Links */}
            {websiteSettings?.socialLinks && (
              <div className="flex items-center gap-4">
                {websiteSettings.socialLinks.facebook && (
                  <a 
                    href={websiteSettings.socialLinks.facebook} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-muted hover:bg-primary/10 transition-colors"
                  >
                    <Facebook className="h-5 w-5 text-muted-foreground hover:text-primary" />
                  </a>
                )}
                {websiteSettings.socialLinks.instagram && (
                  <a 
                    href={websiteSettings.socialLinks.instagram} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-muted hover:bg-primary/10 transition-colors"
                  >
                    <Instagram className="h-5 w-5 text-muted-foreground hover:text-primary" />
                  </a>
                )}
                {websiteSettings.socialLinks.twitter && (
                  <a 
                    href={websiteSettings.socialLinks.twitter} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-muted hover:bg-primary/10 transition-colors"
                  >
                    <Twitter className="h-5 w-5 text-muted-foreground hover:text-primary" />
                  </a>
                )}
              </div>
            )}

            {/* Copyright */}
            <div className="text-center text-sm text-muted-foreground">
              <p>&copy; {new Date().getFullYear()} {organization.name}. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
