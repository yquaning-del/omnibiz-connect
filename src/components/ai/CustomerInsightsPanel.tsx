import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Users, UserMinus, RefreshCw, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomerSegment {
  name: string;
  count: number;
  avgSpend: number;
  description?: string;
}

interface TopPerformer {
  name: string;
  totalSpent: number;
  insight?: string;
}

interface InsightsData {
  segments?: CustomerSegment[];
  atRiskCount?: number;
  retentionRate?: number;
  reactivationSuggestions?: string[];
  topPerformers?: TopPerformer[];
  insights?: string;
  growthOpportunities?: string[];
  confidence?: string;
  error?: string;
}

interface CustomerInsightsPanelProps {
  vertical: 'restaurant' | 'retail';
}

export function CustomerInsightsPanel({ vertical }: CustomerInsightsPanelProps) {
  const { currentOrganization } = useAuth();
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    if (!currentOrganization) return;
    
    setLoading(true);
    setError(null);

    try {
      const { data: response, error: fnError } = await supabase.functions.invoke('ai-customer-insights', {
        body: {
          vertical,
          organizationId: currentOrganization.id,
        },
      });

      if (fnError) throw fnError;
      if (!response.success) throw new Error(response.error);
      
      setData(response.data);
    } catch (err: any) {
      console.error('Customer insights error:', err);
      setError(err.message || 'Failed to fetch insights');
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
          <Users className="w-5 h-5 text-info" />
          <CardTitle className="text-base">Customer Insights</CardTitle>
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
            <Users className="w-10 h-10 mx-auto mb-3 text-info/50" />
            <p className="text-sm text-muted-foreground mb-3">Understand your customers</p>
            <Button onClick={fetchInsights} size="sm">
              <Sparkles className="w-4 h-4 mr-2" />
              Analyze Customers
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Analyzing behavior...</span>
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
            {/* Retention Rate */}
            {data.retentionRate !== undefined && (
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Customer Retention</span>
                  <span className="text-sm font-medium">{data.retentionRate}%</span>
                </div>
                <Progress value={data.retentionRate} className="h-2" />
              </div>
            )}

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-3">
              {data.atRiskCount !== undefined && (
                <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <div className="flex items-center gap-2 mb-1">
                    <UserMinus className="w-4 h-4 text-warning" />
                    <span className="text-xs text-muted-foreground">At Risk</span>
                  </div>
                  <p className="text-lg font-bold text-warning">{data.atRiskCount}</p>
                </div>
              )}
              {data.segments && data.segments.length > 0 && (
                <div className="p-3 rounded-lg bg-info/10 border border-info/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-info" />
                    <span className="text-xs text-muted-foreground">Segments</span>
                  </div>
                  <p className="text-lg font-bold text-info">{data.segments.length}</p>
                </div>
              )}
            </div>

            {/* Customer Segments */}
            {data.segments && data.segments.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Customer Segments</p>
                {data.segments.slice(0, 4).map((segment, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <div>
                      <span className="text-sm font-medium">{segment.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">({segment.count})</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Avg ${segment.avgSpend?.toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Top Performers */}
            {data.topPerformers && data.topPerformers.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-success" />
                  <p className="text-sm font-medium">Top Customers</p>
                </div>
                {data.topPerformers.slice(0, 3).map((customer, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span>{customer.name}</span>
                    <Badge variant="secondary">${customer.totalSpent?.toLocaleString()}</Badge>
                  </div>
                ))}
              </div>
            )}

            {/* Reactivation Suggestions */}
            {data.reactivationSuggestions && data.reactivationSuggestions.length > 0 && (
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Win Back Actions</span>
                </div>
                <ul className="text-sm space-y-1">
                  {data.reactivationSuggestions.slice(0, 2).map((suggestion, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Insights Summary */}
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
