import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PublicHeader } from '@/components/public/PublicHeader';
import { UnitListingCard } from '@/components/public/UnitListingCard';
import { RentalApplication } from '@/components/public/RentalApplication';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Building2, Search, SlidersHorizontal, AlertCircle } from 'lucide-react';

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
}

// Get currency symbol from settings
const getCurrencySymbol = (settings: unknown): string => {
  if (settings && typeof settings === 'object' && 'currencySymbol' in settings) {
    return (settings as Record<string, unknown>).currencySymbol as string || '$';
  }
  return '$';
};

export default function PropertyListings() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [property, setProperty] = useState<PropertyInfo | null>(null);
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
        toast({
          title: 'Not a Property',
          description: 'This business does not offer rental listings.',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }

      setProperty(orgData);

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
      toast({
        title: 'Property not found',
        description: 'The property you are looking for does not exist.',
        variant: 'destructive',
      });
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

      toast({
        title: 'Application Submitted!',
        description: 'We will review your application and get back to you soon.',
      });
    } catch (error) {
      console.error('Error submitting application:', error);
      toast({
        title: 'Application Failed',
        description: 'Unable to submit your application. Please try again.',
        variant: 'destructive',
      });
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
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-64 mb-8" />
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
      <section className="border-b border-border/50 bg-gradient-to-b from-property/5 to-transparent py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">
            Available Rentals
          </h1>
          <p className="mt-3 text-muted-foreground">
            Find your perfect home at {property.name}
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="border-b border-border/50 py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search units..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={bedroomFilter} onValueChange={setBedroomFilter}>
              <SelectTrigger className="w-[150px]">
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
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Price: Low to High</SelectItem>
                <SelectItem value="desc">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>

            <Badge variant="outline" className="py-2">
              {filteredUnits.length} unit{filteredUnits.length !== 1 ? 's' : ''} available
            </Badge>
          </div>
        </div>
      </section>

      {/* Results */}
      <main className="container mx-auto px-4 py-8">
        {filteredUnits.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 bg-muted/10 py-16 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium text-foreground">
              No Units Available
            </h3>
            <p className="mt-2 text-muted-foreground">
              {searchQuery || bedroomFilter !== 'all'
                ? 'Try adjusting your filters to see more results.'
                : 'All units are currently occupied. Check back later.'}
            </p>
          </div>
        ) : (
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
        )}
      </main>

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
