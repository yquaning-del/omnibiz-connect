import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, Copy, ExternalLink, Check } from 'lucide-react';
import { ROLE_PERMISSIONS, getAssignableRoles } from '@/lib/rolePermissions';
import { AppRole } from '@/types';

interface InviteStaffDialogProps {
  onInviteSent?: () => void;
}

export function InviteStaffDialog({ onInviteSent }: InviteStaffDialogProps) {
  const { currentOrganization, currentLocation, roles, user } = useAuth();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole>('staff');
  const [assignToLocation, setAssignToLocation] = useState(true);
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Get user's highest role to determine which roles they can assign
  const userRole = roles.find(r => r.organization_id === currentOrganization?.id)?.role as AppRole || 'staff';
  const assignableRoles = getAssignableRoles(userRole);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization || !user) return;

    setLoading(true);
    setInviteUrl(null);

    try {
      const { data, error } = await supabase.functions.invoke('send-staff-invitation', {
        body: {
          email: email.trim().toLowerCase(),
          role: selectedRole,
          organization_id: currentOrganization.id,
          location_id: assignToLocation ? currentLocation?.id : null,
        },
      });

      if (error) throw error;

      if (data?.inviteUrl) {
        setInviteUrl(data.inviteUrl);
        toast({
          title: 'Invitation created',
          description: 'Share the link below with the new staff member.',
        });
        onInviteSent?.();
      } else {
        toast({
          title: 'Invitation sent',
          description: `An invitation has been sent to ${email}`,
        });
        resetAndClose();
        onInviteSent?.();
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to send invitation',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast({ title: 'Link copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  const resetAndClose = () => {
    setOpen(false);
    setEmail('');
    setSelectedRole('staff');
    setInviteUrl(null);
    setCopied(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        setInviteUrl(null);
        setCopied(false);
      }
    }}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Staff
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Staff Member</DialogTitle>
        </DialogHeader>

        {inviteUrl ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share this link with <strong>{email}</strong> to complete their registration:
            </p>
            <div className="flex gap-2">
              <Input
                value={inviteUrl}
                readOnly
                className="text-xs"
              />
              <Button variant="outline" size="icon" onClick={copyToClipboard}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={() => window.open(inviteUrl, '_blank')}>
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
            <Button className="w-full" onClick={resetAndClose}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="staff@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_PERMISSIONS[role]?.label || role}
                    </SelectItem>
                  ))}
                  {/* Always allow assigning staff role */}
                  {!assignableRoles.includes('staff') && (
                    <SelectItem value="staff">Staff</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {ROLE_PERMISSIONS[selectedRole]?.description}
              </p>
            </div>

            {currentLocation && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="assignLocation"
                  checked={assignToLocation}
                  onChange={(e) => setAssignToLocation(e.target.checked)}
                  className="rounded border-input"
                />
                <Label htmlFor="assignLocation" className="text-sm font-normal">
                  Assign to current location ({currentLocation.name})
                </Label>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Send Invitation
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
