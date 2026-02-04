import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pill, Calendar, User, RefreshCw, AlertTriangle } from 'lucide-react';

interface PrescriptionCardProps {
  prescription: {
    id: string;
    prescription_number: string;
    prescriber_name: string;
    status: string;
    date_written: string;
    date_filled: string | null;
    refills_remaining: number | null;
    refills_authorized: number | null;
    is_controlled_substance: boolean | null;
    notes: string | null;
  };
  medications?: Array<{ name: string; dosage?: string; instructions?: string }>;
  onRequestRefill: (prescriptionId: string) => void;
  loading?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning/20 text-warning',
  ready: 'bg-success/20 text-success',
  dispensed: 'bg-primary/20 text-primary',
  refill_requested: 'bg-info/20 text-info',
  cancelled: 'bg-destructive/20 text-destructive',
};

export function PrescriptionCard({ 
  prescription, 
  medications = [], 
  onRequestRefill,
  loading 
}: PrescriptionCardProps) {
  const canRefill = prescription.refills_remaining !== null && 
    prescription.refills_remaining > 0 && 
    ['dispensed', 'ready'].includes(prescription.status);

  return (
    <Card className="border-border/50 bg-card/50 transition-all hover:border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Pill className="h-5 w-5 text-pharmacy" />
              Rx #{prescription.prescription_number}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-3 w-3" />
              <span>Dr. {prescription.prescriber_name}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={STATUS_COLORS[prescription.status] || 'bg-muted text-muted-foreground'}>
              {prescription.status.replace('_', ' ').charAt(0).toUpperCase() + prescription.status.slice(1).replace('_', ' ')}
            </Badge>
            {prescription.is_controlled_substance && (
              <Badge variant="outline" className="text-warning border-warning">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Controlled
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Medications List */}
        {medications.length > 0 && (
          <div className="space-y-2">
            {medications.map((med, index) => (
              <div key={index} className="rounded-lg bg-muted/30 p-3">
                <p className="font-medium text-foreground">{med.name}</p>
                {med.dosage && (
                  <p className="text-sm text-muted-foreground">{med.dosage}</p>
                )}
                {med.instructions && (
                  <p className="text-sm text-muted-foreground mt-1">{med.instructions}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Dates and Refills */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Written</p>
              <p className="font-medium">{new Date(prescription.date_written).toLocaleDateString()}</p>
            </div>
          </div>
          {prescription.date_filled && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Last Filled</p>
                <p className="font-medium">{new Date(prescription.date_filled).toLocaleDateString()}</p>
              </div>
            </div>
          )}
        </div>

        {/* Refills Info */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="text-sm">
            <span className="text-muted-foreground">Refills: </span>
            <span className={`font-medium ${prescription.refills_remaining === 0 ? 'text-destructive' : 'text-foreground'}`}>
              {prescription.refills_remaining ?? 0} of {prescription.refills_authorized ?? 0} remaining
            </span>
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

        {prescription.notes && (
          <p className="text-sm text-muted-foreground italic border-t border-border/50 pt-2">
            Note: {prescription.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
