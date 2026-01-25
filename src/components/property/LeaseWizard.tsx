import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  FileText, 
  User, 
  Home, 
  DollarSign, 
  Calendar, 
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  MapPin,
  Sparkles
} from 'lucide-react';
import { LocationConfirmStep } from './LocationConfirmStep';
import { LeaseGenerationStep, LeaseClausesData } from './LeaseGenerationStep';
import { isLocationValid } from '@/lib/leaseLocations';

interface LeaseWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  preselectedUnit?: { id: string; unit_number: string };
  preselectedTenant?: { id: string; first_name: string; last_name: string };
}

interface LeaseFormData {
  unitId: string;
  tenantId: string;
  leaseType: 'fixed' | 'month-to-month';
  startDate: string;
  endDate: string;
  monthlyRent: string;
  securityDeposit: string;
  paymentDueDay: string;
  lateFeeAmount: string;
  gracePeriodDays: string;
  specialTerms: string;
  // Location fields
  country: string;
  state: string;
  city: string;
  address: string;
}

const STEPS = [
  { id: 'unit', title: 'Select Unit', icon: Home },
  { id: 'location', title: 'Confirm Location', icon: MapPin },
  { id: 'tenant', title: 'Select Tenant', icon: User },
  { id: 'terms', title: 'Lease Terms', icon: Calendar },
  { id: 'payment', title: 'Payment Details', icon: DollarSign },
  { id: 'generate', title: 'Generate Lease', icon: Sparkles },
  { id: 'review', title: 'Review & Create', icon: CheckCircle2 },
];

export function LeaseWizard({ 
  open, 
  onOpenChange, 
  onSuccess,
  preselectedUnit,
  preselectedTenant 
}: LeaseWizardProps) {
  const { currentOrganization } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [generatedClauses, setGeneratedClauses] = useState<LeaseClausesData | null>(null);
  const [templateSource, setTemplateSource] = useState<string>('');
  
  const [formData, setFormData] = useState<LeaseFormData>({
    unitId: preselectedUnit?.id || '',
    tenantId: preselectedTenant?.id || '',
    leaseType: 'fixed',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    monthlyRent: '',
    securityDeposit: '',
    paymentDueDay: '1',
    lateFeeAmount: '50',
    gracePeriodDays: '5',
    specialTerms: '',
    country: 'US',
    state: '',
    city: '',
    address: '',
  });

  useEffect(() => {
    if (open && currentOrganization?.id) {
      fetchUnits();
      fetchTenants();
    }
  }, [open, currentOrganization?.id]);

  useEffect(() => {
    if (preselectedUnit) {
      setFormData(prev => ({ ...prev, unitId: preselectedUnit.id }));
    }
    if (preselectedTenant) {
      setFormData(prev => ({ ...prev, tenantId: preselectedTenant.id }));
    }
  }, [preselectedUnit, preselectedTenant]);

  // When unit is selected, auto-fill location from unit
  useEffect(() => {
    const selectedUnit = units.find(u => u.id === formData.unitId);
    if (selectedUnit) {
      setFormData(prev => ({
        ...prev,
        country: selectedUnit.country || prev.country || 'US',
        state: selectedUnit.state || prev.state || '',
        city: selectedUnit.city || prev.city || '',
        address: selectedUnit.address || prev.address || '',
        monthlyRent: selectedUnit.monthly_rent?.toString() || prev.monthlyRent,
      }));
    }
  }, [formData.unitId, units]);

  const fetchUnits = async () => {
    if (!currentOrganization?.id) return;
    const { data } = await (supabase as any)
      .from('property_units')
      .select('id, unit_number, address, city, state, country, unit_type, bedrooms, bathrooms, square_footage, monthly_rent')
      .eq('organization_id', currentOrganization.id)
      .eq('status', 'available');
    setUnits(data || []);
  };

  const fetchTenants = async () => {
    if (!currentOrganization?.id) return;
    const { data } = await (supabase as any)
      .from('tenants')
      .select('id, first_name, last_name, email, phone')
      .eq('organization_id', currentOrganization.id)
      .eq('status', 'active');
    setTenants(data || []);
  };

  const updateFormData = (field: keyof LeaseFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateLocationData = (updates: Partial<{ country: string; state: string; city: string; address: string }>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const generateLeaseNumber = () => {
    const prefix = 'LS';
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${year}-${random}`;
  };

  const handleSubmit = async () => {
    if (!currentOrganization?.id) return;
    
    setLoading(true);
    try {
      const leaseNumber = generateLeaseNumber();
      
      const { error } = await (supabase as any)
        .from('leases')
        .insert({
          organization_id: currentOrganization.id,
          unit_id: formData.unitId,
          tenant_id: formData.tenantId,
          lease_number: leaseNumber,
          lease_type: formData.leaseType,
          start_date: formData.startDate,
          end_date: formData.leaseType === 'fixed' ? formData.endDate : null,
          monthly_rent: parseFloat(formData.monthlyRent),
          security_deposit: parseFloat(formData.securityDeposit),
          payment_due_day: parseInt(formData.paymentDueDay),
          late_fee_amount: parseFloat(formData.lateFeeAmount),
          grace_period_days: parseInt(formData.gracePeriodDays),
          special_terms: formData.specialTerms || null,
          status: 'active',
          // New location fields
          country: formData.country,
          state: formData.state || null,
          city: formData.city || null,
          template_source: templateSource || null,
          lease_document: generatedClauses || null,
        });

      if (error) throw error;

      // Update unit status to occupied
      await (supabase as any)
        .from('property_units')
        .update({ status: 'occupied' })
        .eq('id', formData.unitId);

      toast.success('Lease created successfully!');
      onOpenChange(false);
      onSuccess?.();
      
      // Reset form
      resetForm();
    } catch (error) {
      console.error('Error creating lease:', error);
      toast.error('Failed to create lease');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(0);
    setGeneratedClauses(null);
    setTemplateSource('');
    setFormData({
      unitId: '',
      tenantId: '',
      leaseType: 'fixed',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      monthlyRent: '',
      securityDeposit: '',
      paymentDueDay: '1',
      lateFeeAmount: '50',
      gracePeriodDays: '5',
      specialTerms: '',
      country: 'US',
      state: '',
      city: '',
      address: '',
    });
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return !!formData.unitId;
      case 1: return isLocationValid(formData.country, formData.state, formData.city);
      case 2: return !!formData.tenantId;
      case 3: return !!formData.startDate && (formData.leaseType === 'month-to-month' || !!formData.endDate);
      case 4: return !!formData.monthlyRent && !!formData.securityDeposit;
      case 5: return !!generatedClauses;
      case 6: return true;
      default: return false;
    }
  };

  const selectedUnit = units.find(u => u.id === formData.unitId);
  const selectedTenant = tenants.find(t => t.id === formData.tenantId);

  const handleClausesGenerated = (clauses: LeaseClausesData, source: string) => {
    setGeneratedClauses(clauses);
    setTemplateSource(source);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground">Select an available unit for this lease</p>
            <div className="grid gap-3 max-h-[400px] overflow-y-auto">
              {units.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center text-muted-foreground">
                    <Home className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No available units</p>
                    <p className="text-sm">Add units first or mark existing ones as available</p>
                  </CardContent>
                </Card>
              ) : (
                units.map((unit) => (
                  <Card 
                    key={unit.id}
                    className={`cursor-pointer transition-all ${
                      formData.unitId === unit.id 
                        ? 'border-property ring-2 ring-property/20' 
                        : 'hover:border-property/50'
                    }`}
                    onClick={() => updateFormData('unitId', unit.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Unit {unit.unit_number}</p>
                          <p className="text-sm text-muted-foreground">{unit.address || 'No address'}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline">{unit.unit_type}</Badge>
                            {unit.bedrooms && <Badge variant="secondary">{unit.bedrooms} BR</Badge>}
                            {unit.country && <Badge variant="secondary">{unit.country}</Badge>}
                          </div>
                        </div>
                        {unit.monthly_rent && (
                          <p className="text-lg font-semibold text-property">${unit.monthly_rent}/mo</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        );

      case 1:
        return (
          <LocationConfirmStep
            formData={{
              country: formData.country,
              state: formData.state,
              city: formData.city,
              address: formData.address,
            }}
            unitDetails={selectedUnit}
            onFormDataChange={updateLocationData}
          />
        );

      case 2:
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground">Select a tenant for this lease</p>
            <div className="grid gap-3 max-h-[400px] overflow-y-auto">
              {tenants.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center text-muted-foreground">
                    <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No tenants found</p>
                    <p className="text-sm">Add tenants first before creating a lease</p>
                  </CardContent>
                </Card>
              ) : (
                tenants.map((tenant) => (
                  <Card 
                    key={tenant.id}
                    className={`cursor-pointer transition-all ${
                      formData.tenantId === tenant.id 
                        ? 'border-property ring-2 ring-property/20' 
                        : 'hover:border-property/50'
                    }`}
                    onClick={() => updateFormData('tenantId', tenant.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-property/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-property" />
                        </div>
                        <div>
                          <p className="font-medium">{tenant.first_name} {tenant.last_name}</p>
                          <p className="text-sm text-muted-foreground">{tenant.email}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Lease Type</Label>
              <Select value={formData.leaseType} onValueChange={(v) => updateFormData('leaseType', v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="fixed">Fixed Term</SelectItem>
                  <SelectItem value="month-to-month">Month-to-Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input 
                  type="date" 
                  value={formData.startDate}
                  onChange={(e) => updateFormData('startDate', e.target.value)}
                />
              </div>
              
              {formData.leaseType === 'fixed' && (
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input 
                    type="date" 
                    value={formData.endDate}
                    onChange={(e) => updateFormData('endDate', e.target.value)}
                    min={formData.startDate}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Special Terms (Optional)</Label>
              <Textarea 
                placeholder="Any special conditions or terms..."
                value={formData.specialTerms}
                onChange={(e) => updateFormData('specialTerms', e.target.value)}
                rows={3}
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Monthly Rent ($)</Label>
                <Input 
                  type="number" 
                  placeholder="1500"
                  value={formData.monthlyRent}
                  onChange={(e) => updateFormData('monthlyRent', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Security Deposit ($)</Label>
                <Input 
                  type="number" 
                  placeholder="1500"
                  value={formData.securityDeposit}
                  onChange={(e) => updateFormData('securityDeposit', e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Payment Due Day</Label>
                <Select value={formData.paymentDueDay} onValueChange={(v) => updateFormData('paymentDueDay', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background max-h-[200px]">
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                      <SelectItem key={day} value={day.toString()}>
                        {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Late Fee ($)</Label>
                <Input 
                  type="number" 
                  placeholder="50"
                  value={formData.lateFeeAmount}
                  onChange={(e) => updateFormData('lateFeeAmount', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Grace Period (Days)</Label>
                <Input 
                  type="number" 
                  placeholder="5"
                  value={formData.gracePeriodDays}
                  onChange={(e) => updateFormData('gracePeriodDays', e.target.value)}
                />
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <LeaseGenerationStep
            formData={formData}
            unitDetails={selectedUnit}
            tenantName={selectedTenant ? `${selectedTenant.first_name} ${selectedTenant.last_name}` : undefined}
            generatedClauses={generatedClauses}
            onClausesGenerated={handleClausesGenerated}
            onClausesUpdate={setGeneratedClauses}
          />
        );

      case 6:
        return (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Home className="h-5 w-5 text-property mt-0.5" />
                <div>
                  <p className="font-medium">Unit {selectedUnit?.unit_number}</p>
                  <p className="text-sm text-muted-foreground">{formData.address || selectedUnit?.address}</p>
                  <p className="text-xs text-muted-foreground">
                    {[formData.city, formData.state, formData.country].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-property mt-0.5" />
                <div>
                  <p className="font-medium">{selectedTenant?.first_name} {selectedTenant?.last_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedTenant?.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-property mt-0.5" />
                <div>
                  <p className="font-medium">{formData.leaseType === 'fixed' ? 'Fixed Term' : 'Month-to-Month'}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(formData.startDate).toLocaleDateString()} 
                    {formData.leaseType === 'fixed' && ` to ${new Date(formData.endDate).toLocaleDateString()}`}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-property mt-0.5" />
                <div>
                  <p className="font-medium">${formData.monthlyRent}/month</p>
                  <p className="text-sm text-muted-foreground">
                    ${formData.securityDeposit} deposit · Due on {formData.paymentDueDay}th · ${formData.lateFeeAmount} late fee after {formData.gracePeriodDays} days
                  </p>
                </div>
              </div>

              {templateSource && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-property mt-0.5" />
                  <div>
                    <p className="font-medium">Lease Template</p>
                    <p className="text-sm text-muted-foreground">
                      Using {templateSource} jurisdiction template
                    </p>
                  </div>
                </div>
              )}

              {formData.specialTerms && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-property mt-0.5" />
                  <div>
                    <p className="font-medium">Special Terms</p>
                    <p className="text-sm text-muted-foreground">{formData.specialTerms}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const progressPercent = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-property" />
            Create New Lease
          </DialogTitle>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Step {currentStep + 1} of {STEPS.length}</span>
            <span className="font-medium">{STEPS[currentStep].title}</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          
          {/* Step indicators */}
          <div className="flex justify-between mt-2">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <div 
                  key={step.id}
                  className={`flex flex-col items-center ${
                    index <= currentStep ? 'text-property' : 'text-muted-foreground'
                  }`}
                >
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                    index < currentStep 
                      ? 'bg-property text-white' 
                      : index === currentStep 
                      ? 'bg-property/20 text-property border-2 border-property' 
                      : 'bg-muted'
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="py-4 min-h-[300px]">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button
              onClick={() => setCurrentStep(prev => prev + 1)}
              disabled={!canProceed()}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading || !canProceed()}
            >
              {loading ? 'Creating...' : 'Create Lease'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
