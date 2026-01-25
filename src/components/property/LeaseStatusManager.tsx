import { useState } from 'react';
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { Loader2, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface LeaseStatusManagerProps {
  leaseId: string;
  currentStatus: string;
  onStatusChanged: () => void;
}

const statusTransitions: Record<string, { label: string; icon: React.ElementType; allowed: string[] }> = {
  draft: {
    label: 'Draft',
    icon: Clock,
    allowed: ['active', 'pending_signature'],
  },
  pending_signature: {
    label: 'Pending Signature',
    icon: AlertTriangle,
    allowed: ['active', 'expired', 'terminated'],
  },
  active: {
    label: 'Active',
    icon: CheckCircle,
    allowed: ['expired', 'terminated'],
  },
  expired: {
    label: 'Expired',
    icon: XCircle,
    allowed: [],
  },
  terminated: {
    label: 'Terminated',
    icon: XCircle,
    allowed: [],
  },
};

const allStatuses = [
  { value: 'draft', label: 'Draft', icon: Clock },
  { value: 'pending_signature', label: 'Pending Signature', icon: AlertTriangle },
  { value: 'active', label: 'Active', icon: CheckCircle },
  { value: 'expired', label: 'Expired', icon: XCircle },
  { value: 'terminated', label: 'Terminated', icon: XCircle },
];

export function LeaseStatusManager({
  leaseId,
  currentStatus,
  onStatusChanged,
}: LeaseStatusManagerProps) {
  const { currentOrganization } = useAuth();
  const [loading, setLoading] = useState(false);

  const currentConfig = statusTransitions[currentStatus];
  const allowedTransitions = currentConfig?.allowed || [];

  const handleStatusChange = async (newStatus: string) => {
    if (!currentOrganization?.id || newStatus === currentStatus) return;

    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('leases')
        .update({ status: newStatus })
        .eq('id', leaseId)
        .eq('organization_id', currentOrganization.id);

      if (error) throw error;

      toast.success(`Lease status updated to ${newStatus.replace('_', ' ')}`);
      onStatusChanged();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error('Failed to update lease status');
    } finally {
      setLoading(false);
    }
  };

  if (allowedTransitions.length === 0) {
    return null;
  }

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger disabled={loading}>
        {loading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Clock className="h-4 w-4 mr-2" />
        )}
        Change Status
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent>
          {allStatuses
            .filter((s) => allowedTransitions.includes(s.value))
            .map((status) => {
              const Icon = status.icon;
              return (
                <DropdownMenuItem
                  key={status.value}
                  onClick={() => handleStatusChange(status.value)}
                  disabled={loading}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {status.label}
                </DropdownMenuItem>
              );
            })}
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
}
