import { useState, useEffect, useRef } from "react";
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
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, AlertTriangle, CheckCircle, Clock, Loader2, Pencil, Trash2 } from "lucide-react";
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
  const [editingItem, setEditingItem] = useState<Prescription | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [prescriptionToDelete, setPrescriptionToDelete] = useState<Prescription | null>(null);

  // Patient autocomplete state
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [patientResults, setPatientResults] = useState<Array<{ id: string; full_name: string; phone: string | null }>>([]);
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);
  const [selectedPatientName, setSelectedPatientName] = useState("");
  const patientSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const patientInputRef = useRef<HTMLInputElement>(null);
  const patientDropdownRef = useRef<HTMLDivElement>(null);

  // Medication autocomplete state
  const [medicationSearchTerm, setMedicationSearchTerm] = useState("");
  const [medicationResults, setMedicationResults] = useState<Array<{ id: string; name: string; generic_name: string | null; brand_names: string[]; strengths: string[] }>>([]);
  const [medicationDropdownOpen, setMedicationDropdownOpen] = useState(false);
  const medicationSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const medicationInputRef = useRef<HTMLInputElement>(null);
  const medicationDropdownRef = useRef<HTMLDivElement>(null);

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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (patientInputRef.current && patientDropdownRef.current && 
          !patientInputRef.current.contains(event.target as Node) &&
          !patientDropdownRef.current.contains(event.target as Node)) {
        setPatientDropdownOpen(false);
      }
      if (medicationInputRef.current && medicationDropdownRef.current &&
          !medicationInputRef.current.contains(event.target as Node) &&
          !medicationDropdownRef.current.contains(event.target as Node)) {
        setMedicationDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset autocomplete states when dialogs close
  useEffect(() => {
    if (!dialogOpen && !editDialogOpen) {
      setPatientSearchTerm("");
      setPatientResults([]);
      setPatientDropdownOpen(false);
      setSelectedPatientName("");
      setMedicationSearchTerm("");
      setMedicationResults([]);
      setMedicationDropdownOpen(false);
    }
  }, [dialogOpen, editDialogOpen]);

  // Search patients
  const searchPatients = async (query: string) => {
    if (!query.trim() || !currentOrganization?.id) {
      setPatientResults([]);
      return;
    }

    try {
      // First search customers by name or phone
      const { data: customers, error: customerError } = await supabase
        .from('customers')
        .select('id, full_name, phone')
        .eq('organization_id', currentOrganization.id)
        .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(10);

      if (customerError) throw customerError;
      if (!customers || customers.length === 0) {
        setPatientResults([]);
        return;
      }

      // Then get patient_profiles for these customers
      const customerIds = customers.map(c => c.id);
      const { data: patients, error: patientError } = await supabase
        .from('patient_profiles')
        .select('id, customer_id')
        .eq('organization_id', currentOrganization.id)
        .in('customer_id', customerIds);

      if (patientError) throw patientError;

      // Map results combining patient and customer data
      const results = (patients || [])
        .map((patient: any) => {
          const customer = customers.find(c => c.id === patient.customer_id);
          if (!customer) return null;
          return {
            id: patient.id,
            full_name: customer.full_name,
            phone: customer.phone
          };
        })
        .filter((p): p is { id: string; full_name: string; phone: string | null } => p !== null);
      
      setPatientResults(results);
    } catch (error) {
      console.error('Error searching patients:', error);
      setPatientResults([]);
    }
  };

  // Search medications
  const searchMedications = async (query: string) => {
    if (!query.trim() || !currentOrganization?.id) {
      setMedicationResults([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('medications')
        .select('id, name, generic_name, brand_names, strengths')
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true)
        .or(`name.ilike.%${query}%,generic_name.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      
      setMedicationResults((data || []).map((med: any) => ({
        id: med.id,
        name: med.name,
        generic_name: med.generic_name,
        brand_names: med.brand_names || [],
        strengths: med.strengths || []
      })));
    } catch (error) {
      console.error('Error searching medications:', error);
      setMedicationResults([]);
    }
  };

  // Handle patient search with debouncing
  useEffect(() => {
    if (patientSearchTimeoutRef.current) {
      clearTimeout(patientSearchTimeoutRef.current);
    }

    patientSearchTimeoutRef.current = setTimeout(() => {
      searchPatients(patientSearchTerm);
    }, 300);

    return () => {
      if (patientSearchTimeoutRef.current) {
        clearTimeout(patientSearchTimeoutRef.current);
      }
    };
  }, [patientSearchTerm, currentOrganization?.id]);

  // Handle medication search with debouncing
  useEffect(() => {
    if (medicationSearchTimeoutRef.current) {
      clearTimeout(medicationSearchTimeoutRef.current);
    }

    medicationSearchTimeoutRef.current = setTimeout(() => {
      searchMedications(medicationSearchTerm);
    }, 300);

    return () => {
      if (medicationSearchTimeoutRef.current) {
        clearTimeout(medicationSearchTimeoutRef.current);
      }
    };
  }, [medicationSearchTerm, currentOrganization?.id]);

  const handlePatientSelect = (patient: { id: string; full_name: string; phone: string | null }) => {
    setNewPrescription({ ...newPrescription, patient_id: patient.id });
    setSelectedPatientName(patient.full_name);
    setPatientSearchTerm("");
    setPatientResults([]);
    setPatientDropdownOpen(false);
  };

  const handleMedicationSelect = (medication: { id: string; name: string; generic_name: string | null; brand_names: string[]; strengths: string[] }) => {
    setNewPrescription({ 
      ...newPrescription, 
      medication_name: medication.name,
      dosage: medication.strengths.length > 0 ? medication.strengths[0] : ""
    });
    setMedicationSearchTerm(medication.name);
    setMedicationResults([]);
    setMedicationDropdownOpen(false);
  };

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
          ),
          prescription_items (*)
        `)
        .eq('organization_id', currentOrganization!.id)
        .order('created_at', { ascending: false });

      if (currentLocation?.id) {
        query.eq('location_id', currentLocation.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPrescriptions((data || []).map((rx: any) => ({
        ...rx,
        refills_remaining: rx.refills_remaining ?? 0,
        is_controlled_substance: rx.is_controlled_substance ?? false,
        patient_profiles: rx.patient_profiles
          ? {
              ...rx.patient_profiles,
              allergies: rx.patient_profiles.allergies ?? [],
              customers: rx.patient_profiles.customers ?? undefined,
            }
          : undefined,
      })));
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

    if (!currentLocation) {
      toast({ title: "Error", description: "No location selected. Please select a location first.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // First create the prescription
      const { data: prescription, error: rxError } = await supabase
        .from('prescriptions')
        .insert({
          organization_id: currentOrganization!.id,
          location_id: currentLocation.id,
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

  const handleEdit = async (prescription: Prescription) => {
    // Fetch prescription items
    const { data: items } = await supabase
      .from('prescription_items')
      .select('*')
      .eq('prescription_id', prescription.id)
      .limit(1)
      .single();

    // Fetch patient name if patient_id exists
    let patientName = "";
    if (prescription.patient_id) {
      const { data: patientData } = await supabase
        .from('patient_profiles')
        .select(`
          id,
          customers (
            full_name
          )
        `)
        .eq('id', prescription.patient_id)
        .single();
      
      if (patientData?.customers) {
        patientName = (patientData.customers as any).full_name;
      }
    }

    setEditingItem(prescription);
    setSelectedPatientName(patientName);
    setPatientSearchTerm(patientName);
    setMedicationSearchTerm(items?.medication_name || "");
    setNewPrescription({
      patient_id: prescription.patient_id || "",
      prescriber_name: prescription.prescriber_name,
      prescriber_license: (prescription as any).prescriber_license || "",
      prescriber_phone: (prescription as any).prescriber_phone || "",
      medication_name: items?.medication_name || "",
      dosage: items?.dosage || "",
      quantity: items?.quantity || 30,
      directions: items?.directions || "",
      refills_authorized: prescription.refills_authorized || 0,
      is_controlled_substance: prescription.is_controlled_substance,
      notes: prescription.notes || ""
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editingItem || !newPrescription.prescriber_name || !newPrescription.medication_name) {
      toast({ title: "Error", description: "Please fill in required fields", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Update prescription
      const { error: rxError } = await supabase
        .from('prescriptions')
        .update({
          patient_id: newPrescription.patient_id || null,
          prescriber_name: newPrescription.prescriber_name,
          prescriber_license: newPrescription.prescriber_license,
          prescriber_phone: newPrescription.prescriber_phone,
          refills_authorized: newPrescription.refills_authorized,
          refills_remaining: newPrescription.refills_authorized,
          is_controlled_substance: newPrescription.is_controlled_substance,
          notes: newPrescription.notes
        })
        .eq('id', editingItem.id);

      if (rxError) throw rxError;

      // Update or create prescription item
      const { data: existingItem } = await supabase
        .from('prescription_items')
        .select('id')
        .eq('prescription_id', editingItem.id)
        .limit(1)
        .single();

      if (existingItem) {
        const { error: itemError } = await supabase
          .from('prescription_items')
          .update({
            medication_name: newPrescription.medication_name,
            dosage: newPrescription.dosage,
            quantity: newPrescription.quantity,
            directions: newPrescription.directions
          })
          .eq('id', existingItem.id);

        if (itemError) throw itemError;
      } else {
        const { error: itemError } = await supabase
          .from('prescription_items')
          .insert({
            prescription_id: editingItem.id,
            medication_name: newPrescription.medication_name,
            dosage: newPrescription.dosage,
            quantity: newPrescription.quantity,
            directions: newPrescription.directions
          });

        if (itemError) throw itemError;
      }

      toast({ title: "Success", description: "Prescription updated successfully" });
      setEditDialogOpen(false);
      setEditingItem(null);
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
      console.error('Error updating prescription:', error);
      toast({ title: "Error", description: "Failed to update prescription", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!prescriptionToDelete) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('prescriptions')
        .delete()
        .eq('id', prescriptionToDelete.id);

      if (error) throw error;

      toast({ title: "Success", description: "Prescription deleted successfully" });
      setDeleteDialogOpen(false);
      setPrescriptionToDelete(null);
      fetchPrescriptions();
      onRefresh();
    } catch (error) {
      console.error('Error deleting prescription:', error);
      toast({ title: "Error", description: "Failed to delete prescription", variant: "destructive" });
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
                <div className="space-y-2">
                  <Label>Patient</Label>
                  <div className="relative" ref={patientInputRef}>
                    <Input
                      value={patientSearchTerm}
                      onChange={(e) => {
                        setPatientSearchTerm(e.target.value);
                        setPatientDropdownOpen(true);
                        if (!e.target.value) {
                          setNewPrescription({ ...newPrescription, patient_id: "" });
                          setSelectedPatientName("");
                        }
                      }}
                      onFocus={() => {
                        if (patientResults.length > 0) {
                          setPatientDropdownOpen(true);
                        }
                      }}
                      placeholder="Search by name or phone..."
                    />
                    {patientDropdownOpen && patientResults.length > 0 && (
                      <div
                        ref={patientDropdownRef}
                        className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
                      >
                        {patientResults.map((patient) => (
                          <div
                            key={patient.id}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => handlePatientSelect(patient)}
                          >
                            <div className="font-medium">{patient.full_name}</div>
                            {patient.phone && (
                              <div className="text-sm text-gray-500">{patient.phone}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

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
                    <div className="relative" ref={medicationInputRef}>
                      <Input
                        value={medicationSearchTerm || newPrescription.medication_name}
                        onChange={(e) => {
                          setMedicationSearchTerm(e.target.value);
                          setMedicationDropdownOpen(true);
                          if (!e.target.value) {
                            setNewPrescription({ ...newPrescription, medication_name: "" });
                          }
                        }}
                        onFocus={() => {
                          if (medicationResults.length > 0) {
                            setMedicationDropdownOpen(true);
                          }
                        }}
                        placeholder="Search medication..."
                      />
                      {medicationDropdownOpen && medicationResults.length > 0 && (
                        <div
                          ref={medicationDropdownRef}
                          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
                        >
                          {medicationResults.map((medication) => (
                            <div
                              key={medication.id}
                              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                              onClick={() => handleMedicationSelect(medication)}
                            >
                              <div className="font-medium">{medication.name}</div>
                              {medication.generic_name && (
                                <div className="text-sm text-gray-500">Generic: {medication.generic_name}</div>
                              )}
                              {medication.strengths.length > 0 && (
                                <div className="text-sm text-gray-500">Strengths: {medication.strengths.join(", ")}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(rx)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setPrescriptionToDelete(rx);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Prescription</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Patient</Label>
                <div className="relative" ref={patientInputRef}>
                  <Input
                    value={patientSearchTerm}
                    onChange={(e) => {
                      setPatientSearchTerm(e.target.value);
                      setPatientDropdownOpen(true);
                      if (!e.target.value) {
                        setNewPrescription({ ...newPrescription, patient_id: "" });
                        setSelectedPatientName("");
                      }
                    }}
                    onFocus={() => {
                      if (patientResults.length > 0) {
                        setPatientDropdownOpen(true);
                      }
                    }}
                    placeholder="Search by name or phone..."
                  />
                  {patientDropdownOpen && patientResults.length > 0 && (
                    <div
                      ref={patientDropdownRef}
                      className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
                    >
                      {patientResults.map((patient) => (
                        <div
                          key={patient.id}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => handlePatientSelect(patient)}
                        >
                          <div className="font-medium">{patient.full_name}</div>
                          {patient.phone && (
                            <div className="text-sm text-gray-500">{patient.phone}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

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

              <div className="space-y-2">
                <Label>Prescriber Phone</Label>
                <Input
                  value={newPrescription.prescriber_phone}
                  onChange={(e) => setNewPrescription({ ...newPrescription, prescriber_phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Medication Name *</Label>
                  <div className="relative" ref={medicationInputRef}>
                    <Input
                      value={medicationSearchTerm || newPrescription.medication_name}
                      onChange={(e) => {
                        const value = e.target.value;
                        setMedicationSearchTerm(value);
                        setNewPrescription({ ...newPrescription, medication_name: value });
                        setMedicationDropdownOpen(true);
                      }}
                      onFocus={() => {
                        if (medicationResults.length > 0) {
                          setMedicationDropdownOpen(true);
                        }
                      }}
                      placeholder="Search medication..."
                    />
                    {medicationDropdownOpen && medicationResults.length > 0 && (
                      <div
                        ref={medicationDropdownRef}
                        className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
                      >
                        {medicationResults.map((medication) => (
                          <div
                            key={medication.id}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => handleMedicationSelect(medication)}
                          >
                            <div className="font-medium">{medication.name}</div>
                            {medication.generic_name && (
                              <div className="text-sm text-gray-500">Generic: {medication.generic_name}</div>
                            )}
                            {medication.strengths.length > 0 && (
                              <div className="text-sm text-gray-500">Strengths: {medication.strengths.join(", ")}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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

              <Button onClick={handleEditSubmit} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update Prescription
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
                This will permanently delete prescription {prescriptionToDelete?.prescription_number}. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPrescriptionToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default PrescriptionManagement;
