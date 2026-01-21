import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  ClipboardCheck,
  User,
  Briefcase,
  CreditCard,
  FileText,
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  Save
} from 'lucide-react';

interface VerificationItem {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  required: boolean;
}

interface VerificationChecklistProps {
  applicationId: string;
  initialData?: {
    verification_status?: Record<string, boolean>;
    screening_notes?: string;
  };
  onUpdate?: () => void;
}

const VERIFICATION_ITEMS: VerificationItem[] = [
  {
    id: 'identity_verified',
    label: 'Identity Verification',
    description: 'Government-issued ID verified and matches application',
    icon: User,
    required: true,
  },
  {
    id: 'employment_verified',
    label: 'Employment Verification',
    description: 'Current employment confirmed with employer',
    icon: Briefcase,
    required: true,
  },
  {
    id: 'income_verified',
    label: 'Income Verification',
    description: 'Pay stubs or tax returns confirm income (3x rent minimum)',
    icon: CreditCard,
    required: true,
  },
  {
    id: 'credit_checked',
    label: 'Credit Check',
    description: 'Credit report reviewed with acceptable score',
    icon: FileText,
    required: true,
  },
  {
    id: 'background_checked',
    label: 'Background Check',
    description: 'Criminal background check completed',
    icon: Shield,
    required: true,
  },
  {
    id: 'references_contacted',
    label: 'References Contacted',
    description: 'Previous landlord and/or personal references verified',
    icon: ClipboardCheck,
    required: false,
  },
  {
    id: 'rental_history_verified',
    label: 'Rental History',
    description: 'Previous rental history and eviction check completed',
    icon: FileText,
    required: false,
  },
];

export function VerificationChecklist({ 
  applicationId, 
  initialData,
  onUpdate 
}: VerificationChecklistProps) {
  const [verificationStatus, setVerificationStatus] = useState<Record<string, boolean>>(
    initialData?.verification_status || {}
  );
  const [notes, setNotes] = useState(initialData?.screening_notes || '');
  const [saving, setSaving] = useState(false);

  const completedCount = Object.values(verificationStatus).filter(Boolean).length;
  const requiredItems = VERIFICATION_ITEMS.filter(item => item.required);
  const requiredCompleted = requiredItems.filter(item => verificationStatus[item.id]).length;
  const allRequiredComplete = requiredCompleted === requiredItems.length;

  const progressPercent = (completedCount / VERIFICATION_ITEMS.length) * 100;

  const handleToggle = (itemId: string) => {
    setVerificationStatus(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('tenant_applications')
        .update({
          verification_status: verificationStatus,
          screening_notes: notes,
          status: allRequiredComplete ? 'approved' : 'screening',
        })
        .eq('id', applicationId);

      if (error) throw error;
      
      toast.success('Verification status saved');
      onUpdate?.();
    } catch (error) {
      console.error('Error saving verification:', error);
      toast.error('Failed to save verification status');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!allRequiredComplete) {
      toast.error('Please complete all required verifications first');
      return;
    }

    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('tenant_applications')
        .update({
          verification_status: verificationStatus,
          screening_notes: notes,
          status: 'approved',
        })
        .eq('id', applicationId);

      if (error) throw error;
      
      toast.success('Application approved!');
      onUpdate?.();
    } catch (error) {
      console.error('Error approving application:', error);
      toast.error('Failed to approve application');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('tenant_applications')
        .update({
          verification_status: verificationStatus,
          screening_notes: notes,
          status: 'rejected',
        })
        .eq('id', applicationId);

      if (error) throw error;
      
      toast.success('Application rejected');
      onUpdate?.();
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast.error('Failed to reject application');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-property" />
            Verification Checklist
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={allRequiredComplete ? 'default' : 'secondary'}>
              {completedCount}/{VERIFICATION_ITEMS.length} Complete
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Verification Progress</span>
            <span className="font-medium">{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Checklist Items */}
        <div className="space-y-3">
          {VERIFICATION_ITEMS.map((item) => {
            const Icon = item.icon;
            const isChecked = verificationStatus[item.id] || false;
            
            return (
              <div 
                key={item.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  isChecked 
                    ? 'bg-success/5 border-success/30' 
                    : 'bg-muted/30 border-border'
                }`}
              >
                <Checkbox
                  id={item.id}
                  checked={isChecked}
                  onCheckedChange={() => handleToggle(item.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <label 
                    htmlFor={item.id}
                    className="flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <Icon className={`h-4 w-4 ${isChecked ? 'text-success' : 'text-muted-foreground'}`} />
                    {item.label}
                    {item.required && (
                      <Badge variant="outline" className="text-xs">Required</Badge>
                    )}
                  </label>
                  <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                </div>
                {isChecked ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <Clock className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            );
          })}
        </div>

        {/* Screening Notes */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Screening Notes</label>
          <Textarea
            placeholder="Add notes about the verification process, any concerns, or special circumstances..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Progress
          </Button>
          <div className="flex gap-2 ml-auto">
            <Button 
              variant="destructive"
              onClick={handleReject}
              disabled={saving}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button 
              onClick={handleApprove}
              disabled={saving || !allRequiredComplete}
              className="bg-success hover:bg-success/90"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </div>
        </div>

        {!allRequiredComplete && (
          <p className="text-sm text-muted-foreground text-center">
            Complete all required verifications to approve this application
          </p>
        )}
      </CardContent>
    </Card>
  );
}
