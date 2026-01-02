import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, TrendingUp, Package, MessageSquare, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ForecastData {
  trend?: string;
  forecast?: { date: string; predicted: number }[];
  recommendation?: string;
  confidence?: string;
  critical?: { name: string; current: number; action: string }[];
  warnings?: { name: string; daysUntilStockout: number }[];
  recommendations?: string[];
  text?: string;
}

interface AIInsightsPanelProps {
  type: 'sales_forecast' | 'inventory_forecast' | 'daily_summary';
  title: string;
  icon?: React.ReactNode;
}

export function AIInsightsPanel({ type, title, icon }: AIInsightsPanelProps) {
  const { currentOrganization } = useAuth();
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    if (!currentOrganization) return;
    
    setLoading(true);
    setError(null);

    try {
      const { data: response, error: fnError } = await supabase.functions.invoke('ai-insights', {
        body: {
          type,
          organizationId: currentOrganization.id,
        },
      });

      if (fnError) throw fnError;
      if (!response.success) throw new Error(response.error);
      
      setData(response.data);
    } catch (err: any) {
      console.error('AI Insights error:', err);
      setError(err.message || 'Failed to fetch insights');
    } finally {
      setLoading(false);
    }
  };

  const confidenceColors: Record<string, string> = {
    high: 'bg-success/20 text-success',
    medium: 'bg-warning/20 text-warning',
    low: 'bg-muted text-muted-foreground',
  };

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          {icon || <Sparkles className="w-5 h-5 text-primary" />}
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchInsights}
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
            <Sparkles className="w-10 h-10 mx-auto mb-3 text-primary/50" />
            <p className="text-sm text-muted-foreground mb-3">Get AI-powered insights</p>
            <Button onClick={fetchInsights} size="sm">
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Insights
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Analyzing data...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-6">
            <p className="text-sm text-destructive mb-2">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchInsights}>
              Retry
            </Button>
          </div>
        )}

        {data && !loading && (
          <div className="space-y-4">
            {/* Sales Forecast */}
            {data.trend && (
              <>
                <div className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-foreground">{data.trend}</p>
                </div>
                
                {data.confidence && (
                  <Badge className={cn('text-xs', confidenceColors[data.confidence])}>
                    {data.confidence} confidence
                  </Badge>
                )}

                {data.forecast && data.forecast.length > 0 && (
                  <div className="grid grid-cols-7 gap-1 mt-3">
                    {data.forecast.slice(0, 7).map((f, i) => (
                      <div key={i} className="text-center">
                        <p className="text-xs text-muted-foreground">
                          {new Date(f.date).toLocaleDateString('en-US', { weekday: 'short' })}
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          ${f.predicted?.toFixed(0) || 0}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {data.recommendation && (
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-sm text-foreground">
                      <strong>Tip:</strong> {data.recommendation}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Inventory Forecast */}
            {data.critical && (
              <>
                {data.critical.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-destructive">Critical Stock</p>
                    {data.critical.map((item, i) => (
                      <div key={i} className="flex justify-between items-center p-2 rounded bg-destructive/10">
                        <span className="text-sm">{item.name}</span>
                        <Badge variant="destructive">{item.current} left</Badge>
                      </div>
                    ))}
                  </div>
                )}

                {data.recommendations && data.recommendations.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Recommendations</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {data.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            {/* Daily Summary */}
            {data.text && (
              <div className="prose prose-sm prose-invert">
                <p className="text-sm text-foreground whitespace-pre-wrap">{data.text}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
