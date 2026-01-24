import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Pill, AlertTriangle, RefreshCw, Sparkles, Users, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PatientAtRisk {
  patientId: string;
  medication: string;
  daysOverdue: number;
  riskLevel: string;
  intervention: string;
}

interface AdherenceData {
  adherenceRate?: number;
  patientsAtRisk?: PatientAtRisk[];
  upcomingRefills?: number;
  interventionRecommendations?: string[];
  adherenceInsights?: string;
  highRiskMedications?: string[];
  successStrategies?: string[];
  confidence?: string;
  error?: string;
}

export function AdherencePanel() {
  const { currentOrganization, currentLocation } = useAuth();
  const [data, setData] = useState<AdherenceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAdherence = async () => {
    if (!currentOrganization) return;
    
    setLoading(true);
    setError(null);

    try {
      const { data: response, error: fnError } = await supabase.functions.invoke('ai-pharmacy-adherence', {
        body: {
          organizationId: currentOrganization.id,
          locationId: currentLocation?.id,
        },
      });

      if (fnError) throw fnError;
      if (!response.success) throw new Error(response.error);
      
      setData(response.data);
    } catch (err: any) {
      console.error('Adherence analysis error:', err);
      setError(err.message || 'Failed to fetch adherence data');
    } finally {
      setLoading(false);
    }
  };

  const riskColors: Record<string, string> = {
    high: 'bg-destructive/20 text-destructive border-destructive/30',
    medium: 'bg-warning/20 text-warning border-warning/30',
    low: 'bg-success/20 text-success border-success/30',
  };

  const getAdherenceColor = (rate: number) => {
    if (rate >= 80) return 'text-success';
    if (rate >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const confidenceColors: Record<string, string> = {
    high: 'text-success',
    medium: 'text-warning',
    low: 'text-muted-foreground',
  };

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Pill className="w-5 h-5 text-pharmacy" />
          <CardTitle className="text-base">Patient Adherence</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchAdherence}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {!data && !loading && !error && (
          <div className="text-center py-6">
            <Pill className="w-10 h-10 mx-auto mb-3 text-pharmacy/50" />
            <p className="text-sm text-muted-foreground mb-3">Track medication adherence</p>
            <Button onClick={fetchAdherence} size="sm">
              <Sparkles className="w-4 h-4 mr-2" />
              Analyze Adherence
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Analyzing patterns...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-6">
            <p className="text-sm text-destructive mb-2">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchAdherence}>
              Retry
            </Button>
          </div>
        )}

        {data && !loading && (
          <div className="space-y-4">
            {/* Overall Adherence Rate */}
            {data.adherenceRate !== undefined && (
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Overall Adherence</span>
                  <span className={cn("text-sm font-bold", getAdherenceColor(data.adherenceRate))}>
                    {data.adherenceRate}%
                  </span>
                </div>
                <Progress 
                  value={data.adherenceRate} 
                  className="h-2"
                />
              </div>
            )}

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-3">
              {data.patientsAtRisk && (
                <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    <span className="text-xs text-muted-foreground">At Risk</span>
                  </div>
                  <p className="text-lg font-bold text-warning">{data.patientsAtRisk.length}</p>
                </div>
              )}
              {data.upcomingRefills !== undefined && (
                <div className="p-3 rounded-lg bg-pharmacy/10 border border-pharmacy/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-pharmacy" />
                    <span className="text-xs text-muted-foreground">Due Refills</span>
                  </div>
                  <p className="text-lg font-bold text-pharmacy">{data.upcomingRefills}</p>
                </div>
              )}
            </div>

            {/* Patients At Risk */}
            {data.patientsAtRisk && data.patientsAtRisk.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Priority Outreach</p>
                {data.patientsAtRisk.slice(0, 4).map((patient, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{patient.medication}</span>
                      <Badge variant="outline" className={cn('text-xs', riskColors[patient.riskLevel])}>
                        {patient.daysOverdue}d overdue
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{patient.intervention}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Intervention Recommendations */}
            {data.interventionRecommendations && data.interventionRecommendations.length > 0 && (
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Recommended Actions</span>
                </div>
                <ul className="text-sm space-y-1">
                  {data.interventionRecommendations.slice(0, 3).map((rec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* High Risk Medications */}
            {data.highRiskMedications && data.highRiskMedications.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Low Adherence Medications</p>
                <div className="flex flex-wrap gap-2">
                  {data.highRiskMedications.slice(0, 4).map((med, i) => (
                    <Badge key={i} variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                      {med}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Insights */}
            {data.adherenceInsights && (
              <p className="text-sm text-muted-foreground border-t border-border pt-3">
                {data.adherenceInsights}
              </p>
            )}

            {/* Confidence */}
            {data.confidence && (
              <p className={cn("text-xs", confidenceColors[data.confidence])}>
                {data.confidence} confidence
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
