import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Loader2, Send, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface InviteTenantButtonProps {
  leaseId: string;
  tenantId: string;
  tenantEmail?: string;
  tenantName?: string;
  propertyAddress?: string;
  monthlyRent?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  onInviteSent?: () => void;
}

export function InviteTenantButton({
  leaseId,
  tenantId,
  tenantEmail: initialEmail,
  tenantName,
  propertyAddress,
  monthlyRent,
  variant = 'default',
  size = 'default',
  onInviteSent,
}: InviteTenantButtonProps) {
  const { currentOrganization } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState(initialEmail || '');

  const handleSendInvite = async () => {
    if (!email || !currentOrganization?.id) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-lease-invitation', {
        body: {
          leaseId,
          tenantId,
          email,
          tenantName,
          propertyAddress,
          monthlyRent,
          organizationId: currentOrganization.id,
          organizationName: currentOrganization.name,
        },
      });

      if (error) throw error;

      setSent(true);
      toast.success('Invitation sent successfully!');
      onInviteSent?.();
      
      // Reset after a delay
      setTimeout(() => {
        setOpen(false);
        setSent(false);
      }, 2000);
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Failed to send invitation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
      >
        <Mail className="h-4 w-4 mr-2" />
        {size === 'icon' ? '' : 'Invite to Sign'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-property" />
              Invite Tenant to Sign Lease
            </DialogTitle>
            <DialogDescription>
              Send an email invitation to the tenant to create an account and sign the lease electronically.
            </DialogDescription>
          </DialogHeader>

          {sent ? (
            <div className="py-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-medium">Invitation Sent!</p>
              <p className="text-muted-foreground mt-1">
                {tenantName || 'The tenant'} will receive an email with instructions to sign the lease.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="tenant-name">Tenant Name</Label>
                  <Input
                    id="tenant-name"
                    value={tenantName || ''}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tenant-email">Email Address</Label>
                  <Input
                    id="tenant-email"
                    type="email"
                    placeholder="tenant@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    The tenant will receive an invitation to create an account and sign the lease.
                  </p>
                </div>

                {propertyAddress && (
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                    <p className="text-sm font-medium">Property</p>
                    <p className="text-sm text-muted-foreground">{propertyAddress}</p>
                    {monthlyRent && (
                      <p className="text-sm text-muted-foreground">
                        Monthly Rent: ${monthlyRent}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSendInvite} disabled={loading || !email}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send Invitation
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
