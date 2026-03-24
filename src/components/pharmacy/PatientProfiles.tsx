import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, User, AlertTriangle, Loader2, History, FileText, Pencil, Trash2 } from "lucide-react";
import { toast } from 'sonner';

interface PatientProfile {
  id: string;
  date_of_birth: string | null;
  gender: string | null;
  blood_type: string | null;
  allergies: string[];
  medical_conditions: string[];
  insurance_provider: string | null;
  insurance_policy_number: string | null;
  insurance_expiry: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  notes: string | null;
  customers?: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
  };
}

const PatientProfiles = () => {
  const { currentOrganization } = useAuth();
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [prescriptionHistory, setPrescriptionHistory] = useState<any[]>([]);
  const [editingItem, setEditingItem] = useState<PatientProfile | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<PatientProfile | null>(null);

  const [newPatient, setNewPatient] = useState({
    full_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    gender: "",
    blood_type: "",
    allergies: "",
    medical_conditions: "",
    insurance_provider: "",
    insurance_policy_number: "",
    insurance_group_number: "",
    insurance_expiry: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    notes: ""
  });

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchPatients();
    }
  }, [currentOrganization?.id]);

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patient_profiles')
        .select(`
          *,
          customers (
            id,
            full_name,
            email,
            phone
          )
        `)
        .eq('organization_id', currentOrganization!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPatients((data || []).map((p: any) => ({
        ...p,
        allergies: p.allergies ?? [],
        medical_conditions: p.medical_conditions ?? [],
        customers: p.customers ?? undefined,
      })));
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error("Error", { description: "Failed to load patients" });
    } finally {
      setLoading(false);
    }
  };

  const fetchPrescriptionHistory = async (patientId: string) => {
    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .select(`
          *,
          prescription_items (*)
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrescriptionHistory(data || []);
    } catch (error) {
      console.error('Error fetching prescription history:', error);
    }
  };

  const handleCreatePatient = async () => {
    if (!newPatient.full_name) {
      toast.error("Error", { description: "Patient name is required" });
      return;
    }

    setSaving(true);
    try {
      // First create or get the customer
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert({
          organization_id: currentOrganization!.id,
          full_name: newPatient.full_name,
          email: newPatient.email || null,
          phone: newPatient.phone || null
        })
        .select()
        .single();

      if (customerError) throw customerError;

      // Then create the patient profile
      const { error: profileError } = await supabase
        .from('patient_profiles')
        .insert({
          organization_id: currentOrganization!.id,
          customer_id: customer.id,
          date_of_birth: newPatient.date_of_birth || null,
          gender: newPatient.gender || null,
          blood_type: newPatient.blood_type || null,
          allergies: newPatient.allergies ? newPatient.allergies.split(',').map(a => a.trim()) : [],
          medical_conditions: newPatient.medical_conditions ? newPatient.medical_conditions.split(',').map(c => c.trim()) : [],
          insurance_provider: newPatient.insurance_provider || null,
          insurance_policy_number: newPatient.insurance_policy_number || null,
          insurance_group_number: newPatient.insurance_group_number || null,
          insurance_expiry: newPatient.insurance_expiry || null,
          emergency_contact_name: newPatient.emergency_contact_name || null,
          emergency_contact_phone: newPatient.emergency_contact_phone || null,
          notes: newPatient.notes || null
        });

      if (profileError) throw profileError;

      toast.success("Success", { description: "Patient profile created" });
      setDialogOpen(false);
      setNewPatient({
        full_name: "", email: "", phone: "", date_of_birth: "", gender: "",
        blood_type: "", allergies: "", medical_conditions: "", insurance_provider: "",
        insurance_policy_number: "", insurance_group_number: "", insurance_expiry: "",
        emergency_contact_name: "", emergency_contact_phone: "", notes: ""
      });
      fetchPatients();
    } catch (error) {
      console.error('Error creating patient:', error);
      toast.error("Error", { description: "Failed to create patient" });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (patient: PatientProfile) => {
    setEditingItem(patient);
    setNewPatient({
      full_name: patient.customers?.full_name || "",
      email: patient.customers?.email || "",
      phone: patient.customers?.phone || "",
      date_of_birth: patient.date_of_birth || "",
      gender: patient.gender || "",
      blood_type: patient.blood_type || "",
      allergies: patient.allergies?.join(', ') || "",
      medical_conditions: patient.medical_conditions?.join(', ') || "",
      insurance_provider: patient.insurance_provider || "",
      insurance_policy_number: patient.insurance_policy_number || "",
      insurance_group_number: (patient as any).insurance_group_number || "",
      insurance_expiry: patient.insurance_expiry || "",
      emergency_contact_name: patient.emergency_contact_name || "",
      emergency_contact_phone: patient.emergency_contact_phone || "",
      notes: patient.notes || ""
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editingItem || !newPatient.full_name) {
      toast.error("Error", { description: "Patient name is required" });
      return;
    }

    setSaving(true);
    try {
      // Update customer
      if (editingItem.customers?.id) {
        const { error: customerError } = await supabase
          .from('customers')
          .update({
            full_name: newPatient.full_name,
            email: newPatient.email || null,
            phone: newPatient.phone || null
          })
          .eq('id', editingItem.customers.id);

        if (customerError) throw customerError;
      }

      // Update patient profile
      const { error: profileError } = await supabase
        .from('patient_profiles')
        .update({
          date_of_birth: newPatient.date_of_birth || null,
          gender: newPatient.gender || null,
          blood_type: newPatient.blood_type || null,
          allergies: newPatient.allergies ? newPatient.allergies.split(',').map(a => a.trim()) : [],
          medical_conditions: newPatient.medical_conditions ? newPatient.medical_conditions.split(',').map(c => c.trim()) : [],
          insurance_provider: newPatient.insurance_provider || null,
          insurance_policy_number: newPatient.insurance_policy_number || null,
          insurance_group_number: newPatient.insurance_group_number || null,
          insurance_expiry: newPatient.insurance_expiry || null,
          emergency_contact_name: newPatient.emergency_contact_name || null,
          emergency_contact_phone: newPatient.emergency_contact_phone || null,
          notes: newPatient.notes || null
        })
        .eq('id', editingItem.id);

      if (profileError) throw profileError;

      toast.success("Success", { description: "Patient profile updated successfully" });
      setEditDialogOpen(false);
      setEditingItem(null);
      setNewPatient({
        full_name: "", email: "", phone: "", date_of_birth: "", gender: "",
        blood_type: "", allergies: "", medical_conditions: "", insurance_provider: "",
        insurance_policy_number: "", insurance_group_number: "", insurance_expiry: "",
        emergency_contact_name: "", emergency_contact_phone: "", notes: ""
      });
      fetchPatients();
    } catch (error) {
      console.error('Error updating patient:', error);
      toast.error("Error", { description: "Failed to update patient" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!patientToDelete) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('patient_profiles')
        .delete()
        .eq('id', patientToDelete.id);

      if (error) throw error;

      toast.success("Success", { description: "Patient profile deleted successfully" });
      setDeleteDialogOpen(false);
      setPatientToDelete(null);
      fetchPatients();
    } catch (error) {
      console.error('Error deleting patient:', error);
      toast.error("Error", { description: "Failed to delete patient" });
    } finally {
      setSaving(false);
    }
  };

  const viewPatientDetails = (patient: PatientProfile) => {
    setSelectedPatient(patient);
    fetchPrescriptionHistory(patient.id);
  };

  const filteredPatients = patients.filter(p =>
    p.customers?.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.customers?.phone?.includes(search) ||
    p.insurance_policy_number?.includes(search)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Patient Profiles</CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Patient
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>New Patient Profile</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <Input
                        value={newPatient.full_name}
                        onChange={(e) => setNewPatient({ ...newPatient, full_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={newPatient.email}
                        onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        value={newPatient.phone}
                        onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Date of Birth</Label>
                      <Input
                        type="date"
                        value={newPatient.date_of_birth}
                        onChange={(e) => setNewPatient({ ...newPatient, date_of_birth: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select value={newPatient.gender} onValueChange={(v) => setNewPatient({ ...newPatient, gender: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Blood Type</Label>
                      <Select value={newPatient.blood_type} onValueChange={(v) => setNewPatient({ ...newPatient, blood_type: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Allergies (comma-separated)</Label>
                    <Input
                      value={newPatient.allergies}
                      onChange={(e) => setNewPatient({ ...newPatient, allergies: e.target.value })}
                      placeholder="Penicillin, Sulfa drugs, Aspirin"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Medical Conditions (comma-separated)</Label>
                    <Input
                      value={newPatient.medical_conditions}
                      onChange={(e) => setNewPatient({ ...newPatient, medical_conditions: e.target.value })}
                      placeholder="Diabetes, Hypertension"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Insurance Provider</Label>
                      <Input
                        value={newPatient.insurance_provider}
                        onChange={(e) => setNewPatient({ ...newPatient, insurance_provider: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Policy Number</Label>
                      <Input
                        value={newPatient.insurance_policy_number}
                        onChange={(e) => setNewPatient({ ...newPatient, insurance_policy_number: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Emergency Contact Name</Label>
                      <Input
                        value={newPatient.emergency_contact_name}
                        onChange={(e) => setNewPatient({ ...newPatient, emergency_contact_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Emergency Contact Phone</Label>
                      <Input
                        value={newPatient.emergency_contact_phone}
                        onChange={(e) => setNewPatient({ ...newPatient, emergency_contact_phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={newPatient.notes}
                      onChange={(e) => setNewPatient({ ...newPatient, notes: e.target.value })}
                    />
                  </div>

                  <Button onClick={handleCreatePatient} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Patient
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search patients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Allergies</TableHead>
                <TableHead>Insurance</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPatients.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{patient.customers?.full_name}</p>
                        {patient.date_of_birth && (
                          <p className="text-xs text-muted-foreground">
                            DOB: {new Date(patient.date_of_birth).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {patient.customers?.phone && <p>{patient.customers.phone}</p>}
                      {patient.customers?.email && <p className="text-muted-foreground">{patient.customers.email}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {patient.allergies?.length > 0 ? (
                        patient.allergies.slice(0, 2).map((allergy, idx) => (
                          <Badge key={idx} variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {allergy}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">None</span>
                      )}
                      {patient.allergies?.length > 2 && (
                        <Badge variant="outline">+{patient.allergies.length - 2}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {patient.insurance_provider ? (
                      <div className="text-sm">
                        <p>{patient.insurance_provider}</p>
                        <p className="text-muted-foreground">{patient.insurance_policy_number}</p>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">No insurance</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(patient)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPatientToDelete(patient);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => viewPatientDetails(patient)}>
                        View Details
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredPatients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No patients found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Patient Details Dialog */}
      <Dialog open={!!selectedPatient} onOpenChange={() => setSelectedPatient(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {selectedPatient?.customers?.full_name}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="profile">
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="history">
                <History className="h-4 w-4 mr-1" />
                Prescription History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Date of Birth</p>
                  <p className="font-medium">
                    {selectedPatient?.date_of_birth
                      ? new Date(selectedPatient.date_of_birth).toLocaleDateString()
                      : 'Not provided'}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Gender</p>
                  <p className="font-medium capitalize">{selectedPatient?.gender || 'Not provided'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Blood Type</p>
                  <p className="font-medium">{selectedPatient?.blood_type || 'Not provided'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Emergency Contact</p>
                  <p className="font-medium">
                    {selectedPatient?.emergency_contact_name || 'Not provided'}
                    {selectedPatient?.emergency_contact_phone && ` - ${selectedPatient.emergency_contact_phone}`}
                  </p>
                </div>
              </div>

              {selectedPatient?.allergies && selectedPatient.allergies.length > 0 && (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                  <p className="font-medium text-red-800 mb-2">Allergies</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedPatient.allergies.map((allergy, idx) => (
                      <Badge key={idx} variant="destructive">{allergy}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedPatient?.medical_conditions && selectedPatient.medical_conditions.length > 0 && (
                <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                  <p className="font-medium text-yellow-800 mb-2">Medical Conditions</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedPatient.medical_conditions.map((condition, idx) => (
                      <Badge key={idx} variant="secondary">{condition}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedPatient?.insurance_provider && (
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="font-medium text-blue-800 mb-2">Insurance Information</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p><span className="text-muted-foreground">Provider:</span> {selectedPatient.insurance_provider}</p>
                    <p><span className="text-muted-foreground">Policy #:</span> {selectedPatient.insurance_policy_number}</p>
                    {selectedPatient.insurance_expiry && (
                      <p><span className="text-muted-foreground">Expires:</span> {new Date(selectedPatient.insurance_expiry).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history">
              {prescriptionHistory.length > 0 ? (
                <div className="space-y-3">
                  {prescriptionHistory.map((rx) => (
                    <div key={rx.id} className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm">{rx.prescription_number}</span>
                        </div>
                        <Badge>{rx.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(rx.date_written).toLocaleDateString()} - {rx.prescriber_name}
                      </p>
                      <div className="mt-2 space-y-1">
                        {rx.prescription_items?.map((item: any) => (
                          <p key={item.id} className="text-sm">
                            • {item.medication_name} {item.dosage} - Qty: {item.quantity}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No prescription history</p>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Patient Profile</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  value={newPatient.full_name}
                  onChange={(e) => setNewPatient({ ...newPatient, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newPatient.email}
                  onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={newPatient.phone}
                  onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={newPatient.date_of_birth}
                  onChange={(e) => setNewPatient({ ...newPatient, date_of_birth: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={newPatient.gender} onValueChange={(v) => setNewPatient({ ...newPatient, gender: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Blood Type</Label>
                <Select value={newPatient.blood_type} onValueChange={(v) => setNewPatient({ ...newPatient, blood_type: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Allergies (comma-separated)</Label>
              <Input
                value={newPatient.allergies}
                onChange={(e) => setNewPatient({ ...newPatient, allergies: e.target.value })}
                placeholder="Penicillin, Sulfa drugs, Aspirin"
              />
            </div>

            <div className="space-y-2">
              <Label>Medical Conditions (comma-separated)</Label>
              <Input
                value={newPatient.medical_conditions}
                onChange={(e) => setNewPatient({ ...newPatient, medical_conditions: e.target.value })}
                placeholder="Diabetes, Hypertension"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Insurance Provider</Label>
                <Input
                  value={newPatient.insurance_provider}
                  onChange={(e) => setNewPatient({ ...newPatient, insurance_provider: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Policy Number</Label>
                <Input
                  value={newPatient.insurance_policy_number}
                  onChange={(e) => setNewPatient({ ...newPatient, insurance_policy_number: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Group Number</Label>
                <Input
                  value={newPatient.insurance_group_number}
                  onChange={(e) => setNewPatient({ ...newPatient, insurance_group_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Insurance Expiry</Label>
                <Input
                  type="date"
                  value={newPatient.insurance_expiry}
                  onChange={(e) => setNewPatient({ ...newPatient, insurance_expiry: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Emergency Contact Name</Label>
                <Input
                  value={newPatient.emergency_contact_name}
                  onChange={(e) => setNewPatient({ ...newPatient, emergency_contact_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Emergency Contact Phone</Label>
                <Input
                  value={newPatient.emergency_contact_phone}
                  onChange={(e) => setNewPatient({ ...newPatient, emergency_contact_phone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={newPatient.notes}
                onChange={(e) => setNewPatient({ ...newPatient, notes: e.target.value })}
              />
            </div>

            <Button onClick={handleEditSubmit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Patient
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete patient profile for {patientToDelete?.customers?.full_name}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPatientToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PatientProfiles;
