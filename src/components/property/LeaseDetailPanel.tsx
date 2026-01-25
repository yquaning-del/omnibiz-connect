import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileText,
  Calendar,
  DollarSign,
  Building2,
  User,
  Mail,
  Phone,
  MoreVertical,
  Edit,
  Trash2,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/currency';
import { LeaseExportButton } from './LeaseExportButton';
import { LeaseWordExport } from './LeaseWordExport';
import { InviteTenantButton } from './InviteTenantButton';
import { LeaseStatusManager } from './LeaseStatusManager';
import { DeleteLeaseDialog } from './DeleteLeaseDialog';
import { LeaseClausesData } from './LeaseGenerationStep';

interface LeaseWithDetails {
  id: string;
  lease_number: string;
  lease_type: string;
  start_date: string;
  end_date: string | null;
  monthly_rent: number;
  security_deposit: number;
  payment_due_day: number;
  late_fee_amount: number;
  grace_period_days: number;
  special_terms: string | null;
  status: string;
  country: string | null;
  state: string | null;
  city: string | null;
  lease_document: LeaseClausesData | null;
  landlord_signed_at: string | null;
  tenant_signed_at: string | null;
  organization_id: string;
  unit_id: string;
  tenant_id: string;
  tenant?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
  };
  unit?: {
    id: string;
    unit_number: string;
    unit_type: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    square_footage: number | null;
  };
}

interface LeaseDetailPanelProps {
  leaseId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeaseUpdated: () => void;
  onEditLease?: (lease: LeaseWithDetails) => void;
}

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground border-muted',
  pending_signature: 'bg-warning/20 text-warning border-warning/30',
  active: 'bg-success/20 text-success border-success/30',
  expired: 'bg-destructive/20 text-destructive border-destructive/30',
  terminated: 'bg-destructive/20 text-destructive border-destructive/30',
};

const clauseLabels: Record<string, string> = {
  rentTerms: 'Rent Terms',
  securityDepositRules: 'Security Deposit',
  lateFeePolicy: 'Late Fee Policy',
  maintenanceResponsibilities: 'Maintenance',
  terminationConditions: 'Termination',
  utilitiesAndServices: 'Utilities & Services',
  petPolicy: 'Pet Policy',
  noiseAndConduct: 'Noise & Conduct',
  entryAndInspection: 'Entry & Inspection',
  insuranceRequirements: 'Insurance',
  alterationsPolicy: 'Alterations',
  sublettingPolicy: 'Subletting',
};

export function LeaseDetailPanel({
  leaseId,
  open,
  onOpenChange,
  onLeaseUpdated,
  onEditLease,
}: LeaseDetailPanelProps) {
  const { currentOrganization } = useAuth();
  const { toast } = useToast();
  const [lease, setLease] = useState<LeaseWithDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (leaseId && open) {
      fetchLeaseDetails();
    }
  }, [leaseId, open]);

  const fetchLeaseDetails = async () => {
    if (!leaseId || !currentOrganization?.id) return;

    setLoading(true);
    try {
      // Fetch lease with tenant and unit
      const { data: leaseData, error: leaseError } = await (supabase as any)
        .from('leases')
        .select(`
          *,
          tenant:tenants(id, first_name, last_name, email, phone),
          unit:property_units(id, unit_number, unit_type, address, city, state, country, bedrooms, bathrooms, square_footage)
        `)
        .eq('id', leaseId)
        .eq('organization_id', currentOrganization.id)
        .maybeSingle();

      if (leaseError) throw leaseError;
      if (!leaseData) {
        toast({
          variant: 'destructive',
          title: 'Lease not found',
          description: 'The lease could not be loaded.',
        });
        onOpenChange(false);
        return;
      }

      setLease(leaseData);
    } catch (error: any) {
      console.error('Error fetching lease:', error);
      toast({
        variant: 'destructive',
        title: 'Error loading lease',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getPropertyAddress = () => {
    if (!lease?.unit) return 'No unit assigned';
    const parts = [
      lease.unit.unit_number ? `Unit ${lease.unit.unit_number}` : '',
      lease.unit.address,
      lease.unit.city,
      lease.unit.state,
      lease.unit.country,
    ].filter(Boolean);
    return parts.join(', ') || 'No address';
  };

  const getTenantName = () => {
    if (!lease?.tenant) return 'No tenant assigned';
    return `${lease.tenant.first_name} ${lease.tenant.last_name}`;
  };

  const canInvite = lease && 
    !lease.tenant_signed_at && 
    lease.tenant?.email &&
    ['active', 'pending_signature'].includes(lease.status);

  const renderClauses = () => {
    if (!lease?.lease_document) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No generated clauses available</p>
        </div>
      );
    }

    const clauses = lease.lease_document;
    const clauseEntries = Object.entries(clauseLabels)
      .filter(([key]) => clauses[key as keyof LeaseClausesData])
      .map(([key, label]) => ({
        key,
        label,
        content: clauses[key as keyof LeaseClausesData] as string,
      }));

    return (
      <Accordion type="multiple" className="w-full">
        {clauseEntries.map(({ key, label, content }) => (
          <AccordionItem key={key} value={key}>
            <AccordionTrigger className="text-sm hover:no-underline">
              {label}
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {content}
              </p>
            </AccordionContent>
          </AccordionItem>
        ))}

        {clauses.legalNotices && clauses.legalNotices.length > 0 && (
          <AccordionItem value="legalNotices">
            <AccordionTrigger className="text-sm hover:no-underline">
              Legal Notices
            </AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-2">
                {clauses.legalNotices.map((notice, i) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    • {notice}
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        )}

        {clauses.additionalClauses && clauses.additionalClauses.length > 0 && (
          <AccordionItem value="additionalClauses">
            <AccordionTrigger className="text-sm hover:no-underline">
              Additional Clauses
            </AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-2">
                {clauses.additionalClauses.map((clause, i) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    • {clause}
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {loading ? (
            <div className="space-y-6 pt-6">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : lease ? (
            <>
              <SheetHeader className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <SheetTitle className="flex items-center gap-2 text-xl">
                      <FileText className="h-5 w-5 text-property" />
                      Lease #{lease.lease_number}
                    </SheetTitle>
                    <p className="text-sm text-muted-foreground mt-1 capitalize">
                      {lease.lease_type.replace('-', ' ')} term
                    </p>
                  </div>
                  <Badge className={statusColors[lease.status] || 'bg-muted'}>
                    {lease.status.replace('_', ' ')}
                  </Badge>
                </div>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <LeaseExportButton
                    leaseData={{
                      leaseNumber: lease.lease_number,
                      leaseType: lease.lease_type,
                      startDate: lease.start_date,
                      endDate: lease.end_date || undefined,
                      monthlyRent: lease.monthly_rent.toString(),
                      securityDeposit: lease.security_deposit.toString(),
                      paymentDueDay: lease.payment_due_day.toString(),
                      lateFeeAmount: lease.late_fee_amount.toString(),
                      gracePeriodDays: lease.grace_period_days.toString(),
                      specialTerms: lease.special_terms || undefined,
                      country: lease.country || undefined,
                      state: lease.state || undefined,
                      city: lease.city || undefined,
                      address: lease.unit?.address || undefined,
                    }}
                    unitDetails={lease.unit ? {
                      unit_number: lease.unit.unit_number,
                      unit_type: lease.unit.unit_type || undefined,
                      bedrooms: lease.unit.bedrooms || undefined,
                      bathrooms: lease.unit.bathrooms || undefined,
                      square_footage: lease.unit.square_footage || undefined,
                      address: lease.unit.address || undefined,
                    } : undefined}
                    tenantName={getTenantName()}
                    tenantEmail={lease.tenant?.email || undefined}
                    organizationName={currentOrganization?.name}
                    clauses={lease.lease_document}
                    size="sm"
                  />
                  
                  <LeaseWordExport
                    lease={lease}
                    tenantName={getTenantName()}
                    organizationName={currentOrganization?.name || ''}
                    size="sm"
                  />

                  {canInvite && lease.tenant && (
                    <InviteTenantButton
                      leaseId={lease.id}
                      tenantId={lease.tenant.id}
                      tenantEmail={lease.tenant.email || undefined}
                      tenantName={getTenantName()}
                      propertyAddress={getPropertyAddress()}
                      monthlyRent={lease.monthly_rent.toString()}
                      size="sm"
                      onInviteSent={fetchLeaseDetails}
                    />
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onEditLease && (
                        <DropdownMenuItem onClick={() => onEditLease(lease)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Lease
                        </DropdownMenuItem>
                      )}
                      <LeaseStatusManager
                        leaseId={lease.id}
                        currentStatus={lease.status}
                        onStatusChanged={() => {
                          fetchLeaseDetails();
                          onLeaseUpdated();
                        }}
                      />
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteDialogOpen(true)}
                        disabled={lease.status === 'active'}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Lease
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <Separator />

                {/* Property Info */}
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Building2 className="h-4 w-4 text-property" />
                      Property
                    </div>
                    <p className="text-sm">{getPropertyAddress()}</p>
                    {lease.unit && (
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        {lease.unit.bedrooms && <span>{lease.unit.bedrooms} bed</span>}
                        {lease.unit.bathrooms && <span>{lease.unit.bathrooms} bath</span>}
                        {lease.unit.square_footage && <span>{lease.unit.square_footage} sqft</span>}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Tenant Info */}
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <User className="h-4 w-4 text-property" />
                      Tenant
                    </div>
                    <p className="text-sm font-medium">{getTenantName()}</p>
                    {lease.tenant && (
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {lease.tenant.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            {lease.tenant.email}
                          </div>
                        )}
                        {lease.tenant.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3" />
                            {lease.tenant.phone}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Dates & Signing */}
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Calendar className="h-4 w-4 text-property" />
                      Dates
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Start Date</p>
                        <p>{formatDate(lease.start_date)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">End Date</p>
                        <p>{formatDate(lease.end_date)}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        {lease.landlord_signed_at ? (
                          <CheckCircle className="h-4 w-4 text-success" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div>
                          <p className="text-muted-foreground">Landlord</p>
                          <p>{lease.landlord_signed_at ? 'Signed' : 'Pending'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {lease.tenant_signed_at ? (
                          <CheckCircle className="h-4 w-4 text-success" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div>
                          <p className="text-muted-foreground">Tenant</p>
                          <p>{lease.tenant_signed_at ? 'Signed' : 'Pending'}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Financials */}
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <DollarSign className="h-4 w-4 text-property" />
                      Financials
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Monthly Rent</p>
                        <p className="font-semibold">{formatCurrency(lease.monthly_rent)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Security Deposit</p>
                        <p>{formatCurrency(lease.security_deposit)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Due Day</p>
                        <p>Day {lease.payment_due_day} of each month</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Late Fee</p>
                        <p>{formatCurrency(lease.late_fee_amount)} after {lease.grace_period_days} days</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Special Terms */}
                {lease.special_terms && (
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <AlertCircle className="h-4 w-4 text-property" />
                        Special Terms
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {lease.special_terms}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Clauses */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-property" />
                    Lease Clauses
                  </h4>
                  {renderClauses()}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Select a lease to view details</p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {lease && (
        <DeleteLeaseDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          leaseId={lease.id}
          leaseNumber={lease.lease_number}
          status={lease.status}
          onDeleted={() => {
            onOpenChange(false);
            onLeaseUpdated();
          }}
        />
      )}
    </>
  );
}
