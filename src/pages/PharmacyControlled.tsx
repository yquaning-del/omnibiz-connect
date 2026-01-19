import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import ControlledSubstances from "@/components/pharmacy/ControlledSubstances";
import { FeatureGate } from "@/components/subscription/FeatureGate";

const PharmacyControlled = () => {
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
    <FeatureGate feature="controlled_substances" requiredTier="Professional">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Controlled Substances</h1>
          <p className="text-muted-foreground">Track and log controlled substance transactions</p>
        </div>
        <ControlledSubstances />
      </div>
    </FeatureGate>
  );
};

export default PharmacyControlled;
