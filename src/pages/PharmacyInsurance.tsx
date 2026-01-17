import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import InsuranceBilling from "@/components/pharmacy/InsuranceBilling";

const PharmacyInsurance = () => {
  const { currentOrganization } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentOrganization?.id) {
      setLoading(false);
    }
  }, [currentOrganization?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Insurance & Billing</h1>
        <p className="text-muted-foreground">Manage insurance claims and billing</p>
      </div>
      <InsuranceBilling />
    </div>
  );
};

export default PharmacyInsurance;
