import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  Zap,
  PawPrint,
  Volume2,
  Key,
  Shield,
  Hammer,
  Users,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { LEASE_COUNTRIES } from '@/lib/leaseLocations';
import { toast } from 'sonner';

export interface LeaseClausesData {
  legalNotices: string[];
  rentTerms: string;
  securityDepositRules: string;
  lateFeePolicy: string;
  maintenanceResponsibilities: string;
  terminationConditions: string;
  additionalClauses: string[];
  // Enhanced clauses
  utilitiesAndServices: string;
  petPolicy: string;
  noiseAndConduct: string;
  entryAndInspection: string;
  insuranceRequirements: string;
  alterationsPolicy: string;
  sublettingPolicy: string;
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
        toast.success("Lease Generated", { description: "AI has generated comprehensive location-specific lease clauses. Review and edit as needed." });
      } else {
        throw new Error('Invalid response from AI');
      }
    } catch (error: any) {
      console.error('Lease generation error:', error);
      setGenerationError(error.message || 'Failed to generate lease');
      
      // Generate comprehensive fallback clauses
      const fallbackClauses: LeaseClausesData = {
        legalNotices: [
          'This lease agreement is governed by the laws of the applicable jurisdiction.',
          'Both parties agree to comply with all local housing regulations.',
          'This document constitutes the entire agreement between the parties.',
        ],
        rentTerms: `Monthly rent of ${formData.monthlyRent} is due on the 1st of each month. Payment may be made by check, money order, or electronic transfer to the designated account. If the first or last month of tenancy is partial, rent shall be prorated on a daily basis. In the event of a returned check, tenant agrees to pay all bank fees plus a $25 returned check fee.`,
        securityDepositRules: `A security deposit of ${formData.securityDeposit} is required prior to move-in. This deposit will be held in accordance with local laws and will be returned within 30 days of lease termination, minus any deductions for unpaid rent, damages beyond normal wear and tear, or cleaning costs. An itemized statement of deductions will be provided. A move-in and move-out inspection will be conducted to document the property condition.`,
        lateFeePolicy: `Rent received after the ${formData.gracePeriodDays}-day grace period will incur a late fee of ${formData.lateFeeAmount}. This fee is due immediately upon late payment. Repeated late payments may constitute grounds for lease termination. Partial payments will be applied first to late fees, then to rent.`,
        maintenanceResponsibilities: `LANDLORD is responsible for: structural repairs, plumbing and electrical systems, HVAC maintenance, appliance repairs (if provided), pest control, and maintaining common areas. TENANT is responsible for: routine cleaning, replacing light bulbs and batteries, HVAC filter changes, lawn care (if applicable), and reporting maintenance issues promptly. Emergency repairs should be reported immediately. Non-emergency requests should be submitted in writing.`,
        terminationConditions: formData.leaseType === 'month-to-month' 
          ? 'Either party may terminate this agreement with 30 days written notice. Notice must be provided on or before the rent due date. Tenant remains responsible for rent through the notice period. Holdover tenancy without landlord consent will result in rent at 150% of the normal rate.'
          : `This lease terminates on the end date unless renewed by mutual written agreement. Early termination by tenant requires payment of two months rent as a termination fee plus 30 days notice. Landlord may terminate for material breach after providing required notice and opportunity to cure.`,
        additionalClauses: [
          'No illegal activities may be conducted on the premises.',
          'Tenant may not store hazardous materials on the property.',
        ],
        utilitiesAndServices: `LANDLORD provides: water, sewer, and trash collection. TENANT is responsible for: electricity, gas, internet, and cable services. Tenant must transfer utilities into their name within 3 days of move-in and maintain service throughout the lease term. Tenant is responsible for any utility damage caused by their negligence.`,
        petPolicy: `Pets are not permitted without prior written approval from landlord. If approved, a pet deposit of one month's rent is required, plus monthly pet rent of $25-50 depending on pet type. Breed and weight restrictions may apply. Service animals are exempt from pet fees with proper documentation. Pet violations may result in immediate lease termination.`,
        noiseAndConduct: `Quiet hours are from 10:00 PM to 8:00 AM. Tenant shall not engage in any activity that disturbs neighbors or constitutes a nuisance. Overnight guests exceeding 7 consecutive days or 14 days per month require landlord notification. No commercial activities may be conducted from the premises without written consent.`,
        entryAndInspection: `Landlord may enter the premises with 24-48 hours advance notice for inspections, repairs, or to show the unit to prospective tenants (during last 60 days of lease). Emergency access is permitted without notice for fire, flood, or immediate safety concerns. Routine inspections will be conducted quarterly.`,
        insuranceRequirements: `Tenant is required to maintain renter's insurance with minimum coverage of $100,000 liability and $25,000 personal property throughout the lease term. Landlord must be named as an interested party. Proof of insurance is required at move-in and upon each renewal. Failure to maintain insurance is a lease violation.`,
        alterationsPolicy: `No alterations, additions, or improvements may be made without prior written consent from landlord. This includes but is not limited to: painting, wallpaper, fixtures, satellite dishes, and security systems. Approved alterations become property of the landlord unless otherwise agreed. Tenant must restore premises to original condition upon move-out.`,
        sublettingPolicy: `Subletting or assignment of this lease is prohibited without prior written consent from landlord. Any approved sublet requires a subletting fee of $200 and the subtenant must complete a full application and credit check. Original tenant remains fully responsible for all lease obligations.`,
      };
      
      onClausesGenerated(fallbackClauses, 'FALLBACK');
      toast.error("AI Generation Failed", { description: "Using comprehensive standard template instead. You can edit all clauses manually." });
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
          <h3 className="text-lg font-semibold mb-2">Generate Comprehensive Lease Document</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            AI will generate detailed, location-specific lease clauses based on {countryName} 
            {formData.state && ` (${formData.state})`}
            {formData.city && ` - ${formData.city}`} regulations, including rent terms, pet policies, utilities, insurance requirements, and more.
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
                Generating Comprehensive Lease...
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
          <span className="font-medium">Comprehensive Lease Clauses Generated</span>
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
        Review and edit all generated clauses below. All fields are fully editable.
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
              rows={4}
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
              rows={4}
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
              rows={3}
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
              rows={4}
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
              rows={4}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Utilities & Services */}
        <AccordionItem value="utilities" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-property" />
              <span>Utilities & Services</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <Textarea
              value={generatedClauses.utilitiesAndServices || ''}
              onChange={(e) => updateClause('utilitiesAndServices', e.target.value)}
              rows={3}
              placeholder="Specify which utilities are included and tenant responsibilities..."
            />
          </AccordionContent>
        </AccordionItem>

        {/* Pet Policy */}
        <AccordionItem value="pets" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <PawPrint className="h-4 w-4 text-property" />
              <span>Pet Policy</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <Textarea
              value={generatedClauses.petPolicy || ''}
              onChange={(e) => updateClause('petPolicy', e.target.value)}
              rows={4}
              placeholder="Pet restrictions, deposits, and violation consequences..."
            />
          </AccordionContent>
        </AccordionItem>

        {/* Noise & Conduct */}
        <AccordionItem value="conduct" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-property" />
              <span>Noise & Conduct</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <Textarea
              value={generatedClauses.noiseAndConduct || ''}
              onChange={(e) => updateClause('noiseAndConduct', e.target.value)}
              rows={3}
              placeholder="Quiet hours, guest policies, and prohibited activities..."
            />
          </AccordionContent>
        </AccordionItem>

        {/* Entry & Inspection */}
        <AccordionItem value="entry" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-property" />
              <span>Entry & Inspection Rights</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <Textarea
              value={generatedClauses.entryAndInspection || ''}
              onChange={(e) => updateClause('entryAndInspection', e.target.value)}
              rows={3}
              placeholder="Landlord access rights and notice requirements..."
            />
          </AccordionContent>
        </AccordionItem>

        {/* Insurance Requirements */}
        <AccordionItem value="insurance" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-property" />
              <span>Insurance Requirements</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <Textarea
              value={generatedClauses.insuranceRequirements || ''}
              onChange={(e) => updateClause('insuranceRequirements', e.target.value)}
              rows={3}
              placeholder="Renter's insurance requirements and coverage amounts..."
            />
          </AccordionContent>
        </AccordionItem>

        {/* Alterations Policy */}
        <AccordionItem value="alterations" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Hammer className="h-4 w-4 text-property" />
              <span>Alterations & Modifications</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <Textarea
              value={generatedClauses.alterationsPolicy || ''}
              onChange={(e) => updateClause('alterationsPolicy', e.target.value)}
              rows={3}
              placeholder="Rules for property modifications and improvements..."
            />
          </AccordionContent>
        </AccordionItem>

        {/* Subletting Policy */}
        <AccordionItem value="subletting" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-property" />
              <span>Subletting Policy</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <Textarea
              value={generatedClauses.sublettingPolicy || ''}
              onChange={(e) => updateClause('sublettingPolicy', e.target.value)}
              rows={3}
              placeholder="Rules for subletting or assigning the lease..."
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
