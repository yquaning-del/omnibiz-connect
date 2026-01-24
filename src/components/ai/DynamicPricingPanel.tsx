import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, DollarSign, TrendingUp, RefreshCw, Sparkles, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PricingRecommendation {
  roomType?: string;
  unitType?: string;
  currentRate: number;
  suggestedRate: number;
  changePercent: number;
  reason: string;
}

interface PricingData {
  recommendations?: PricingRecommendation[];
  overallStrategy?: string;
  demandOutlook?: string;
  urgentActions?: string[];
  confidence?: string;
  error?: string;
}

interface DynamicPricingPanelProps {
  vertical: 'hotel' | 'property';
}

export function DynamicPricingPanel({ vertical }: DynamicPricingPanelProps) {
  const { currentOrganization, currentLocation } = useAuth();
  const [data, setData] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPricing = async () => {
    if (!currentOrganization) return;
    
    setLoading(true);
    setError(null);

    try {
      const { data: response, error: fnError } = await supabase.functions.invoke('ai-dynamic-pricing', {
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
      console.error('Dynamic pricing error:', err);
      setError(err.message || 'Failed to fetch pricing');
    } finally {
      setLoading(false);
    }
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
          <DollarSign className="w-5 h-5 text-success" />
          <CardTitle className="text-base">Dynamic Pricing</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchPricing}
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
            <DollarSign className="w-10 h-10 mx-auto mb-3 text-success/50" />
            <p className="text-sm text-muted-foreground mb-3">Optimize your rates</p>
            <Button onClick={fetchPricing} size="sm">
              <Sparkles className="w-4 h-4 mr-2" />
              Get Recommendations
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Analyzing market...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-6">
            <p className="text-sm text-destructive mb-2">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchPricing}>
              Retry
            </Button>
          </div>
        )}

        {data && !loading && (
          <div className="space-y-4">
            {/* Overall Strategy */}
            {data.overallStrategy && (
              <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-success" />
                  <span className="text-sm font-medium">Strategy</span>
                </div>
                <p className="text-sm text-foreground">{data.overallStrategy}</p>
              </div>
            )}

            {/* Rate Recommendations */}
            {data.recommendations && data.recommendations.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">Rate Recommendations</p>
                {data.recommendations.map((rec, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{rec.roomType || rec.unitType}</span>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          rec.changePercent > 0 
                            ? 'bg-success/20 text-success border-success/30' 
                            : rec.changePercent < 0 
                              ? 'bg-destructive/20 text-destructive border-destructive/30'
                              : 'bg-muted'
                        )}
                      >
                        {rec.changePercent > 0 ? <ArrowUp className="w-3 h-3 mr-1" /> : rec.changePercent < 0 ? <ArrowDown className="w-3 h-3 mr-1" /> : null}
                        {Math.abs(rec.changePercent)}%
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground">
                        ${rec.currentRate.toFixed(0)}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-bold text-success">
                        ${rec.suggestedRate.toFixed(0)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{rec.reason}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Demand Outlook */}
            {data.demandOutlook && (
              <p className="text-sm text-muted-foreground">
                <strong>Outlook:</strong> {data.demandOutlook}
              </p>
            )}

            {/* Urgent Actions */}
            {data.urgentActions && data.urgentActions.length > 0 && (
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                <p className="text-sm font-medium text-warning mb-1">Action Required</p>
                <ul className="text-sm space-y-1">
                  {data.urgentActions.map((action, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-warning">•</span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
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
