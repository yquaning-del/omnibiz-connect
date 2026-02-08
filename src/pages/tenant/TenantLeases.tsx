import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Download, 
  Calendar,
  Home,
  DollarSign,
  PenTool,
  CheckCircle,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface Lease {
  id: string;
  lease_number: string | null;
  lease_type: string;
  start_date: string;
  end_date: string | null;
  monthly_rent: number;
  security_deposit: number;
  status: string;
  landlord_signed_at: string | null;
  tenant_signed_at: string | null;
  unit_id: string;
  lease_document: any;
}

interface TenantContextType {
  tenantData: any;
  refreshTenantData: () => Promise<void>;
}

export default function TenantLeases() {
  const { tenantData } = useOutletContext<TenantContextType>();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenantData?.id) {
      fetchLeases();
    }
  }, [tenantData]);

  const fetchLeases = async () => {
    try {
      const { data, error } = await supabase
        .from('leases')
        .select('*')
        .eq('tenant_id', tenantData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeases((data || []).map((lease: any) => ({
        ...lease,
        lease_type: lease.lease_type ?? 'fixed',
        start_date: lease.start_date ?? '',
        monthly_rent: lease.monthly_rent ?? 0,
        security_deposit: lease.security_deposit ?? 0,
        status: lease.status ?? 'draft',
        unit_id: lease.unit_id ?? '',
      })));
    } catch (error) {
      console.error('Error fetching leases:', error);
    } finally {
      setLoading(false);
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

  const getStatusBadge = (lease: Lease) => {
    if (!lease.tenant_signed_at) {
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Signature Required</Badge>;
    }
    if (lease.status === 'active') {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>;
    }
    return <Badge variant="secondary">{lease.status}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          {[1, 2].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Leases</h1>
        <p className="text-muted-foreground">
          View and manage your lease agreements
        </p>
      </div>

      {leases.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Leases Found</h3>
            <p className="text-muted-foreground">
              You don't have any lease agreements yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {leases.map((lease) => (
            <Card key={lease.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-property/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-property" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        Lease {lease.lease_number || `#${lease.id.slice(0, 8)}`}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {lease.lease_type === 'fixed' ? 'Fixed Term' : 'Month-to-Month'}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(lease)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Lease Period</p>
                      <p className="text-sm font-medium">
                        {formatDate(lease.start_date)} - {formatDate(lease.end_date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Monthly Rent</p>
                      <p className="text-sm font-medium">
                        {formatCurrency(lease.monthly_rent)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Security Deposit</p>
                      <p className="text-sm font-medium">
                        {formatCurrency(lease.security_deposit)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Signature Status */}
                <div className="flex items-center gap-4 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    {lease.landlord_signed_at ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm">
                      Landlord: {lease.landlord_signed_at ? 'Signed' : 'Pending'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {lease.tenant_signed_at ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm">
                      Tenant: {lease.tenant_signed_at ? 'Signed' : 'Pending'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  {!lease.tenant_signed_at && (
                    <Link to={`/tenant/leases/${lease.id}`}>
                      <Button>
                        <PenTool className="h-4 w-4 mr-2" />
                        Sign Lease
                      </Button>
                    </Link>
                  )}
                  <Link to={`/tenant/leases/${lease.id}`}>
                    <Button variant="outline">
                      <FileText className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
