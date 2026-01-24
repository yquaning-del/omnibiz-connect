import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wrench, AlertTriangle, RefreshCw, Sparkles, Calendar, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MaintenancePrediction {
  location: string;
  category?: string;
  riskLevel: string;
  predictedFailure: string;
  preventiveAction: string;
  estimatedCost?: number;
}

interface MaintenanceData {
  predictions?: MaintenancePrediction[];
  costSavingPotential?: string;
  maintenanceSchedule?: string[];
  seasonalWarnings?: string[];
  insights?: string;
  confidence?: string;
  error?: string;
}

interface MaintenancePredictorPanelProps {
  vertical: 'hotel' | 'property';
}

export function MaintenancePredictorPanel({ vertical }: MaintenancePredictorPanelProps) {
  const { currentOrganization, currentLocation } = useAuth();
  const [data, setData] = useState<MaintenanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPredictions = async () => {
    if (!currentOrganization) return;
    
    setLoading(true);
    setError(null);

    try {
      const { data: response, error: fnError } = await supabase.functions.invoke('ai-maintenance-predictor', {
        body: {
          vertical,
          organizationId: currentOrganization.id,
          locationId: currentLocation?.id,
        },
      });

      if (fnError) throw fnError;
      if (!response.success) throw new Error(response.error);
      
      setData(response.data);
    } catch (err: any) {
      console.error('Maintenance predictor error:', err);
      setError(err.message || 'Failed to fetch predictions');
    } finally {
      setLoading(false);
    }
  };

  const riskColors: Record<string, string> = {
    high: 'bg-destructive/20 text-destructive border-destructive/30',
    medium: 'bg-warning/20 text-warning border-warning/30',
    low: 'bg-success/20 text-success border-success/30',
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
          <Wrench className="w-5 h-5 text-warning" />
          <CardTitle className="text-base">Predictive Maintenance</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchPredictions}
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
            <Wrench className="w-10 h-10 mx-auto mb-3 text-warning/50" />
            <p className="text-sm text-muted-foreground mb-3">Predict equipment issues</p>
            <Button onClick={fetchPredictions} size="sm">
              <Sparkles className="w-4 h-4 mr-2" />
              Analyze Patterns
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Analyzing history...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-6">
            <p className="text-sm text-destructive mb-2">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchPredictions}>
              Retry
            </Button>
          </div>
        )}

        {data && !loading && (
          <div className="space-y-4">
            {/* Cost Saving Potential */}
            {data.costSavingPotential && (
              <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-success" />
                  <span className="text-sm font-medium">Potential Savings</span>
                </div>
                <p className="text-lg font-bold text-success mt-1">{data.costSavingPotential}</p>
              </div>
            )}

            {/* Risk Predictions */}
            {data.predictions && data.predictions.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">Risk Predictions</p>
                {data.predictions.slice(0, 4).map((pred, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{pred.location}</span>
                      <Badge variant="outline" className={cn('text-xs', riskColors[pred.riskLevel])}>
                        {pred.riskLevel}
                      </Badge>
                    </div>
                    {pred.category && (
                      <p className="text-xs text-muted-foreground">{pred.category}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <AlertTriangle className="w-3 h-3" />
                      <span>{pred.predictedFailure}</span>
                    </div>
                    <p className="text-xs text-primary">{pred.preventiveAction}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Scheduled Maintenance */}
            {data.maintenanceSchedule && data.maintenanceSchedule.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Recommended Schedule</p>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {data.maintenanceSchedule.slice(0, 3).map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Seasonal Warnings */}
            {data.seasonalWarnings && data.seasonalWarnings.length > 0 && (
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  <span className="text-sm font-medium">Seasonal Alerts</span>
                </div>
                <ul className="text-sm space-y-1">
                  {data.seasonalWarnings.slice(0, 2).map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Insights */}
            {data.insights && (
              <p className="text-sm text-muted-foreground border-t border-border pt-3">
                {data.insights}
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
