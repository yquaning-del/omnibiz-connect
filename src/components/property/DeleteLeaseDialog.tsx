import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface DeleteLeaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leaseId: string;
  leaseNumber: string;
  status: string;
  onDeleted: () => void;
}

export function DeleteLeaseDialog({
  open,
  onOpenChange,
  leaseId,
  leaseNumber,
  status,
  onDeleted,
}: DeleteLeaseDialogProps) {
  const { currentOrganization } = useAuth();
  const [loading, setLoading] = useState(false);

  const canDelete = ['draft', 'expired', 'terminated'].includes(status);

  const handleDelete = async () => {
    if (!currentOrganization?.id || !canDelete) return;

    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('leases')
        .delete()
        .eq('id', leaseId)
        .eq('organization_id', currentOrganization.id);

      if (error) throw error;

      toast.success(`Lease #${leaseNumber} deleted successfully`);
      onDeleted();
    } catch (error: any) {
      console.error('Error deleting lease:', error);
      toast.error('Failed to delete lease');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Lease #{leaseNumber}?</AlertDialogTitle>
          <AlertDialogDescription>
            {canDelete ? (
              <>
                This action cannot be undone. This will permanently delete the lease
                and all associated data including payment records and signatures.
              </>
            ) : (
              <>
                Active and pending leases cannot be deleted. Please change the status
                to "Expired" or "Terminated" first, or wait until the lease naturally
                expires.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading || !canDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Delete Lease
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
