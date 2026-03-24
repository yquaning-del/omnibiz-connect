import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Search, DollarSign, FileText, Loader2, Send, CheckCircle, XCircle } from "lucide-react";
import { toast } from 'sonner';

interface InsuranceClaim {
  id: string;
  claim_number: string | null;
  insurance_provider: string;
  policy_number: string | null;
  status: string;
  amount_claimed: number;
  amount_approved: number | null;
  copay_amount: number | null;
  denial_reason: string | null;
  submitted_at: string | null;
  processed_at: string | null;
  created_at: string;
  prescriptions?: {
    prescription_number: string;
    patient_profiles?: {
      customers?: {
        full_name: string;
      };
    };
  };
}

const InsuranceBilling = () => {
  const { currentOrganization } = useAuth();
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchClaims();
    }
  }, [currentOrganization?.id]);

  const fetchClaims = async () => {
    try {
      const { data, error } = await supabase
        .from('insurance_claims')
        .select(`
          *,
          prescriptions (
            prescription_number,
            patient_profiles (
              customers (
                full_name
              )
            )
          )
        `)
        .eq('organization_id', currentOrganization!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClaims((data || []).map((claim: any) => ({
        ...claim,
        prescriptions: claim.prescriptions
          ? {
              ...claim.prescriptions,
              patient_profiles: claim.prescriptions.patient_profiles ?? undefined,
            }
          : undefined,
      })));
    } catch (error) {
      console.error('Error fetching claims:', error);
      toast({ title: "Error", description: "Failed to load insurance claims", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const updateClaimStatus = async (claimId: string, status: string) => {
    try {
      const updateData: any = { status };
      
      if (status === 'submitted') {
        updateData.submitted_at = new Date().toISOString();
        updateData.claim_number = `CLM-${Date.now().toString(36).toUpperCase()}`;
      } else if (status === 'approved' || status === 'denied' || status === 'paid') {
        updateData.processed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('insurance_claims')
        .update(updateData)
        .eq('id', claimId);

      if (error) throw error;

      toast({ title: "Success", description: `Claim ${status}` });
      fetchClaims();
    } catch (error) {
      console.error('Error updating claim:', error);
      toast({ title: "Error", description: "Failed to update claim", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      submitted: "bg-blue-100 text-blue-800",
      approved: "bg-green-100 text-green-800",
      denied: "bg-red-100 text-red-800",
      paid: "bg-emerald-100 text-emerald-800"
    };
    return <Badge className={styles[status] || "bg-gray-100"}>{status}</Badge>;
  };

  const calculateTotals = () => {
    const pending = claims.filter(c => c.status === 'pending' || c.status === 'submitted')
      .reduce((sum, c) => sum + Number(c.amount_claimed), 0);
    const approved = claims.filter(c => c.status === 'approved' || c.status === 'paid')
      .reduce((sum, c) => sum + Number(c.amount_approved || 0), 0);
    const denied = claims.filter(c => c.status === 'denied')
      .reduce((sum, c) => sum + Number(c.amount_claimed), 0);
    return { pending, approved, denied };
  };

  const totals = calculateTotals();

  const filteredClaims = claims.filter(claim => {
    const matchesSearch = 
      claim.claim_number?.toLowerCase().includes(search.toLowerCase()) ||
      claim.insurance_provider.toLowerCase().includes(search.toLowerCase()) ||
      claim.prescriptions?.patient_profiles?.customers?.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || claim.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">Pending Claims</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totals.pending.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Approved/Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${totals.approved.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${totals.denied.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Insurance Claims</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search claims..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="denied">Denied</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Claim #</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Insurance</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Co-Pay</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClaims.map((claim) => (
                <TableRow key={claim.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono text-sm">
                        {claim.claim_number || 'Not submitted'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {claim.prescriptions?.patient_profiles?.customers?.full_name || 'Unknown'}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p>{claim.insurance_provider}</p>
                      <p className="text-xs text-muted-foreground">{claim.policy_number}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      {Number(claim.amount_claimed).toFixed(2)}
                      {claim.amount_approved && claim.amount_approved !== claim.amount_claimed && (
                        <span className="text-xs text-green-600">
                          (${Number(claim.amount_approved).toFixed(2)} approved)
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    ${Number(claim.copay_amount || 0).toFixed(2)}
                  </TableCell>
                  <TableCell>{getStatusBadge(claim.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {claim.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateClaimStatus(claim.id, 'submitted')}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Submit
                        </Button>
                      )}
                      {claim.status === 'submitted' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600"
                            onClick={() => updateClaimStatus(claim.id, 'approved')}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600"
                            onClick={() => updateClaimStatus(claim.id, 'denied')}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Deny
                          </Button>
                        </>
                      )}
                      {claim.status === 'approved' && (
                        <Button
                          size="sm"
                          onClick={() => updateClaimStatus(claim.id, 'paid')}
                        >
                          Mark Paid
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredClaims.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No insurance claims found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default InsuranceBilling;
