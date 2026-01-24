import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Users, Clock, RefreshCw, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DemandData {
  demandLevel?: string;
  predictedCovers?: number;
  predictedRevenue?: number;
  peakHours?: string[];
  staffingRecommendation?: string;
  prepRecommendations?: string[];
  tomorrowOutlook?: string;
  confidence?: string;
  error?: string;
}

interface DemandForecastPanelProps {
  vertical: 'restaurant' | 'hotel';
}

export function DemandForecastPanel({ vertical }: DemandForecastPanelProps) {
  const { currentOrganization, currentLocation } = useAuth();
  const [data, setData] = useState<DemandData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchForecast = async () => {
    if (!currentOrganization) return;
    
    setLoading(true);
    setError(null);

    try {
      const { data: response, error: fnError } = await supabase.functions.invoke('ai-demand-forecast', {
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
      console.error('Demand forecast error:', err);
      setError(err.message || 'Failed to fetch forecast');
    } finally {
      setLoading(false);
    }
  };

  const demandColors: Record<string, string> = {
    high: 'bg-success/20 text-success border-success/30',
    medium: 'bg-warning/20 text-warning border-warning/30',
    low: 'bg-muted text-muted-foreground border-muted',
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
          <TrendingUp className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">Demand Forecast</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchForecast}
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
            <TrendingUp className="w-10 h-10 mx-auto mb-3 text-primary/50" />
            <p className="text-sm text-muted-foreground mb-3">Predict today's demand</p>
            <Button onClick={fetchForecast} size="sm">
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Forecast
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
            <Button variant="outline" size="sm" onClick={fetchForecast}>
              Retry
            </Button>
          </div>
        )}

        {data && !loading && (
          <div className="space-y-4">
            {/* Demand Level */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Expected Demand</span>
              <Badge 
                variant="outline" 
                className={cn('capitalize', demandColors[data.demandLevel || 'medium'])}
              >
                {data.demandLevel || 'Unknown'}
              </Badge>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-3">
              {data.predictedCovers !== undefined && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {vertical === 'restaurant' ? 'Covers' : 'Guests'}
                    </span>
                  </div>
                  <p className="text-lg font-bold">{data.predictedCovers}</p>
                </div>
              )}
              {data.predictedRevenue !== undefined && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Revenue</span>
                  </div>
                  <p className="text-lg font-bold">${data.predictedRevenue?.toLocaleString()}</p>
                </div>
              )}
            </div>

            {/* Peak Hours */}
            {data.peakHours && data.peakHours.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Peak Hours</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.peakHours.map((hour, i) => (
                    <Badge key={i} variant="secondary">{hour}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Staffing Recommendation */}
            {data.staffingRecommendation && (
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm">
                  <strong>Staffing:</strong> {data.staffingRecommendation}
                </p>
              </div>
            )}

            {/* Prep Recommendations */}
            {data.prepRecommendations && data.prepRecommendations.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Prep Tips</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {data.prepRecommendations.slice(0, 3).map((rec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tomorrow Outlook */}
            {data.tomorrowOutlook && (
              <p className="text-xs text-muted-foreground border-t border-border pt-3">
                <strong>Tomorrow:</strong> {data.tomorrowOutlook}
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
