import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  FileText,
  Scale,
  DollarSign,
  Wrench,
  XCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LEASE_COUNTRIES } from '@/lib/leaseLocations';

export interface LeaseClausesData {
  legalNotices: string[];
  rentTerms: string;
  securityDepositRules: string;
  lateFeePolicy: string;
  maintenanceResponsibilities: string;
  terminationConditions: string;
  additionalClauses: string[];
}

interface LeaseGenerationStepProps {
  formData: {
    country: string;
    state: string;
    city: string;
    address: string;
    monthlyRent: string;
    securityDeposit: string;
    lateFeeAmount: string;
    gracePeriodDays: string;
    startDate: string;
    endDate: string;
    leaseType: string;
  };
  unitDetails?: {
    unit_number: string;
    unit_type: string;
    bedrooms: number;
  };
  tenantName?: string;
  generatedClauses: LeaseClausesData | null;
  onClausesGenerated: (clauses: LeaseClausesData, templateSource: string) => void;
  onClausesUpdate: (clauses: LeaseClausesData) => void;
}

export function LeaseGenerationStep({
  formData,
  unitDetails,
  tenantName,
  generatedClauses,
  onClausesGenerated,
  onClausesUpdate,
}: LeaseGenerationStepProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [templateSource, setTemplateSource] = useState<string>('');

  const countryName = LEASE_COUNTRIES.find(c => c.code === formData.country)?.name || formData.country;

  const generateLease = async () => {
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-lease-generator', {
        body: {
          country: formData.country,
          state: formData.state,
          city: formData.city,
          unitDetails: {
            type: unitDetails?.unit_type || 'apartment',
            bedrooms: unitDetails?.bedrooms || 1,
            address: formData.address,
          },
          leaseTerms: {
            startDate: formData.startDate,
            endDate: formData.endDate,
            monthlyRent: parseFloat(formData.monthlyRent) || 0,
            securityDeposit: parseFloat(formData.securityDeposit) || 0,
            lateFee: parseFloat(formData.lateFeeAmount) || 0,
            gracePeriod: parseInt(formData.gracePeriodDays) || 5,
            leaseType: formData.leaseType,
          },
          tenantInfo: {
            name: tenantName || 'Tenant',
          },
        },
      });

      if (error) throw error;

      if (data?.success && data?.data?.clauses) {
        const clauses = data.data.clauses as LeaseClausesData;
        const source = data.data.templateSource || `${formData.country}-${formData.state || formData.city || 'GENERIC'}`;
        setTemplateSource(source);
        onClausesGenerated(clauses, source);
        toast({
          title: 'Lease Generated',
          description: 'AI has generated location-specific lease clauses. Review and edit as needed.',
        });
      } else {
        throw new Error('Invalid response from AI');
      }
    } catch (error: any) {
      console.error('Lease generation error:', error);
      setGenerationError(error.message || 'Failed to generate lease');
      
      // Generate fallback clauses
      const fallbackClauses: LeaseClausesData = {
        legalNotices: [
          'This lease agreement is governed by the laws of the applicable jurisdiction.',
          'Both parties agree to comply with all local housing regulations.',
        ],
        rentTerms: `Monthly rent of ${formData.monthlyRent} is due on the 1st of each month.`,
        securityDepositRules: `A security deposit of ${formData.securityDeposit} is required. This deposit will be returned within 30 days of lease termination, minus any deductions for damages.`,
        lateFeePolicy: `A late fee of ${formData.lateFeeAmount} will be charged if rent is not received within ${formData.gracePeriodDays} days of the due date.`,
        maintenanceResponsibilities: 'Landlord is responsible for major repairs and structural maintenance. Tenant is responsible for routine upkeep and minor repairs.',
        terminationConditions: formData.leaseType === 'month-to-month' 
          ? 'Either party may terminate this agreement with 30 days written notice.'
          : 'This lease terminates on the end date unless renewed by mutual agreement.',
        additionalClauses: [],
      };
      
      onClausesGenerated(fallbackClauses, 'FALLBACK');
      toast({
        variant: 'destructive',
        title: 'AI Generation Failed',
        description: 'Using standard template instead. You can edit all clauses manually.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const updateClause = (field: keyof LeaseClausesData, value: string | string[]) => {
    if (!generatedClauses) return;
    onClausesUpdate({
      ...generatedClauses,
      [field]: value,
    });
  };

  const updateLegalNotice = (index: number, value: string) => {
    if (!generatedClauses) return;
    const newNotices = [...generatedClauses.legalNotices];
    newNotices[index] = value;
    updateClause('legalNotices', newNotices);
  };

  const addLegalNotice = () => {
    if (!generatedClauses) return;
    updateClause('legalNotices', [...generatedClauses.legalNotices, '']);
  };

  const removeLegalNotice = (index: number) => {
    if (!generatedClauses) return;
    updateClause('legalNotices', generatedClauses.legalNotices.filter((_, i) => i !== index));
  };

  if (!generatedClauses) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <Sparkles className="h-12 w-12 mx-auto text-property mb-4" />
          <h3 className="text-lg font-semibold mb-2">Generate Lease Document</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            AI will generate location-specific lease clauses based on {countryName} 
            {formData.state && ` (${formData.state})`}
            {formData.city && ` - ${formData.city}`} regulations.
          </p>
          
          <Button
            onClick={generateLease}
            disabled={isGenerating}
            size="lg"
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Lease Clauses
              </>
            )}
          </Button>

          {generationError && (
            <div className="mt-4 p-4 bg-destructive/10 rounded-lg flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{generationError}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-success" />
          <span className="font-medium">Lease Clauses Generated</span>
          <Badge variant="outline">{templateSource}</Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={generateLease}
          disabled={isGenerating}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
          Regenerate
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Review and edit the generated clauses below. All fields are editable.
      </p>

      {/* Clauses Accordion */}
      <Accordion type="multiple" defaultValue={['legal', 'rent', 'deposit']} className="space-y-2">
        {/* Legal Notices */}
        <AccordionItem value="legal" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-property" />
              <span>Legal Notices</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-2">
            {generatedClauses.legalNotices.map((notice, index) => (
              <div key={index} className="flex gap-2">
                <Textarea
                  value={notice}
                  onChange={(e) => updateLegalNotice(index, e.target.value)}
                  rows={2}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLegalNotice(index)}
                  className="shrink-0"
                >
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addLegalNotice}>
              + Add Notice
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* Rent Terms */}
        <AccordionItem value="rent" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-property" />
              <span>Rent Terms</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <Textarea
              value={generatedClauses.rentTerms}
              onChange={(e) => updateClause('rentTerms', e.target.value)}
              rows={3}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Security Deposit */}
        <AccordionItem value="deposit" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-property" />
              <span>Security Deposit Rules</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <Textarea
              value={generatedClauses.securityDepositRules}
              onChange={(e) => updateClause('securityDepositRules', e.target.value)}
              rows={3}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Late Fee Policy */}
        <AccordionItem value="latefee" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-property" />
              <span>Late Fee Policy</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <Textarea
              value={generatedClauses.lateFeePolicy}
              onChange={(e) => updateClause('lateFeePolicy', e.target.value)}
              rows={2}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Maintenance */}
        <AccordionItem value="maintenance" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-property" />
              <span>Maintenance Responsibilities</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <Textarea
              value={generatedClauses.maintenanceResponsibilities}
              onChange={(e) => updateClause('maintenanceResponsibilities', e.target.value)}
              rows={3}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Termination */}
        <AccordionItem value="termination" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-property" />
              <span>Termination Conditions</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <Textarea
              value={generatedClauses.terminationConditions}
              onChange={(e) => updateClause('terminationConditions', e.target.value)}
              rows={2}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
