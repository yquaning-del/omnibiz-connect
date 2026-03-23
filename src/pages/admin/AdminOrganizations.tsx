import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminDataTable, Column, StatusBadge } from "@/components/admin/AdminDataTable";
import { OrgDetailPanel } from "@/components/admin/OrgDetailPanel";
import { Button } from "@/components/ui/button";
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
import { Building2, Eye, UserCog, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface Organization {
  id: string;
  name: string;
  slug: string;
  primary_vertical: string;
  created_at: string;
  settings?: Record<string, unknown>;
  logo_url?: string;
}

interface Location {
  id: string;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  email?: string;
  phone?: string;
  vertical: string;
  is_active: boolean;
}

interface Subscription {
  id: string;
  status: string;
  plan_name?: string;
  tier?: string;
  current_period_start?: string;
  current_period_end?: string;
  trial_ends_at?: string;
}

interface OrgWithMeta extends Organization {
  subscription?: Subscription;
  location_count: number;
  user_count: number;
}

export default function AdminOrganizations() {
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<OrgWithMeta[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [selectedOrgLocations, setSelectedOrgLocations] = useState<Location[]>([]);
  const [selectedOrgSubscription, setSelectedOrgSubscription] = useState<Subscription | null>(null);
  const [selectedOrgUserCount, setSelectedOrgUserCount] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [verticalFilter, setVerticalFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    fetchOrganizations();
  }, [page, verticalFilter, statusFilter, searchQuery]);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      // Build query
      let query = supabase
        .from("organizations")
        .select("*, organization_subscriptions(status, plan_id, trial_ends_at), locations(id)", {
          count: "exact",
        });

      if (verticalFilter !== "all" && ["restaurant", "hotel", "pharmacy", "retail", "property"].includes(verticalFilter)) {
        query = query.eq("primary_vertical", verticalFilter as any);
      }

      if (searchQuery.trim()) {
        query = query.ilike("name", `%${searchQuery.trim()}%`);
      }

      const { data: orgs, count, error } = await query
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (error) throw error;

      // Fetch subscription plans
      const { data: plans } = await supabase
        .from("subscription_plans")
        .select("id, name, tier");

      // Fetch user counts per organization
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("organization_id");

      const userCountsByOrg: Record<string, number> = {};
      userRoles?.forEach((role) => {
        if (role.organization_id) {
          userCountsByOrg[role.organization_id] = (userCountsByOrg[role.organization_id] || 0) + 1;
        }
      });

      const orgsWithMeta: OrgWithMeta[] = (orgs || []).map((org: any) => {
        const subscription = org.organization_subscriptions?.[0];
        const plan = subscription?.plan_id
          ? plans?.find((p) => p.id === subscription.plan_id)
          : null;

        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          primary_vertical: org.primary_vertical,
          created_at: org.created_at,
          settings: org.settings,
          logo_url: org.logo_url,
          subscription: subscription
            ? {
                id: subscription.id,
                status: subscription.status,
                plan_name: plan?.name,
                tier: plan?.tier,
                trial_ends_at: subscription.trial_ends_at,
              }
            : undefined,
          location_count: org.locations?.length || 0,
          user_count: userCountsByOrg[org.id] || 0,
        };
      });

      // Filter by status if needed
      let filteredOrgs = orgsWithMeta;
      if (statusFilter !== "all") {
        filteredOrgs = orgsWithMeta.filter(
          (org) => org.subscription?.status === statusFilter
        );
      }

      setOrganizations(filteredOrgs);
      setTotal(count || 0);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      toast.error("Failed to fetch organizations");
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrg = async (org: OrgWithMeta) => {
    setSelectedOrg(org);
    setDetailOpen(true);

    // Fetch locations
    const { data: locations } = await supabase
      .from("locations")
      .select("*")
      .eq("organization_id", org.id);

    setSelectedOrgLocations((locations || []).map(loc => ({
      ...loc,
      address: loc.address ?? undefined,
      city: loc.city ?? undefined,
      country: loc.country ?? undefined,
      email: loc.email ?? undefined,
      phone: loc.phone ?? undefined,
    })));
    setSelectedOrgSubscription(org.subscription || null);
    setSelectedOrgUserCount(org.user_count);
  };

  const getVerticalColor = (vertical: string) => {
    const colors: Record<string, string> = {
      restaurant: "bg-orange-500/20 text-orange-400",
      hotel: "bg-purple-500/20 text-purple-400",
      pharmacy: "bg-green-500/20 text-green-400",
      retail: "bg-blue-500/20 text-blue-400",
    };
    return colors[vertical] || "bg-muted text-muted-foreground";
  };

  const getStatusVariant = (status?: string): "default" | "success" | "warning" | "destructive" => {
    if (!status) return "default";
    const map: Record<string, "default" | "success" | "warning" | "destructive"> = {
      active: "success",
      trialing: "warning",
      canceled: "destructive",
      past_due: "destructive",
    };
    return map[status] || "default";
  };

  const columns: Column<OrgWithMeta>[] = [
    {
      key: "name",
      header: "Organization",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: "primary_vertical",
      header: "Vertical",
      cell: (row) => (
        <Badge className={getVerticalColor(row.primary_vertical)}>
          {row.primary_vertical}
        </Badge>
      ),
    },
    {
      key: "subscription",
      header: "Status",
      cell: (row) => (
        <div className="space-y-1">
          <StatusBadge
            status={row.subscription?.status || "none"}
            variant={getStatusVariant(row.subscription?.status)}
          />
          {row.subscription?.tier && (
            <p className="text-xs text-muted-foreground capitalize">
              {row.subscription.tier}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "location_count",
      header: "Locations",
      cell: (row) => <span>{row.location_count}</span>,
    },
    {
      key: "user_count",
      header: "Users",
      cell: (row) => <span>{row.user_count}</span>,
    },
    {
      key: "created_at",
      header: "Created",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(row.created_at), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-[50px]",
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleViewOrg(row)}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem>
              <UserCog className="h-4 w-4 mr-2" />
              Impersonate
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Organizations</h1>
          <p className="text-muted-foreground">
            Manage all organizations on the platform
          </p>
        </div>

        <AdminDataTable
          columns={columns}
          data={organizations}
          loading={loading}
          searchPlaceholder="Search organizations..."
          onSearch={(query) => {
            setSearchQuery(query);
            setPage(1);
          }}
          pagination={{
            page,
            pageSize,
            total,
            onPageChange: setPage,
          }}
          onRefresh={fetchOrganizations}
          filters={
            <div className="flex gap-2">
              <Select value={verticalFilter} onValueChange={setVerticalFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Vertical" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Verticals</SelectItem>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                  <SelectItem value="hotel">Hotel</SelectItem>
                  <SelectItem value="pharmacy">Pharmacy</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trialing">Trialing</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
          onRowClick={handleViewOrg}
        />

        <OrgDetailPanel
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          organization={selectedOrg}
          locations={selectedOrgLocations}
          subscription={selectedOrgSubscription}
          userCount={selectedOrgUserCount}
          onImpersonate={() => toast.info("Impersonation feature coming soon")}
          onSuspend={() => toast.info("Suspend feature coming soon")}
          onDelete={() => toast.info("Delete feature coming soon")}
        />
      </div>
    </AdminLayout>
  );
}
