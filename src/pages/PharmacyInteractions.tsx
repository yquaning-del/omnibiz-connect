import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Search, Shield, Info, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FeatureGate } from "@/components/subscription/FeatureGate";

interface Medication {
  id: string;
  name: string;
  generic_name: string | null;
  drug_class: string | null;
}

interface InteractionResult {
  medications: string[];
  interactions: Array<{
    drug1: string;
    drug2: string;
    severity: string;
    description: string;
    recommendation: string;
  }>;
  overallRisk: string;
}

const PharmacyInteractions = () => {
  const { currentOrganization } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedMedications, setSelectedMedications] = useState<Medication[]>([]);
  const [searchResults, setSearchResults] = useState<Medication[]>([]);
  const [searching, setSearching] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<InteractionResult | null>(null);

  const searchMedications = async (query: string) => {
    if (!query.trim() || !currentOrganization?.id) return;
    
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('medications')
        .select('id, name, generic_name, drug_class')
        .eq('organization_id', currentOrganization.id)
        .or(`name.ilike.%${query}%,generic_name.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching medications:', error);
    } finally {
      setSearching(false);
    }
  };

  const addMedication = (med: Medication) => {
    if (!selectedMedications.find(m => m.id === med.id)) {
      setSelectedMedications([...selectedMedications, med]);
    }
    setSearch("");
    setSearchResults([]);
  };

  const removeMedication = (id: string) => {
    setSelectedMedications(selectedMedications.filter(m => m.id !== id));
    setResult(null);
  };

  const checkInteractions = async () => {
    if (selectedMedications.length < 2) return;
    
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('drug-interactions', {
        body: {
          medications: selectedMedications.map(m => ({
            name: m.name,
            genericName: m.generic_name,
            drugClass: m.drug_class
          }))
        }
      });

      if (error) throw error;
      setResult(data);
    } catch (error) {
      console.error('Error checking interactions:', error);
    } finally {
      setChecking(false);
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk?.toLowerCase()) {
      case 'high':
        return <Badge variant="destructive">High Risk</Badge>;
      case 'moderate':
        return <Badge className="bg-yellow-500">Moderate Risk</Badge>;
      case 'low':
        return <Badge className="bg-green-500">Low Risk</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'severe':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'moderate':
        return <Info className="h-5 w-5 text-yellow-500" />;
      default:
        return <Shield className="h-5 w-5 text-green-500" />;
    }
  };

  return (
    <FeatureGate feature="drug_interactions" requiredTier="Professional">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Drug Interactions</h1>
          <p className="text-muted-foreground">Check for potential drug interactions between medications</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
        {/* Medication Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Medications</CardTitle>
            <CardDescription>Add medications to check for interactions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search medications..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  searchMedications(e.target.value);
                }}
                className="pl-10"
              />
            </div>

            {searching && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="border rounded-lg divide-y max-h-48 overflow-auto">
                {searchResults.map((med) => (
                  <button
                    key={med.id}
                    onClick={() => addMedication(med)}
                    className="w-full p-3 text-left hover:bg-muted transition-colors"
                  >
                    <p className="font-medium">{med.name}</p>
                    {med.generic_name && (
                      <p className="text-sm text-muted-foreground">{med.generic_name}</p>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">Selected Medications ({selectedMedications.length})</p>
              {selectedMedications.length === 0 ? (
                <p className="text-sm text-muted-foreground">No medications selected</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedMedications.map((med) => (
                    <Badge
                      key={med.id}
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => removeMedication(med.id)}
                    >
                      {med.name} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Button
              onClick={checkInteractions}
              disabled={selectedMedications.length < 2 || checking}
              className="w-full"
            >
              {checking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Check Interactions
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle>Interaction Results</CardTitle>
            <CardDescription>Potential drug interactions detected</CardDescription>
          </CardHeader>
          <CardContent>
            {!result ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select at least 2 medications and click "Check Interactions"</p>
              </div>
            ) : result.interactions.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p className="font-medium text-green-600">No Interactions Found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  The selected medications appear to be safe to use together
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Overall Risk Level:</span>
                  {getRiskBadge(result.overallRisk)}
                </div>

                <div className="space-y-3">
                  {result.interactions.map((interaction, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-start gap-3">
                        {getSeverityIcon(interaction.severity)}
                        <div className="flex-1">
                          <p className="font-medium">
                            {interaction.drug1} + {interaction.drug2}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {interaction.description}
                          </p>
                          {interaction.recommendation && (
                            <p className="text-sm text-primary mt-2">
                              <strong>Recommendation:</strong> {interaction.recommendation}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FeatureGate>
  );
};

export default PharmacyInteractions;
