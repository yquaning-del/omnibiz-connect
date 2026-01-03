import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, AlertTriangle, CheckCircle, Clock, Loader2 } from "lucide-react";
import DrugInteractionAlert from "./DrugInteractionAlert";

interface Prescription {
  id: string;
  prescription_number: string;
  prescriber_name: string;
  status: string;
  date_written: string;
  refills_remaining: number;
  is_controlled_substance: boolean;
  patient_id: string;
  patient_profiles?: {
    id: string;
    allergies: string[];
    customer_id: string;
    customers?: {
      full_name: string;
    };
  };
}

interface PrescriptionManagementProps {
  onRefresh: () => void;
}

const PrescriptionManagement = ({ onRefresh }: PrescriptionManagementProps) => {
  const { currentOrganization, currentLocation } = useAuth();
  const { toast } = useToast();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [showInteractionCheck, setShowInteractionCheck] = useState(false);

  const [newPrescription, setNewPrescription] = useState({
    patient_id: "",
    prescriber_name: "",
    prescriber_license: "",
    prescriber_phone: "",
    medication_name: "",
    dosage: "",
    quantity: 30,
    directions: "",
    refills_authorized: 0,
    is_controlled_substance: false,
    notes: ""
  });

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchPrescriptions();
    }
  }, [currentOrganization?.id, currentLocation?.id]);

  const fetchPrescriptions = async () => {
    try {
      const query = supabase
        .from('prescriptions')
        .select(`
          *,
          patient_profiles (
            id,
            allergies,
            customer_id,
            customers (
              full_name
            )
          )
        `)
        .eq('organization_id', currentOrganization!.id)
        .order('created_at', { ascending: false });

      if (currentLocation?.id) {
        query.eq('location_id', currentLocation.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPrescriptions(data || []);
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
      toast({ title: "Error", description: "Failed to load prescriptions", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const generatePrescriptionNumber = () => {
    const date = new Date();
    const prefix = 'RX';
    const timestamp = date.getTime().toString(36).toUpperCase();
    return `${prefix}-${timestamp}`;
  };

  const handleCreatePrescription = async () => {
    if (!newPrescription.prescriber_name || !newPrescription.medication_name) {
      toast({ title: "Error", description: "Please fill in required fields", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // First create the prescription
      const { data: prescription, error: rxError } = await supabase
        .from('prescriptions')
        .insert({
          organization_id: currentOrganization!.id,
          location_id: currentLocation?.id || currentOrganization!.id,
          patient_id: newPrescription.patient_id || null,
          prescriber_name: newPrescription.prescriber_name,
          prescriber_license: newPrescription.prescriber_license,
          prescriber_phone: newPrescription.prescriber_phone,
          prescription_number: generatePrescriptionNumber(),
          refills_authorized: newPrescription.refills_authorized,
          refills_remaining: newPrescription.refills_authorized,
          is_controlled_substance: newPrescription.is_controlled_substance,
          notes: newPrescription.notes,
          status: 'pending'
        })
        .select()
        .single();

      if (rxError) throw rxError;

      // Then create the prescription item
      const { error: itemError } = await supabase
        .from('prescription_items')
        .insert({
          prescription_id: prescription.id,
          medication_name: newPrescription.medication_name,
          dosage: newPrescription.dosage,
          quantity: newPrescription.quantity,
          directions: newPrescription.directions
        });

      if (itemError) throw itemError;

      toast({ title: "Success", description: "Prescription created successfully" });
      setDialogOpen(false);
      setNewPrescription({
        patient_id: "",
        prescriber_name: "",
        prescriber_license: "",
        prescriber_phone: "",
        medication_name: "",
        dosage: "",
        quantity: 30,
        directions: "",
        refills_authorized: 0,
        is_controlled_substance: false,
        notes: ""
      });
      fetchPrescriptions();
      onRefresh();
    } catch (error) {
      console.error('Error creating prescription:', error);
      toast({ title: "Error", description: "Failed to create prescription", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updatePrescriptionStatus = async (id: string, status: string) => {
    try {
      const updateData: any = { status };
      if (status === 'dispensed') {
        updateData.date_filled = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('prescriptions')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast({ title: "Success", description: `Prescription marked as ${status}` });
      fetchPrescriptions();
      onRefresh();
    } catch (error) {
      console.error('Error updating prescription:', error);
      toast({ title: "Error", description: "Failed to update prescription", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      ready: "bg-green-100 text-green-800",
      dispensed: "bg-gray-100 text-gray-800",
      cancelled: "bg-red-100 text-red-800",
      refill_requested: "bg-purple-100 text-purple-800"
    };
    return <Badge className={styles[status] || "bg-gray-100"}>{status.replace('_', ' ')}</Badge>;
  };

  const filteredPrescriptions = prescriptions.filter(rx => {
    const matchesSearch = 
      rx.prescription_number.toLowerCase().includes(search.toLowerCase()) ||
      rx.prescriber_name.toLowerCase().includes(search.toLowerCase()) ||
      rx.patient_profiles?.customers?.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || rx.status === statusFilter;
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Prescription Management</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Prescription
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Prescription</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prescriber Name *</Label>
                    <Input
                      value={newPrescription.prescriber_name}
                      onChange={(e) => setNewPrescription({ ...newPrescription, prescriber_name: e.target.value })}
                      placeholder="Dr. John Smith"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Prescriber License</Label>
                    <Input
                      value={newPrescription.prescriber_license}
                      onChange={(e) => setNewPrescription({ ...newPrescription, prescriber_license: e.target.value })}
                      placeholder="MD12345"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Medication Name *</Label>
                    <Input
                      value={newPrescription.medication_name}
                      onChange={(e) => setNewPrescription({ ...newPrescription, medication_name: e.target.value })}
                      placeholder="Amoxicillin"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dosage *</Label>
                    <Input
                      value={newPrescription.dosage}
                      onChange={(e) => setNewPrescription({ ...newPrescription, dosage: e.target.value })}
                      placeholder="500mg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      value={newPrescription.quantity}
                      onChange={(e) => setNewPrescription({ ...newPrescription, quantity: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Refills Authorized</Label>
                    <Input
                      type="number"
                      value={newPrescription.refills_authorized}
                      onChange={(e) => setNewPrescription({ ...newPrescription, refills_authorized: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Controlled Substance</Label>
                    <Select
                      value={newPrescription.is_controlled_substance ? "yes" : "no"}
                      onValueChange={(v) => setNewPrescription({ ...newPrescription, is_controlled_substance: v === "yes" })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="yes">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Directions *</Label>
                  <Textarea
                    value={newPrescription.directions}
                    onChange={(e) => setNewPrescription({ ...newPrescription, directions: e.target.value })}
                    placeholder="Take 1 tablet by mouth twice daily with food"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={newPrescription.notes}
                    onChange={(e) => setNewPrescription({ ...newPrescription, notes: e.target.value })}
                    placeholder="Additional notes..."
                  />
                </div>

                <Button onClick={handleCreatePrescription} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Prescription
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search prescriptions..."
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
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="dispensed">Dispensed</SelectItem>
              <SelectItem value="refill_requested">Refill Requested</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rx Number</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Prescriber</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Refills</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPrescriptions.map((rx) => (
              <TableRow key={rx.id}>
                <TableCell className="font-mono">
                  <div className="flex items-center gap-2">
                    {rx.prescription_number}
                    {rx.is_controlled_substance && (
                      <span title="Controlled Substance">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>{rx.patient_profiles?.customers?.full_name || 'Walk-in'}</TableCell>
                <TableCell>{rx.prescriber_name}</TableCell>
                <TableCell>{new Date(rx.date_written).toLocaleDateString()}</TableCell>
                <TableCell>{getStatusBadge(rx.status)}</TableCell>
                <TableCell>{rx.refills_remaining}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {rx.status === 'pending' && (
                      <Button size="sm" variant="outline" onClick={() => updatePrescriptionStatus(rx.id, 'processing')}>
                        <Clock className="h-4 w-4 mr-1" />
                        Process
                      </Button>
                    )}
                    {rx.status === 'processing' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedPrescription(rx);
                            setShowInteractionCheck(true);
                          }}
                        >
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          Check
                        </Button>
                        <Button size="sm" onClick={() => updatePrescriptionStatus(rx.id, 'ready')}>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Ready
                        </Button>
                      </>
                    )}
                    {rx.status === 'ready' && (
                      <Button size="sm" onClick={() => updatePrescriptionStatus(rx.id, 'dispensed')}>
                        Dispense
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredPrescriptions.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No prescriptions found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {selectedPrescription && (
          <DrugInteractionAlert
            open={showInteractionCheck}
            onClose={() => {
              setShowInteractionCheck(false);
              setSelectedPrescription(null);
            }}
            prescriptionId={selectedPrescription.id}
            patientAllergies={selectedPrescription.patient_profiles?.allergies || []}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default PrescriptionManagement;
