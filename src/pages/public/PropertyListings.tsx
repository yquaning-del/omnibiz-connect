import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PublicHeader } from '@/components/public/PublicHeader';
import { UnitListingCard } from '@/components/public/UnitListingCard';
import { RentalApplication } from '@/components/public/RentalApplication';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
import { toast } from 'sonner';
  Building2, 
  Search, 
  AlertCircle, 
  Shield, 
  CheckCircle, 
  Users, 
  Home, 
  Key,
  MapPin,
  Phone,
  Mail,
  Star,
  Clock,
  Wrench,
} from 'lucide-react';

interface PropertyInfo {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_vertical: string;
  settings: unknown;
}

interface Unit {
  id: string;
  unit_number: string;
  unit_type: string;
  bedrooms: number | null;
  bathrooms: number | null;
  square_feet?: number | null;
  monthly_rent: number;
  security_deposit: number | null;
  amenities: string[] | null;
  status: string;
  address: string | null;
  image_url?: string | null;
}

interface Location {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
}

// Get currency symbol from settings
const getCurrencySymbol = (settings: unknown): string => {
  if (settings && typeof settings === 'object' && 'currencySymbol' in settings) {
    return (settings as Record<string, unknown>).currencySymbol as string || '$';
  }
  return '$';
};

const PROPERTY_FEATURES = [
  { icon: Shield, title: 'Secure Living', description: 'Safe communities with modern security systems' },
  { icon: Wrench, title: '24/7 Maintenance', description: 'Quick response to all repair requests' },
  { icon: Users, title: 'Great Community', description: 'Friendly neighbors and community events' },
];

export default function PropertyListings() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<PropertyInfo | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [bedroomFilter, setBedroomFilter] = useState<string>('all');
  const [priceSort, setPriceSort] = useState<string>('asc');
  
  // Application state
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [applicationDialogOpen, setApplicationDialogOpen] = useState(false);

  const currencySymbol = getCurrencySymbol(property?.settings);

  useEffect(() => {
    loadProperty();
  }, [orgSlug]);

  useEffect(() => {
    filterUnits();
  }, [units, searchQuery, bedroomFilter, priceSort]);

  const loadProperty = async () => {
    if (!orgSlug) return;
    
    setLoading(true);
    try {
      // Load organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, slug, logo_url, primary_vertical, settings')
        .eq('slug', orgSlug)
        .single();

      if (orgError) throw orgError;
      
      // Check if it's a property management company
      if (orgData.primary_vertical !== 'property') {
        toast.error("Not a Property", { description: "This business does not offer rental listings." });
        navigate('/');
        return;
      }

      setProperty(orgData);

      // Load locations
      const { data: locData } = await supabase
        .from('locations')
        .select('id, name, address, phone, email')
        .eq('organization_id', orgData.id)
        .eq('is_active', true);

      setLocations(locData || []);

      // Load available units
      const { data: unitsData, error: unitsError } = await supabase
        .from('property_units')
        .select('*')
        .eq('organization_id', orgData.id)
        .in('status', ['available', 'vacant'])
        .order('monthly_rent', { ascending: true });

      if (unitsError) throw unitsError;
      setUnits(unitsData || []);
    } catch (error) {
      console.error('Error loading property:', error);
      toast.error("Property not found", { description: "The property you are looking for does not exist." });
    } finally {
      setLoading(false);
    }
  };

  const filterUnits = () => {
    let result = [...units];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (unit) =>
          unit.unit_number.toLowerCase().includes(query) ||
          unit.unit_type?.toLowerCase().includes(query) ||
          unit.address?.toLowerCase().includes(query)
      );
    }

    // Bedroom filter
    if (bedroomFilter !== 'all') {
      const bedrooms = parseInt(bedroomFilter);
      result = result.filter((unit) => unit.bedrooms === bedrooms);
    }

    // Price sort
    result.sort((a, b) => {
      if (priceSort === 'asc') {
        return a.monthly_rent - b.monthly_rent;
      } else {
        return b.monthly_rent - a.monthly_rent;
      }
    });

    setFilteredUnits(result);
  };

  const handleApply = (unitId: string) => {
    const unit = units.find((u) => u.id === unitId);
    if (unit) {
      setSelectedUnit(unit);
      setApplicationDialogOpen(true);
    }
  };

  const handleSubmitApplication = async (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    currentAddress: string;
    employerName?: string;
    monthlyIncome?: string;
    additionalNotes?: string;
    moveInDate: Date;
  }) => {
    if (!selectedUnit || !property) {
      throw new Error('Missing application information');
    }

    try {
      // Create tenant application
      const { error } = await supabase
        .from('tenant_applications')
        .insert({
          organization_id: property.id,
          unit_id: selectedUnit.id,
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email,
          phone: data.phone,
          current_address: data.currentAddress,
          employer_name: data.employerName || null,
          monthly_income: data.monthlyIncome ? parseFloat(data.monthlyIncome.replace(/[^0-9.]/g, '')) : null,
          move_in_date: data.moveInDate.toISOString().split('T')[0],
          notes: data.additionalNotes || null,
          status: 'pending',
        });

      if (error) throw error;

      toast.success("Application Submitted!", { description: "We will review your application and get back to you soon." });
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error("Application Failed", { description: "Unable to submit your application. Please try again." });
      throw error;
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
        <Skeleton className="h-80" />
        <div className="container mx-auto px-4 py-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <AlertCircle className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold text-foreground">Property Not Found</h1>
        <p className="text-muted-foreground">The property you are looking for does not exist.</p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader orgName={property.name} logoUrl={property.logo_url} />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-property/10 via-background to-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-property/5 via-transparent to-transparent" />
        
        <div className="container relative mx-auto px-4 py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4 bg-property/10 text-property border-0">
              <Home className="mr-1 h-3 w-3" />
              Quality Rentals
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
              Find Your Perfect Home
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              Discover quality rental properties at {property.name}. Well-maintained units in great locations.
            </p>
            
            {/* Trust indicators */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="h-5 w-5 text-property" />
                <span className="text-sm">Verified Properties</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Key className="h-5 w-5 text-property" />
                <span className="text-sm">Easy Application</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-5 w-5 text-property" />
                <span className="text-sm">Quick Response</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-y border-border/50 bg-card/50 py-12">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-3">
            {PROPERTY_FEATURES.map((feature, index) => {
              const FeatureIcon = feature.icon;
              return (
                <div key={index} className="flex items-start gap-4 text-center md:text-left">
                  <div className="mx-auto md:mx-0 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-property/10">
                    <FeatureIcon className="h-6 w-6 text-property" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{feature.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="border-b border-border/50 py-6 sticky top-16 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by unit number, type, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={bedroomFilter} onValueChange={setBedroomFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Bedrooms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Bedrooms</SelectItem>
                <SelectItem value="0">Studio</SelectItem>
                <SelectItem value="1">1 Bedroom</SelectItem>
                <SelectItem value="2">2 Bedrooms</SelectItem>
                <SelectItem value="3">3+ Bedrooms</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priceSort} onValueChange={setPriceSort}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Price: Low to High</SelectItem>
                <SelectItem value="desc">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>

            <Badge variant="secondary" className="py-2 px-4">
              {filteredUnits.length} unit{filteredUnits.length !== 1 ? 's' : ''} available
            </Badge>
          </div>
        </div>
      </section>

      {/* Results */}
      <main className="container mx-auto px-4 py-12">
        {filteredUnits.length === 0 ? (
          <Card className="border-dashed border-border/50 bg-muted/10">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/50 mb-6">
                <Building2 className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                No Units Available
              </h3>
              <p className="mt-3 text-muted-foreground max-w-md">
                {searchQuery || bedroomFilter !== 'all'
                  ? 'No units match your current filters. Try adjusting your search criteria.'
                  : 'All units are currently occupied. Check back soon for new listings.'}
              </p>
              {(searchQuery || bedroomFilter !== 'all') && (
                <Button 
                  variant="outline" 
                  className="mt-6"
                  onClick={() => {
                    setSearchQuery('');
                    setBedroomFilter('all');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground">Available Rentals</h2>
              <p className="mt-2 text-muted-foreground">
                Browse our selection of quality rental properties
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredUnits.map((unit) => (
                <UnitListingCard
                  key={unit.id}
                  unit={unit}
                  onApply={handleApply}
                  currencySymbol={currencySymbol}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {/* Contact Section */}
      {locations[0] && (
        <section className="border-t border-border/50 bg-card/30 py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center mb-10">
              <h2 className="text-2xl font-bold text-foreground">Have Questions?</h2>
              <p className="mt-2 text-muted-foreground">
                Our team is here to help you find your perfect home
              </p>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-8">
              {locations[0].phone && (
                <a 
                  href={`tel:${locations[0].phone}`}
                  className="flex items-center gap-3 text-foreground hover:text-property transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-property/10">
                    <Phone className="h-5 w-5 text-property" />
                  </div>
                  <span className="font-medium">{locations[0].phone}</span>
                </a>
              )}
              {locations[0].email && (
                <a 
                  href={`mailto:${locations[0].email}`}
                  className="flex items-center gap-3 text-foreground hover:text-property transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-property/10">
                    <Mail className="h-5 w-5 text-property" />
                  </div>
                  <span className="font-medium">{locations[0].email}</span>
                </a>
              )}
              {locations[0].address && (
                <div className="flex items-center gap-3 text-foreground">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-property/10">
                    <MapPin className="h-5 w-5 text-property" />
                  </div>
                  <span className="font-medium">{locations[0].address}</span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/50 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} {property.name}. All rights reserved.</p>
        </div>
      </footer>

      {/* Application Dialog */}
      {selectedUnit && (
        <RentalApplication
          open={applicationDialogOpen}
          onOpenChange={setApplicationDialogOpen}
          onSubmit={handleSubmitApplication}
          unitDetails={selectedUnit}
          currencySymbol={currencySymbol}
        />
      )}
    </div>
  );
}
