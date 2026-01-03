import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertTriangle, CheckCircle, AlertCircle, XCircle } from "lucide-react";

interface DrugInteractionAlertProps {
  open: boolean;
  onClose: () => void;
  prescriptionId: string;
  patientAllergies: string[];
}

interface InteractionAnalysis {
  interactions: Array<{
    drugs: string[];
    severity: string;
    description: string;
  }>;
  allergyWarnings: string[];
  generalWarnings: string[];
  overallRisk: string;
  recommendations: string;
}

const DrugInteractionAlert = ({ open, onClose, prescriptionId, patientAllergies }: DrugInteractionAlertProps) => {
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<InteractionAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && prescriptionId) {
      checkInteractions();
    }
  }, [open, prescriptionId]);

  const checkInteractions = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get prescription items
      const { data: items, error: itemsError } = await supabase
        .from('prescription_items')
        .select('medication_name, dosage')
        .eq('prescription_id', prescriptionId);

      if (itemsError) throw itemsError;

      const medications = items?.map(item => ({
        name: item.medication_name,
        dosage: item.dosage
      })) || [];

      // Call AI for interaction check
      const { data, error: fnError } = await supabase.functions.invoke('drug-interactions', {
        body: {
          medications,
          patientAllergies
        }
      });

      if (fnError) throw fnError;

      setAnalysis(data);
    } catch (err) {
      console.error('Error checking interactions:', err);
      setError('Failed to check drug interactions. Manual review required.');
    } finally {
      setLoading(false);
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'low':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'medium':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getRiskBadge = (risk: string) => {
    const styles: Record<string, string> = {
      low: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-orange-100 text-orange-800",
      critical: "bg-red-100 text-red-800"
    };
    return <Badge className={styles[risk] || "bg-gray-100"}>{risk.toUpperCase()}</Badge>;
  };

  const getSeverityBadge = (severity: string) => {
    const styles: Record<string, string> = {
      mild: "bg-blue-100 text-blue-800",
      moderate: "bg-yellow-100 text-yellow-800",
      severe: "bg-orange-100 text-orange-800",
      contraindicated: "bg-red-100 text-red-800"
    };
    return <Badge className={styles[severity] || "bg-gray-100"}>{severity}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Drug Interaction Analysis
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Analyzing medications...</span>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Analysis Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : analysis ? (
          <div className="space-y-6">
            {/* Overall Risk */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
              <div className="flex items-center gap-3">
                {getRiskIcon(analysis.overallRisk)}
                <div>
                  <p className="font-medium">Overall Risk Level</p>
                  <p className="text-sm text-muted-foreground">Based on AI analysis</p>
                </div>
              </div>
              {getRiskBadge(analysis.overallRisk)}
            </div>

            {/* Drug Interactions */}
            {analysis.interactions && analysis.interactions.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-red-600">Drug Interactions</h3>
                {analysis.interactions.map((interaction, idx) => (
                  <Alert key={idx} variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle className="flex items-center gap-2">
                      {interaction.drugs?.join(' + ') || 'Interaction'}
                      {getSeverityBadge(interaction.severity)}
                    </AlertTitle>
                    <AlertDescription>{interaction.description}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {/* Allergy Warnings */}
            {analysis.allergyWarnings && analysis.allergyWarnings.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-orange-600">Allergy Warnings</h3>
                {analysis.allergyWarnings.map((warning, idx) => (
                  <Alert key={idx} className="border-orange-200 bg-orange-50">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">{warning}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {/* General Warnings */}
            {analysis.generalWarnings && analysis.generalWarnings.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-yellow-600">General Warnings</h3>
                {analysis.generalWarnings.map((warning, idx) => (
                  <Alert key={idx} className="border-yellow-200 bg-yellow-50">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">{warning}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {analysis.recommendations && (
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-2">Recommendations</h3>
                <p className="text-blue-700 text-sm">{analysis.recommendations}</p>
              </div>
            )}

            {/* No Issues */}
            {(!analysis.interactions || analysis.interactions.length === 0) &&
             (!analysis.allergyWarnings || analysis.allergyWarnings.length === 0) &&
             (!analysis.generalWarnings || analysis.generalWarnings.length === 0) && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">No Issues Detected</AlertTitle>
                <AlertDescription className="text-green-700">
                  No significant drug interactions or allergy concerns were identified.
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : null}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={checkInteractions} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Recheck
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DrugInteractionAlert;
