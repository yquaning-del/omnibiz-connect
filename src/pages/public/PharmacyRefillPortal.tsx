import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PrescriptionCard } from '@/components/public/PrescriptionCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Pill, 
  AlertCircle, 
  RefreshCw, 
  User, 
  LogIn, 
  UserPlus, 
  Phone, 
  Mail, 
  CheckCircle,
  Shield,
  Clock,
  Heart,
  Stethoscope,
  FileText,
  Truck,
  Star,
  MapPin,
} from 'lucide-react';

interface PharmacyInfo {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_vertical: string;
}

interface Location {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
}

interface Prescription {
  id: string;
  prescription_number: string;
  prescriber_name: string;
  status: string;
  date_written: string;
  date_filled: string | null;
  refills_remaining: number | null;
  refills_authorized: number | null;
  is_controlled_substance: boolean | null;
  notes: string | null;
}

const PHARMACY_SERVICES = [
  { icon: Pill, title: 'Prescription Refills', description: 'Easy online refill requests' },
  { icon: Stethoscope, title: 'Medication Counseling', description: 'Expert pharmacist advice' },
  { icon: Truck, title: 'Home Delivery', description: 'Convenient delivery options' },
  { icon: Heart, title: 'Health Screenings', description: 'Regular health check services' },
];

export default function PharmacyRefillPortal() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [pharmacy, setPharmacy] = useState<PharmacyInfo | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [prescriptionsLoading, setPrescriptionsLoading] = useState(false);
  const [refillLoading, setRefillLoading] = useState<string | null>(null);
  
  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginTab, setLoginTab] = useState<'lookup' | 'register'>('lookup');
  
  // Register form
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerDob, setRegisterDob] = useState('');

  useEffect(() => {
    loadPharmacy();
  }, [orgSlug]);

  const loadPharmacy = async () => {
    if (!orgSlug) return;
    
    setLoading(true);
    try {
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, slug, logo_url, primary_vertical')
        .eq('slug', orgSlug)
        .single();

      if (orgError) throw orgError;
      
      if (orgData.primary_vertical !== 'pharmacy') {
        toast({
          title: 'Not a Pharmacy',
          description: 'This business does not offer prescription refills.',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }

      setPharmacy(orgData);

      // Load locations
      const { data: locData } = await supabase
        .from('locations')
        .select('id, name, address, phone, email')
        .eq('organization_id', orgData.id)
        .eq('is_active', true);

      setLocations(locData || []);
    } catch (error) {
      console.error('Error loading pharmacy:', error);
      toast({
        title: 'Pharmacy not found',
        description: 'The pharmacy you are looking for does not exist.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePatientLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pharmacy) return;

    setPrescriptionsLoading(true);
    try {
      // Build OR filter for customer lookup by email/phone
      const filters: string[] = [];
      if (loginEmail) filters.push(`email.eq.${loginEmail}`);
      if (loginPhone) filters.push(`phone.eq.${loginPhone}`);

      // First find the customer by email or phone
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('organization_id', pharmacy.id)
        .or(filters.join(','))
        .single();

      if (customerError || !customer) {
        toast({
          title: 'Patient Not Found',
          description: 'No patient record found with that information. Please register or contact the pharmacy.',
          variant: 'destructive',
        });
        return;
      }

      // Then find the patient profile linked to this customer
      const { data: patient, error: patientError } = await supabase
        .from('patient_profiles')
        .select('id')
        .eq('organization_id', pharmacy.id)
        .eq('customer_id', customer.id)
        .single();

      if (patientError || !patient) {
        toast({
          title: 'Patient Not Found',
          description: 'No patient profile found. Please register or contact the pharmacy.',
          variant: 'destructive',
        });
        return;
      }

      setPatientId(patient.id);
      setIsAuthenticated(true);
      await loadPrescriptions(patient.id);
    } catch (error) {
      console.error('Error looking up patient:', error);
      toast({
        title: 'Lookup Failed',
        description: 'Unable to find your patient record.',
        variant: 'destructive',
      });
    } finally {
      setPrescriptionsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pharmacy) return;

    try {
      // Check if a customer with this email or phone already exists
      const filters: string[] = [];
      if (registerEmail) filters.push(`email.eq.${registerEmail}`);
      if (registerPhone) filters.push(`phone.eq.${registerPhone}`);

      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('organization_id', pharmacy.id)
        .or(filters.join(','))
        .single();

      if (existingCustomer) {
        // Check if a patient profile already exists for this customer
        const { data: existingProfile } = await supabase
          .from('patient_profiles')
          .select('id')
          .eq('customer_id', existingCustomer.id)
          .single();

        if (existingProfile) {
          toast({
            title: 'Already Registered',
            description: 'A patient with this email or phone already exists. Please use patient lookup.',
            variant: 'destructive',
          });
          return;
        }
      }

      // Create the customer record first (or reuse existing)
      let customerId = existingCustomer?.id;
      if (!customerId) {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            organization_id: pharmacy.id,
            full_name: registerName,
            email: registerEmail || null,
            phone: registerPhone || null,
          })
          .select()
          .single();

        if (customerError) throw customerError;
        customerId = newCustomer.id;
      }

      // Create the patient profile linked to the customer
      const { data: newPatient, error } = await supabase
        .from('patient_profiles')
        .insert({
          organization_id: pharmacy.id,
          customer_id: customerId,
          date_of_birth: registerDob || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Registration Successful!',
        description: 'You can now view your prescriptions once they are added by the pharmacy.',
      });

      setPatientId(newPatient.id);
      setIsAuthenticated(true);
      setPrescriptions([]);
    } catch (error) {
      console.error('Error registering patient:', error);
      toast({
        title: 'Registration Failed',
        description: 'Unable to complete registration. Please contact the pharmacy.',
        variant: 'destructive',
      });
    }
  };

  const loadPrescriptions = async (pid: string) => {
    if (!pharmacy) return;

    setPrescriptionsLoading(true);
    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('patient_id', pid)
        .order('date_written', { ascending: false });

      if (error) throw error;
      setPrescriptions(data || []);
    } catch (error) {
      console.error('Error loading prescriptions:', error);
    } finally {
      setPrescriptionsLoading(false);
    }
  };

  const handleRequestRefill = async (prescriptionId: string) => {
    setRefillLoading(prescriptionId);
    try {
      const { error } = await supabase
        .from('prescriptions')
        .update({ status: 'refill_requested' })
        .eq('id', prescriptionId);

      if (error) throw error;

      setPrescriptions(prescriptions.map(p => 
        p.id === prescriptionId ? { ...p, status: 'refill_requested' } : p
      ));

      toast({
        title: 'Refill Requested!',
        description: 'Your refill request has been submitted. The pharmacy will contact you when ready.',
      });
    } catch (error) {
      console.error('Error requesting refill:', error);
      toast({
        title: 'Request Failed',
        description: 'Unable to submit refill request. Please try again or contact the pharmacy.',
        variant: 'destructive',
      });
    } finally {
      setRefillLoading(null);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPatientId(null);
    setPrescriptions([]);
    setLoginEmail('');
    setLoginPhone('');
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
        <div className="container mx-auto px-4 py-8 max-w-md">
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!pharmacy) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <AlertCircle className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold text-foreground">Pharmacy Not Found</h1>
        <p className="text-muted-foreground">The pharmacy you are looking for does not exist.</p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader 
        orgName={pharmacy.name} 
        logoUrl={pharmacy.logo_url}
        rightContent={
          isAuthenticated ? (
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Sign Out
            </Button>
          ) : null
        }
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-pharmacy/10 via-background to-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-pharmacy/5 via-transparent to-transparent" />
        
        <div className="container relative mx-auto px-4 py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4 bg-pharmacy/10 text-pharmacy border-0">
              <Heart className="mr-1 h-3 w-3 fill-current" />
              Your Health Partner
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
              Prescription Refills Made Easy
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              Request prescription refills online at {pharmacy.name}. Quick, secure, and convenient.
            </p>
            
            {/* Trust indicators */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="h-5 w-5 text-pharmacy" />
                <span className="text-sm">Licensed Pharmacy</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle className="h-5 w-5 text-pharmacy" />
                <span className="text-sm">Verified & Secure</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-5 w-5 text-pharmacy" />
                <span className="text-sm">Fast Processing</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      {!isAuthenticated && (
        <section className="border-y border-border/50 bg-card/50 py-12">
          <div className="container mx-auto px-4">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {PHARMACY_SERVICES.map((service, index) => {
                const ServiceIcon = service.icon;
                return (
                  <div key={index} className="flex items-start gap-4 p-4 rounded-lg bg-background/50">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-pharmacy/10">
                      <ServiceIcon className="h-5 w-5 text-pharmacy" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{service.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{service.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <main className="container mx-auto px-4 py-12">
        {!isAuthenticated ? (
          <div className="max-w-md mx-auto">
            <Card className="border-border/50 bg-card/50 shadow-lg">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-pharmacy/10">
                  <User className="h-8 w-8 text-pharmacy" />
                </div>
                <CardTitle className="text-xl">Patient Access</CardTitle>
                <CardDescription>
                  Look up your prescriptions or register as a new patient
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={loginTab} onValueChange={(v) => setLoginTab(v as 'lookup' | 'register')}>
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="lookup" className="flex items-center gap-2">
                      <LogIn className="h-4 w-4" />
                      Patient Lookup
                    </TabsTrigger>
                    <TabsTrigger value="register" className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Register
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="lookup" className="space-y-4">
                    <form onSubmit={handlePatientLookup} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="your@email.com"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-muted-foreground uppercase">or</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="+1 234 567 8900"
                            value={loginPhone}
                            onChange={(e) => setLoginPhone(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full h-11" 
                        disabled={(!loginEmail && !loginPhone) || prescriptionsLoading}
                      >
                        {prescriptionsLoading ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Looking up...
                          </>
                        ) : (
                          <>
                            <FileText className="mr-2 h-4 w-4" />
                            Find My Prescriptions
                          </>
                        )}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="register" className="space-y-4">
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name *</Label>
                        <Input
                          id="name"
                          placeholder="John Doe"
                          value={registerName}
                          onChange={(e) => setRegisterName(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="regEmail">Email Address *</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="regEmail"
                            type="email"
                            placeholder="your@email.com"
                            value={registerEmail}
                            onChange={(e) => setRegisterEmail(e.target.value)}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="regPhone">Phone Number *</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="regPhone"
                            type="tel"
                            placeholder="+1 234 567 8900"
                            value={registerPhone}
                            onChange={(e) => setRegisterPhone(e.target.value)}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="dob">Date of Birth</Label>
                        <Input
                          id="dob"
                          type="date"
                          value={registerDob}
                          onChange={(e) => setRegisterDob(e.target.value)}
                        />
                      </div>

                      <Button type="submit" className="w-full h-11">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Register as Patient
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Info box */}
            <Card className="mt-6 border-pharmacy/20 bg-pharmacy/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-pharmacy mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Secure & Private</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your health information is protected and only accessible to you and our pharmacy team.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Your Prescriptions</h2>
                <p className="text-muted-foreground">Manage and request refills for your medications</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => patientId && loadPrescriptions(patientId)}>
                <RefreshCw className={`h-4 w-4 mr-2 ${prescriptionsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {prescriptionsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-48 rounded-lg" />
                ))}
              </div>
            ) : prescriptions.length === 0 ? (
              <Card className="border-dashed border-border/50 bg-muted/10">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/50 mb-6">
                    <Pill className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">No Prescriptions Found</h3>
                  <p className="mt-3 text-muted-foreground max-w-md">
                    Your prescriptions will appear here once they are added by the pharmacy.
                    Contact the pharmacy if you believe this is an error.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {prescriptions.map((prescription) => (
                  <PrescriptionCard
                    key={prescription.id}
                    prescription={prescription}
                    onRequestRefill={handleRequestRefill}
                    loading={refillLoading === prescription.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Contact Section */}
      {locations[0] && !isAuthenticated && (
        <section className="border-t border-border/50 bg-card/30 py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center mb-10">
              <h2 className="text-2xl font-bold text-foreground">Visit Us</h2>
              <p className="mt-2 text-muted-foreground">
                Our friendly pharmacists are here to help
              </p>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-8">
              {locations[0].phone && (
                <a 
                  href={`tel:${locations[0].phone}`}
                  className="flex items-center gap-3 text-foreground hover:text-pharmacy transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pharmacy/10">
                    <Phone className="h-5 w-5 text-pharmacy" />
                  </div>
                  <span className="font-medium">{locations[0].phone}</span>
                </a>
              )}
              {locations[0].email && (
                <a 
                  href={`mailto:${locations[0].email}`}
                  className="flex items-center gap-3 text-foreground hover:text-pharmacy transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pharmacy/10">
                    <Mail className="h-5 w-5 text-pharmacy" />
                  </div>
                  <span className="font-medium">{locations[0].email}</span>
                </a>
              )}
              {locations[0].address && (
                <div className="flex items-center gap-3 text-foreground">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pharmacy/10">
                    <MapPin className="h-5 w-5 text-pharmacy" />
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
          <p>&copy; {new Date().getFullYear()} {pharmacy.name}. All rights reserved.</p>
          <p className="mt-2 text-xs">
            For medical emergencies, please call your local emergency services.
          </p>
        </div>
      </footer>
    </div>
  );
}
