import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, History, Plus, Minus, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AuditLogEntry {
  id: string;
  created_at: string;
  action_type: string;
  target_type: string;
  target_id: string;
  details: {
    staff_name?: string;
    staff_role?: string;
    added?: string[];
    removed?: string[];
    template_applied?: string;
    reset_to_defaults?: boolean;
  };
}

interface PermissionAuditLogProps {
  organizationId?: string;
  limit?: number;
}

export function PermissionAuditLog({ organizationId, limit = 20 }: PermissionAuditLogProps) {
  const { currentOrganization, hasRole } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const orgId = organizationId || currentOrganization?.id;
  const canViewLogs = hasRole('super_admin') || hasRole('org_admin');

  useEffect(() => {
    const fetchLogs = async () => {
      if (!canViewLogs) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .eq('action_type', 'permission_update')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching audit logs:', error);
      } else if (data) {
        setLogs(data as unknown as AuditLogEntry[]);
      }

      setLoading(false);
    };

    fetchLogs();
  }, [orgId, limit, canViewLogs]);

  if (!canViewLogs) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="w-5 h-5" />
            Permission Changes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No permission changes recorded yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="w-5 h-5" />
          Permission Changes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-lg bg-muted/30 border border-border/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">
                    {log.details?.staff_name || 'Unknown User'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </span>
                </div>

                {log.details?.template_applied && (
                  <Badge variant="outline" className="mb-2 text-xs">
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Template: {log.details.template_applied}
                  </Badge>
                )}

                {log.details?.reset_to_defaults && (
                  <Badge variant="secondary" className="mb-2 text-xs">
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Reset to Role Defaults
                  </Badge>
                )}

                <div className="space-y-1">
                  {log.details?.added && log.details.added.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Plus className="w-3 h-3 text-success mt-1 shrink-0" />
                      <span className="text-xs text-muted-foreground">
                        Added: {log.details.added.join(', ')}
                      </span>
                    </div>
                  )}
                  {log.details?.removed && log.details.removed.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Minus className="w-3 h-3 text-destructive mt-1 shrink-0" />
                      <span className="text-xs text-muted-foreground">
                        Removed: {log.details.removed.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
