import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ApplyLateFeeButtonProps {
  onSuccess?: () => void;
}

export function ApplyLateFeeButton({ onSuccess }: ApplyLateFeeButtonProps) {
  const [loading, setLoading] = useState(false);
  const handleApplyLateFees = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('apply_late_fees');

      if (error) throw error;

      toast.success("Late fees applied", { description: "Late fees have been calculated and applied to overdue payments." });

      onSuccess?.();
    } catch (error: any) {
      console.error('Error applying late fees:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to apply late fees',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <AlertTriangle className="h-4 w-4 mr-2" />
          )}
          Apply Late Fees
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apply Late Fees</AlertDialogTitle>
          <AlertDialogDescription>
            This will automatically calculate and apply late fees to all overdue rent
            payments that have exceeded their grace period. The default late fee is 5%
            of the base rent after a 5-day grace period.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleApplyLateFees}>
            Apply Late Fees
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
