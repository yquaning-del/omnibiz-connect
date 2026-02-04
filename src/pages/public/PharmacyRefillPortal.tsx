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
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Pill, AlertCircle, RefreshCw, User, LogIn, UserPlus, Phone, Mail, CheckCircle } from 'lucide-react';

interface PharmacyInfo {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_vertical: string;
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

export default function PharmacyRefillPortal() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [pharmacy, setPharmacy] = useState<PharmacyInfo | null>(null);
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
      // Look up patient by email or phone
      const { data: patient, error: patientError } = await supabase
        .from('patient_profiles')
        .select('id')
        .eq('organization_id', pharmacy.id)
        .or(`email.eq.${loginEmail},phone.eq.${loginPhone}`)
        .single();

      if (patientError || !patient) {
        toast({
          title: 'Patient Not Found',
          description: 'No patient record found with that information. Please register or contact the pharmacy.',
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
      // Check if patient already exists
      const { data: existing } = await supabase
        .from('patient_profiles')
        .select('id')
        .eq('organization_id', pharmacy.id)
        .or(`email.eq.${registerEmail},phone.eq.${registerPhone}`)
        .single();

      if (existing) {
        toast({
          title: 'Already Registered',
          description: 'A patient with this email or phone already exists. Please use patient lookup.',
          variant: 'destructive',
        });
        return;
      }

      // Register new patient
      const { data: newPatient, error } = await supabase
        .from('patient_profiles')
        .insert({
          organization_id: pharmacy.id,
          full_name: registerName,
          email: registerEmail,
          phone: registerPhone,
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
      // Update prescription status to refill_requested
      const { error } = await supabase
        .from('prescriptions')
        .update({ status: 'refill_requested' })
        .eq('id', prescriptionId);

      if (error) throw error;

      // Update local state
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
      <section className="border-b border-border/50 bg-gradient-to-b from-pharmacy/5 to-transparent py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">
            Prescription Refills
          </h1>
          <p className="mt-3 text-muted-foreground">
            Request refills online at {pharmacy.name}
          </p>
        </div>
      </section>

      <main className="container mx-auto px-4 py-8">
        {!isAuthenticated ? (
          <div className="max-w-md mx-auto">
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-pharmacy" />
                  Patient Access
                </CardTitle>
                <CardDescription>
                  Look up your prescriptions or register as a new patient
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={loginTab} onValueChange={(v) => setLoginTab(v as 'lookup' | 'register')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="lookup" className="flex items-center gap-2">
                      <LogIn className="h-4 w-4" />
                      Patient Lookup
                    </TabsTrigger>
                    <TabsTrigger value="register" className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Register
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="lookup" className="mt-6">
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

                      <div className="text-center text-sm text-muted-foreground">or</div>

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
                        className="w-full" 
                        disabled={(!loginEmail && !loginPhone) || prescriptionsLoading}
                      >
                        {prescriptionsLoading ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Looking up...
                          </>
                        ) : (
                          'Find My Prescriptions'
                        )}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="register" className="mt-6">
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
                        <Input
                          id="regEmail"
                          type="email"
                          placeholder="your@email.com"
                          value={registerEmail}
                          onChange={(e) => setRegisterEmail(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="regPhone">Phone Number *</Label>
                        <Input
                          id="regPhone"
                          type="tel"
                          placeholder="+1 234 567 8900"
                          value={registerPhone}
                          onChange={(e) => setRegisterPhone(e.target.value)}
                          required
                        />
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

                      <Button type="submit" className="w-full">
                        Register as Patient
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Your Prescriptions</h2>
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
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Pill className="h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-medium text-foreground">No Prescriptions Found</h3>
                  <p className="mt-2 text-muted-foreground">
                    Your prescriptions will appear here once added by the pharmacy.
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
    </div>
  );
}
