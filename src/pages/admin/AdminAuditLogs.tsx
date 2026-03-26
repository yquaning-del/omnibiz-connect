import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminDataTable, Column } from "@/components/admin/AdminDataTable";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  FileText,
  UserCog,
  CreditCard,
  Building2,
  Eye,
  Settings,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface AuditLog {
  id: string;
  admin_user_id: string;
  admin_name?: string;
  action_type: string;
  target_type?: string | null;
  target_id?: string | null;
  details?: unknown;
  ip_address?: string | null;
  created_at: string;
}

const actionConfig: Record<
  string,
  { icon: React.ElementType; color: string; label: string }
> = {
  impersonation_start: {
    icon: Eye,
    color: "bg-warning/20 text-warning",
    label: "Started Impersonation",
  },
  impersonation_end: {
    icon: Eye,
    color: "bg-muted text-muted-foreground",
    label: "Ended Impersonation",
  },
  subscription_change: {
    icon: CreditCard,
    color: "bg-primary/20 text-primary",
    label: "Subscription Changed",
  },
  user_suspend: {
    icon: AlertTriangle,
    color: "bg-destructive/20 text-destructive",
    label: "User Suspended",
  },
  org_suspend: {
    icon: Building2,
    color: "bg-destructive/20 text-destructive",
    label: "Organization Suspended",
  },
  settings_change: {
    icon: Settings,
    color: "bg-accent/20 text-accent",
    label: "Settings Changed",
  },
  role_change: {
    icon: UserCog,
    color: "bg-info/20 text-info",
    label: "Role Changed",
  },
};

export default function AdminAuditLogs() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, searchQuery]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("admin_audit_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (actionFilter !== "all") {
        query = query.eq("action_type", actionFilter);
      }

      const { data, count, error } = await query;

      if (error) throw error;

      // Fetch admin names
      const adminIds = [...new Set(data?.map((l) => l.admin_user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", adminIds);

      const profileMap = new Map(
        profiles?.map((p) => [p.id, p.full_name]) || []
      );

      let logsWithNames: AuditLog[] = (data || []).map((log) => ({
        ...log,
        admin_name: profileMap.get(log.admin_user_id) || "Unknown Admin",
      }));

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        logsWithNames = logsWithNames.filter(
          (l) =>
            (l.admin_name || "").toLowerCase().includes(q) ||
            l.action_type.toLowerCase().includes(q) ||
            (l.target_type || "").toLowerCase().includes(q)
        );
      }

      setLogs(logsWithNames);
      setTotal(count || 0);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      toast.error("Failed to fetch audit logs");
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<AuditLog>[] = [
    {
      key: "timestamp",
      header: "Timestamp",
      cell: (row) => (
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {format(new Date(row.created_at), "MMM d, yyyy")}
          </p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(row.created_at), "HH:mm:ss")}
          </p>
        </div>
      ),
    },
    {
      key: "action",
      header: "Action",
      cell: (row) => {
        const config = actionConfig[row.action_type] || {
          icon: FileText,
          color: "bg-muted text-muted-foreground",
          label: row.action_type,
        };
        const Icon = config.icon;
        return (
          <div className="flex items-center gap-2">
            <div
              className={`h-8 w-8 rounded-lg flex items-center justify-center ${config.color}`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium">{config.label}</span>
          </div>
        );
      },
    },
    {
      key: "admin",
      header: "Admin",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
            <UserCog className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm">{row.admin_name}</span>
        </div>
      ),
    },
    {
      key: "target",
      header: "Target",
      cell: (row) => (
        <div className="space-y-1">
          {row.target_type && (
            <Badge variant="outline" className="text-xs">
              {row.target_type}
            </Badge>
          )}
          {row.target_id && (
            <p className="text-xs text-muted-foreground font-mono">
              {row.target_id.substring(0, 8)}...
            </p>
          )}
          {!row.target_type && !row.target_id && (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      ),
    },
    {
      key: "details",
      header: "Details",
      cell: (row) => (
        <div className="max-w-[200px]">
          {row.details ? (
            <pre className="text-xs text-muted-foreground truncate">
              {JSON.stringify(row.details).substring(0, 50)}...
            </pre>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      ),
    },
    {
      key: "ip",
      header: "IP Address",
      cell: (row) => (
        <span className="text-sm text-muted-foreground font-mono">
          {row.ip_address || "-"}
        </span>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
          <p className="text-muted-foreground">
            Track all administrative actions on the platform
          </p>
        </div>

        <AdminDataTable
          columns={columns}
          data={logs}
          loading={loading}
          searchPlaceholder="Search logs..."
          onSearch={(query) => { setSearchQuery(query); setPage(1); }}
          pagination={{
            page,
            pageSize,
            total,
            onPageChange: setPage,
          }}
          onRefresh={fetchLogs}
          onExport={() => toast.info("Export feature coming soon")}
          filters={
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="impersonation_start">
                  Impersonation Start
                </SelectItem>
                <SelectItem value="impersonation_end">
                  Impersonation End
                </SelectItem>
                <SelectItem value="subscription_change">
                  Subscription Change
                </SelectItem>
                <SelectItem value="user_suspend">User Suspend</SelectItem>
                <SelectItem value="org_suspend">Org Suspend</SelectItem>
                <SelectItem value="settings_change">Settings Change</SelectItem>
                <SelectItem value="role_change">Role Change</SelectItem>
              </SelectContent>
            </Select>
          }
          emptyState={
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No audit logs found</p>
              <p className="text-sm text-muted-foreground">
                Admin actions will be logged here
              </p>
            </div>
          }
        />
      </div>
    </AdminLayout>
  );
}
