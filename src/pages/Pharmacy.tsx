import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Pill, Users, FileText, AlertTriangle, DollarSign, ClipboardList, RefreshCcw } from "lucide-react";
import PrescriptionManagement from "@/components/pharmacy/PrescriptionManagement";
import PatientProfiles from "@/components/pharmacy/PatientProfiles";
import MedicationDatabase from "@/components/pharmacy/MedicationDatabase";
import InsuranceBilling from "@/components/pharmacy/InsuranceBilling";
import ControlledSubstances from "@/components/pharmacy/ControlledSubstances";
import { RefillRequestForm, RefillRequestsManager } from "@/components/pharmacy/RefillRequestForm";
import { supabase } from "@/integrations/supabase/client";

const Pharmacy = () => {
  const { currentOrganization, currentLocation } = useAuth();
  const [stats, setStats] = useState({
    pendingPrescriptions: 0,
    readyForPickup: 0,
    totalPatients: 0,
    lowStockMeds: 0,
    pendingClaims: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchStats();
    }
  }, [currentOrganization?.id, currentLocation?.id]);

  const fetchStats = async () => {
    try {
      const [prescriptions, patients, claims] = await Promise.all([
        supabase
          .from('prescriptions')
          .select('status')
          .eq('organization_id', currentOrganization!.id),
        supabase
          .from('patient_profiles')
          .select('id')
          .eq('organization_id', currentOrganization!.id),
        supabase
          .from('insurance_claims')
          .select('status')
          .eq('organization_id', currentOrganization!.id)
      ]);

      const pending = prescriptions.data?.filter(p => p.status === 'pending' || p.status === 'processing').length || 0;
      const ready = prescriptions.data?.filter(p => p.status === 'ready').length || 0;
      const pendingClaims = claims.data?.filter(c => c.status === 'pending' || c.status === 'submitted').length || 0;

      setStats({
        pendingPrescriptions: pending,
        readyForPickup: ready,
        totalPatients: patients.data?.length || 0,
        lowStockMeds: 0,
        pendingClaims
      });
    } catch (error) {
      console.error('Error fetching pharmacy stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pharmacy Management</h1>
          <p className="text-muted-foreground">Prescription management, patient profiles, and compliance tracking</p>
        </div>
        <RefillRequestForm onSuccess={fetchStats} />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Rx</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingPrescriptions}</div>
            <p className="text-xs text-muted-foreground">Awaiting processing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready for Pickup</CardTitle>
            <ClipboardList className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.readyForPickup}</div>
            <p className="text-xs text-muted-foreground">Ready to dispense</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPatients}</div>
            <p className="text-xs text-muted-foreground">Registered patients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.lowStockMeds}</div>
            <p className="text-xs text-muted-foreground">Medications low</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Claims</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingClaims}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="prescriptions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="prescriptions" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Prescriptions
          </TabsTrigger>
          <TabsTrigger value="refills" className="flex items-center gap-2">
            <RefreshCcw className="h-4 w-4" />
            Refills
          </TabsTrigger>
          <TabsTrigger value="patients" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Patients
          </TabsTrigger>
          <TabsTrigger value="medications" className="flex items-center gap-2">
            <Pill className="h-4 w-4" />
            Medications
          </TabsTrigger>
          <TabsTrigger value="insurance" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Insurance
          </TabsTrigger>
          <TabsTrigger value="controlled" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Controlled
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prescriptions">
          <PrescriptionManagement onRefresh={fetchStats} />
        </TabsContent>

        <TabsContent value="refills">
          <RefillRequestsManager />
        </TabsContent>

        <TabsContent value="patients">
          <PatientProfiles />
        </TabsContent>

        <TabsContent value="medications">
          <MedicationDatabase />
        </TabsContent>

        <TabsContent value="insurance">
          <InsuranceBilling />
        </TabsContent>

        <TabsContent value="controlled">
          <ControlledSubstances />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Pharmacy;
