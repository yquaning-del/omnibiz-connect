import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  FileText, 
  ArrowLeft,
  Calendar,
  Home,
  DollarSign,
  PenTool,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SignaturePad } from '@/components/property/SignaturePad';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface TenantContextType {
  tenantData: any;
  refreshTenantData: () => Promise<void>;
}

export default function TenantLeaseDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tenantData } = useOutletContext<TenantContextType>();
  
  const [lease, setLease] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (id) {
      fetchLease();
    }
  }, [id]);

  const fetchLease = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('leases')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      setLease(data);
    } catch (error) {
      console.error('Error fetching lease:', error);
      toast.error('Failed to load lease details');
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!lease || !user || !signatureData || !agreed) return;

    setSigning(true);
    try {
      // Create signature record
      const { error: sigError } = await supabase
        .from('lease_signatures')
        .insert({
          lease_id: lease.id,
          organization_id: lease.organization_id,
          signer_type: 'tenant',
          signer_id: user.id,
          signature_data: {
            image: signatureData,
            signed_at: new Date().toISOString(),
          },
          ip_address: 'client',
        });

      if (sigError) throw sigError;

      // Update lease with tenant signature timestamp
      const { error: leaseError } = await supabase
        .from('leases')
        .update({ tenant_signed_at: new Date().toISOString() })
        .eq('id', lease.id);

      if (leaseError) throw leaseError;

      toast.success('Lease signed successfully!');
      fetchLease();
    } catch (error) {
      console.error('Error signing lease:', error);
      toast.error('Failed to sign lease. Please try again.');
    } finally {
      setSigning(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!lease) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Lease Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The lease you're looking for doesn't exist or you don't have access to it.
        </p>
        <Button onClick={() => navigate('/tenant/leases')}>
          Back to Leases
        </Button>
      </div>
    );
  }

  const isSigned = !!lease.tenant_signed_at;
  const clauses = lease.lease_document || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/tenant/leases')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            Lease {lease.lease_number || `#${lease.id.slice(0, 8)}`}
          </h1>
          <p className="text-muted-foreground">
            {lease.lease_type === 'fixed' ? 'Fixed Term Lease' : 'Month-to-Month Lease'}
          </p>
        </div>
        {isSigned ? (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 ml-auto">
            <CheckCircle className="h-3 w-3 mr-1" />
            Signed
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 ml-auto">
            Signature Required
          </Badge>
        )}
      </div>

      {/* Lease Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Lease Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-property/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-property" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p className="font-medium">{formatDate(lease.start_date)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-property/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-property" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">End Date</p>
                <p className="font-medium">{formatDate(lease.end_date)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-property/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-property" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Rent</p>
                <p className="font-medium">{formatCurrency(lease.monthly_rent)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-property/10 flex items-center justify-center">
                <Home className="h-5 w-5 text-property" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Security Deposit</p>
                <p className="font-medium">{formatCurrency(lease.security_deposit)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lease Terms */}
      {clauses && Object.keys(clauses).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Lease Terms & Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full">
              {clauses.rentTerms && (
                <AccordionItem value="rent">
                  <AccordionTrigger>Rent Terms</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {clauses.rentTerms}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              )}
              {clauses.securityDepositRules && (
                <AccordionItem value="deposit">
                  <AccordionTrigger>Security Deposit</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {clauses.securityDepositRules}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              )}
              {clauses.maintenanceResponsibilities && (
                <AccordionItem value="maintenance">
                  <AccordionTrigger>Maintenance Responsibilities</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {clauses.maintenanceResponsibilities}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              )}
              {clauses.petPolicy && (
                <AccordionItem value="pets">
                  <AccordionTrigger>Pet Policy</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {clauses.petPolicy}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              )}
              {clauses.terminationConditions && (
                <AccordionItem value="termination">
                  <AccordionTrigger>Termination Conditions</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {clauses.terminationConditions}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Signature Section */}
      {!isSigned && (
        <Card className="border-property">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5 text-property" />
              Sign Your Lease
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg border bg-amber-50 border-amber-200 p-4">
              <p className="text-sm text-amber-800">
                <strong>Important:</strong> By signing below, you are entering into a legally binding agreement. 
                Please review all terms carefully before signing.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Your Signature</Label>
              <SignaturePad 
                onSignatureChange={setSignatureData}
                signatureData={signatureData}
              />
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="agree"
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked === true)}
              />
              <Label htmlFor="agree" className="text-sm leading-relaxed cursor-pointer">
                I have read and agree to all the terms and conditions of this lease agreement. 
                I understand that this constitutes a legally binding contract.
              </Label>
            </div>

            <Button 
              onClick={handleSign} 
              disabled={!signatureData || !agreed || signing}
              className="w-full"
            >
              {signing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <PenTool className="h-4 w-4 mr-2" />
              )}
              Sign Lease Agreement
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Already Signed */}
      {isSigned && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-800">Lease Signed Successfully</p>
                <p className="text-sm text-green-700">
                  You signed this lease on {formatDate(lease.tenant_signed_at)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
