import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';

interface RefillStatusProps {
  prescription: {
    id: string;
    prescription_number: string;
    status: string;
    refills_remaining: number | null;
    date_filled: string | null;
  };
  onRequestRefill: (prescriptionId: string) => void;
  loading?: boolean;
}

const STATUS_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  pending: { icon: Clock, color: 'bg-warning/20 text-warning', label: 'Pending' },
  ready: { icon: CheckCircle, color: 'bg-success/20 text-success', label: 'Ready for Pickup' },
  dispensed: { icon: CheckCircle, color: 'bg-muted text-muted-foreground', label: 'Dispensed' },
  refill_requested: { icon: RefreshCw, color: 'bg-info/20 text-info', label: 'Refill Requested' },
  cancelled: { icon: AlertCircle, color: 'bg-destructive/20 text-destructive', label: 'Cancelled' },
};

export function RefillStatus({ prescription, onRequestRefill, loading }: RefillStatusProps) {
  const statusConfig = STATUS_CONFIG[prescription.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;
  const canRefill = prescription.refills_remaining !== null && prescription.refills_remaining > 0 && 
    ['dispensed', 'ready'].includes(prescription.status);

  return (
    <Card className="border-border/50 bg-card/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-muted-foreground">
                Rx #{prescription.prescription_number}
              </span>
              <Badge className={statusConfig.color}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {prescription.date_filled && (
                <span>Last filled: {new Date(prescription.date_filled).toLocaleDateString()}</span>
              )}
              {prescription.refills_remaining !== null && (
                <span className={prescription.refills_remaining === 0 ? 'text-destructive' : ''}>
                  {prescription.refills_remaining} refill{prescription.refills_remaining !== 1 ? 's' : ''} remaining
                </span>
              )}
            </div>
          </div>

          {canRefill && (
            <Button 
              size="sm"
              onClick={() => onRequestRefill(prescription.id)}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Request Refill
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
