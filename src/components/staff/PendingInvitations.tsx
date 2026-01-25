import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Clock, X, RefreshCw, Copy, Check } from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { ROLE_PERMISSIONS } from '@/lib/rolePermissions';
import { AppRole } from '@/types';
import { cn } from '@/lib/utils';

interface Invitation {
  id: string;
  email: string;
  role: AppRole;
  status: string;
  created_at: string;
  expires_at: string;
  token: string;
}

interface PendingInvitationsProps {
  refreshTrigger?: number;
}

export function PendingInvitations({ refreshTrigger }: PendingInvitationsProps) {
  const { currentOrganization } = useAuth();
  const { toast } = useToast();
  
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (currentOrganization) {
      fetchInvitations();
    }
  }, [currentOrganization, refreshTrigger]);

  const fetchInvitations = async () => {
    if (!currentOrganization) return;

    const { data, error } = await supabase
      .from('staff_invitations')
      .select('*')
      .eq('organization_id', currentOrganization.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invitations:', error);
    } else {
      setInvitations((data || []) as Invitation[]);
    }
    setLoading(false);
  };

  const cancelInvitation = async (id: string) => {
    setActionLoading(id);
    
    const { error } = await supabase
      .from('staff_invitations')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Invitation cancelled' });
      fetchInvitations();
    }
    setActionLoading(null);
  };

  const resendInvitation = async (invitation: Invitation) => {
    setActionLoading(invitation.id);
    
    try {
      // Generate new token and update expiration
      const newToken = crypto.randomUUID();
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 7);

      const { error } = await supabase
        .from('staff_invitations')
        .update({ 
          token: newToken, 
          expires_at: newExpiry.toISOString(),
          created_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

      if (error) throw error;

      toast({ title: 'Invitation resent', description: 'A new invitation link has been generated.' });
      fetchInvitations();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
    setActionLoading(null);
  };

  const copyInviteLink = async (token: string, id: string) => {
    const url = `${window.location.origin}/staff/accept-invite/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast({ title: 'Link copied to clipboard' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (invitations.length === 0) {
    return null;
  }

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Pending Invitations
          <Badge variant="secondary" className="ml-auto">{invitations.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {invitations.map((invitation) => {
            const isExpired = isPast(new Date(invitation.expires_at));
            const roleConfig = ROLE_PERMISSIONS[invitation.role];
            
            return (
              <div
                key={invitation.id}
                className={cn(
                  'flex items-center justify-between p-4 rounded-lg border border-border/50',
                  isExpired ? 'bg-destructive/5' : 'bg-muted/30'
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{invitation.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={cn('text-xs', roleConfig?.color)}>
                        {roleConfig?.label || invitation.role}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {isExpired 
                          ? 'Expired' 
                          : `Expires ${formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true })}`
                        }
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => copyInviteLink(invitation.token, invitation.id)}
                  >
                    {copiedId === invitation.id ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => resendInvitation(invitation)}
                    disabled={actionLoading === invitation.id}
                  >
                    {actionLoading === invitation.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => cancelInvitation(invitation.id)}
                    disabled={actionLoading === invitation.id}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
