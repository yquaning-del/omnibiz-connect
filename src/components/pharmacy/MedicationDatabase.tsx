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
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Pill, AlertTriangle, Loader2, Pencil, Trash2 } from "lucide-react";

interface Medication {
  id: string;
  name: string;
  generic_name: string | null;
  brand_names: string[];
  drug_class: string | null;
  dosage_forms: string[];
  strengths: string[];
  controlled_substance_schedule: string | null;
  requires_prescription: boolean;
  warnings: string[];
  is_active: boolean;
}

const MedicationDatabase = () => {
  const { currentOrganization } = useAuth();
  const { toast } = useToast();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterControlled, setFilterControlled] = useState<string>("all");
  const [editingItem, setEditingItem] = useState<Medication | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [medicationToDelete, setMedicationToDelete] = useState<Medication | null>(null);

  const [newMedication, setNewMedication] = useState({
    name: "",
    generic_name: "",
    brand_names: "",
    drug_class: "",
    dosage_forms: "",
    strengths: "",
    route_of_administration: "",
    controlled_substance_schedule: "",
    requires_prescription: true,
    warnings: "",
    contraindications: "",
    side_effects: "",
    storage_requirements: ""
  });

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchMedications();
    }
  }, [currentOrganization?.id]);

  const fetchMedications = async () => {
    try {
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('organization_id', currentOrganization!.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setMedications((data || []).map((med: any) => ({
        ...med,
        brand_names: med.brand_names ?? [],
        dosage_forms: med.dosage_forms ?? [],
        strengths: med.strengths ?? [],
        warnings: med.warnings ?? [],
      })));
    } catch (error) {
      console.error('Error fetching medications:', error);
      toast({ title: "Error", description: "Failed to load medications", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (medication: Medication) => {
    setEditingItem(medication);
    setNewMedication({
      name: medication.name,
      generic_name: medication.generic_name || "",
      brand_names: medication.brand_names?.join(', ') || "",
      drug_class: medication.drug_class || "",
      dosage_forms: medication.dosage_forms?.join(', ') || "",
      strengths: medication.strengths?.join(', ') || "",
      route_of_administration: (medication as any).route_of_administration || "",
      controlled_substance_schedule: medication.controlled_substance_schedule || "",
      requires_prescription: medication.requires_prescription,
      warnings: medication.warnings?.join(', ') || "",
      contraindications: (medication as any).contraindications || "",
      side_effects: (medication as any).side_effects || "",
      storage_requirements: (medication as any).storage_requirements || ""
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editingItem || !newMedication.name) {
      toast({ title: "Error", description: "Medication name is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('medications')
        .update({
          name: newMedication.name,
          generic_name: newMedication.generic_name || null,
          brand_names: newMedication.brand_names ? newMedication.brand_names.split(',').map(b => b.trim()) : [],
          drug_class: newMedication.drug_class || null,
          dosage_forms: newMedication.dosage_forms ? newMedication.dosage_forms.split(',').map(d => d.trim()) : [],
          strengths: newMedication.strengths ? newMedication.strengths.split(',').map(s => s.trim()) : [],
          route_of_administration: newMedication.route_of_administration || null,
          controlled_substance_schedule: newMedication.controlled_substance_schedule || null,
          requires_prescription: newMedication.requires_prescription,
          warnings: newMedication.warnings ? newMedication.warnings.split(',').map(w => w.trim()) : [],
          contraindications: newMedication.contraindications ? newMedication.contraindications.split(',').map(c => c.trim()) : [],
          side_effects: newMedication.side_effects ? newMedication.side_effects.split(',').map(s => s.trim()) : [],
          storage_requirements: newMedication.storage_requirements || null
        })
        .eq('id', editingItem.id);

      if (error) throw error;

      toast({ title: "Success", description: "Medication updated successfully" });
      setEditDialogOpen(false);
      setEditingItem(null);
      setNewMedication({
        name: "", generic_name: "", brand_names: "", drug_class: "", dosage_forms: "",
        strengths: "", route_of_administration: "", controlled_substance_schedule: "",
        requires_prescription: true, warnings: "", contraindications: "", side_effects: "",
        storage_requirements: ""
      });
      fetchMedications();
    } catch (error) {
      console.error('Error updating medication:', error);
      toast({ title: "Error", description: "Failed to update medication", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!medicationToDelete) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('medications')
        .delete()
        .eq('id', medicationToDelete.id);

      if (error) throw error;

      toast({ title: "Success", description: "Medication deleted successfully" });
      setDeleteDialogOpen(false);
      setMedicationToDelete(null);
      fetchMedications();
    } catch (error) {
      console.error('Error deleting medication:', error);
      toast({ title: "Error", description: "Failed to delete medication", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateMedication = async () => {
    if (!newMedication.name) {
      toast({ title: "Error", description: "Medication name is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('medications')
        .insert({
          organization_id: currentOrganization!.id,
          name: newMedication.name,
          generic_name: newMedication.generic_name || null,
          brand_names: newMedication.brand_names ? newMedication.brand_names.split(',').map(b => b.trim()) : [],
          drug_class: newMedication.drug_class || null,
          dosage_forms: newMedication.dosage_forms ? newMedication.dosage_forms.split(',').map(d => d.trim()) : [],
          strengths: newMedication.strengths ? newMedication.strengths.split(',').map(s => s.trim()) : [],
          route_of_administration: newMedication.route_of_administration || null,
          controlled_substance_schedule: newMedication.controlled_substance_schedule || null,
          requires_prescription: newMedication.requires_prescription,
          warnings: newMedication.warnings ? newMedication.warnings.split(',').map(w => w.trim()) : [],
          contraindications: newMedication.contraindications ? newMedication.contraindications.split(',').map(c => c.trim()) : [],
          side_effects: newMedication.side_effects ? newMedication.side_effects.split(',').map(s => s.trim()) : [],
          storage_requirements: newMedication.storage_requirements || null
        });

      if (error) throw error;

      toast({ title: "Success", description: "Medication added to database" });
      setDialogOpen(false);
      setNewMedication({
        name: "", generic_name: "", brand_names: "", drug_class: "", dosage_forms: "",
        strengths: "", route_of_administration: "", controlled_substance_schedule: "",
        requires_prescription: true, warnings: "", contraindications: "", side_effects: "",
        storage_requirements: ""
      });
      fetchMedications();
    } catch (error) {
      console.error('Error creating medication:', error);
      toast({ title: "Error", description: "Failed to add medication", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const getScheduleBadge = (schedule: string | null) => {
    if (!schedule) return null;
    const colors: Record<string, string> = {
      'Schedule I': 'bg-red-500 text-white',
      'Schedule II': 'bg-red-400 text-white',
      'Schedule III': 'bg-orange-400 text-white',
      'Schedule IV': 'bg-yellow-400 text-black',
      'Schedule V': 'bg-green-400 text-white'
    };
    return <Badge className={colors[schedule] || 'bg-gray-400'}>{schedule}</Badge>;
  };

  const filteredMedications = medications.filter(med => {
    const matchesSearch = 
      med.name.toLowerCase().includes(search.toLowerCase()) ||
      med.generic_name?.toLowerCase().includes(search.toLowerCase()) ||
      med.drug_class?.toLowerCase().includes(search.toLowerCase());
    
    if (filterControlled === "controlled") {
      return matchesSearch && med.controlled_substance_schedule;
    } else if (filterControlled === "non-controlled") {
      return matchesSearch && !med.controlled_substance_schedule;
    }
    return matchesSearch;
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
          <CardTitle>Medication Database</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Medication
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Medication</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Medication Name *</Label>
                    <Input
                      value={newMedication.name}
                      onChange={(e) => setNewMedication({ ...newMedication, name: e.target.value })}
                      placeholder="Amoxicillin"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Generic Name</Label>
                    <Input
                      value={newMedication.generic_name}
                      onChange={(e) => setNewMedication({ ...newMedication, generic_name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Drug Class</Label>
                    <Input
                      value={newMedication.drug_class}
                      onChange={(e) => setNewMedication({ ...newMedication, drug_class: e.target.value })}
                      placeholder="Antibiotic"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Route of Administration</Label>
                    <Select
                      value={newMedication.route_of_administration}
                      onValueChange={(v) => setNewMedication({ ...newMedication, route_of_administration: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="oral">Oral</SelectItem>
                        <SelectItem value="topical">Topical</SelectItem>
                        <SelectItem value="injection">Injection</SelectItem>
                        <SelectItem value="inhalation">Inhalation</SelectItem>
                        <SelectItem value="sublingual">Sublingual</SelectItem>
                        <SelectItem value="rectal">Rectal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Dosage Forms (comma-separated)</Label>
                    <Input
                      value={newMedication.dosage_forms}
                      onChange={(e) => setNewMedication({ ...newMedication, dosage_forms: e.target.value })}
                      placeholder="Tablet, Capsule, Liquid"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Strengths (comma-separated)</Label>
                    <Input
                      value={newMedication.strengths}
                      onChange={(e) => setNewMedication({ ...newMedication, strengths: e.target.value })}
                      placeholder="250mg, 500mg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Controlled Substance Schedule</Label>
                    <Select
                      value={newMedication.controlled_substance_schedule}
                      onValueChange={(v) => setNewMedication({ ...newMedication, controlled_substance_schedule: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Not controlled" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Not Controlled</SelectItem>
                        <SelectItem value="Schedule II">Schedule II</SelectItem>
                        <SelectItem value="Schedule III">Schedule III</SelectItem>
                        <SelectItem value="Schedule IV">Schedule IV</SelectItem>
                        <SelectItem value="Schedule V">Schedule V</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 flex items-center gap-2 pt-6">
                    <Switch
                      checked={newMedication.requires_prescription}
                      onCheckedChange={(v) => setNewMedication({ ...newMedication, requires_prescription: v })}
                    />
                    <Label>Requires Prescription</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Warnings (comma-separated)</Label>
                  <Textarea
                    value={newMedication.warnings}
                    onChange={(e) => setNewMedication({ ...newMedication, warnings: e.target.value })}
                    placeholder="May cause drowsiness, Avoid alcohol"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Storage Requirements</Label>
                  <Input
                    value={newMedication.storage_requirements}
                    onChange={(e) => setNewMedication({ ...newMedication, storage_requirements: e.target.value })}
                    placeholder="Store at room temperature, protect from light"
                  />
                </div>

                <Button onClick={handleCreateMedication} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Medication
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
              placeholder="Search medications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterControlled} onValueChange={setFilterControlled}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Medications</SelectItem>
              <SelectItem value="controlled">Controlled Only</SelectItem>
              <SelectItem value="non-controlled">Non-Controlled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Medication</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Forms/Strengths</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Warnings</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMedications.map((med) => (
              <TableRow key={med.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Pill className="h-4 w-4 text-primary" />
                    <div>
                      <p className="font-medium">{med.name}</p>
                      {med.generic_name && (
                        <p className="text-xs text-muted-foreground">({med.generic_name})</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{med.drug_class || '-'}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {med.dosage_forms?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {med.dosage_forms.map((form, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">{form}</Badge>
                        ))}
                      </div>
                    )}
                    {med.strengths?.length > 0 && (
                      <p className="text-xs text-muted-foreground">{med.strengths.join(', ')}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {med.controlled_substance_schedule ? (
                    getScheduleBadge(med.controlled_substance_schedule)
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {med.warnings?.length > 0 ? (
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span className="text-xs">{med.warnings.length} warning(s)</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(med)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setMedicationToDelete(med);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredMedications.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No medications found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Medication</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Medication Name *</Label>
                  <Input
                    value={newMedication.name}
                    onChange={(e) => setNewMedication({ ...newMedication, name: e.target.value })}
                    placeholder="Amoxicillin"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Generic Name</Label>
                  <Input
                    value={newMedication.generic_name}
                    onChange={(e) => setNewMedication({ ...newMedication, generic_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Drug Class</Label>
                  <Input
                    value={newMedication.drug_class}
                    onChange={(e) => setNewMedication({ ...newMedication, drug_class: e.target.value })}
                    placeholder="Antibiotic"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Route of Administration</Label>
                  <Select
                    value={newMedication.route_of_administration}
                    onValueChange={(v) => setNewMedication({ ...newMedication, route_of_administration: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oral">Oral</SelectItem>
                      <SelectItem value="topical">Topical</SelectItem>
                      <SelectItem value="injection">Injection</SelectItem>
                      <SelectItem value="inhalation">Inhalation</SelectItem>
                      <SelectItem value="sublingual">Sublingual</SelectItem>
                      <SelectItem value="rectal">Rectal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Dosage Forms (comma-separated)</Label>
                  <Input
                    value={newMedication.dosage_forms}
                    onChange={(e) => setNewMedication({ ...newMedication, dosage_forms: e.target.value })}
                    placeholder="Tablet, Capsule, Liquid"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Strengths (comma-separated)</Label>
                  <Input
                    value={newMedication.strengths}
                    onChange={(e) => setNewMedication({ ...newMedication, strengths: e.target.value })}
                    placeholder="250mg, 500mg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Controlled Substance Schedule</Label>
                  <Select
                    value={newMedication.controlled_substance_schedule}
                    onValueChange={(v) => setNewMedication({ ...newMedication, controlled_substance_schedule: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Not controlled" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Not Controlled</SelectItem>
                      <SelectItem value="Schedule II">Schedule II</SelectItem>
                      <SelectItem value="Schedule III">Schedule III</SelectItem>
                      <SelectItem value="Schedule IV">Schedule IV</SelectItem>
                      <SelectItem value="Schedule V">Schedule V</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex items-center gap-2 pt-6">
                  <Switch
                    checked={newMedication.requires_prescription}
                    onCheckedChange={(v) => setNewMedication({ ...newMedication, requires_prescription: v })}
                  />
                  <Label>Requires Prescription</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Warnings (comma-separated)</Label>
                <Textarea
                  value={newMedication.warnings}
                  onChange={(e) => setNewMedication({ ...newMedication, warnings: e.target.value })}
                  placeholder="May cause drowsiness, Avoid alcohol"
                />
              </div>

              <div className="space-y-2">
                <Label>Storage Requirements</Label>
                <Input
                  value={newMedication.storage_requirements}
                  onChange={(e) => setNewMedication({ ...newMedication, storage_requirements: e.target.value })}
                  placeholder="Store at room temperature, protect from light"
                />
              </div>

              <Button onClick={handleEditSubmit} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update Medication
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
                This will permanently delete medication {medicationToDelete?.name}. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setMedicationToDelete(null)}>Cancel</AlertDialogCancel>
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

export default MedicationDatabase;
