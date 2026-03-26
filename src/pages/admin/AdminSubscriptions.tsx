import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { AdminDataTable, Column, StatusBadge } from "@/components/admin/AdminDataTable";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  DollarSign,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Building2,
  MoreHorizontal,
  Eye,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface SubscriptionWithOrg {
  id: string;
  organization_id: string;
  organization_name: string;
  status: string;
  plan_name: string;
  tier: string;
  price: number;
  current_period_end?: string;
  trial_ends_at?: string;
  created_at: string;
}

interface SubscriptionStats {
  mrr: number;
  arr: number;
  totalSubscriptions: number;
  activeCount: number;
  trialingCount: number;
  canceledCount: number;
  churnRate: number;
  conversionRate: number;
}

export default function AdminSubscriptions() {
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithOrg[]>([]);
  const [allSubscriptions, setAllSubscriptions] = useState<SubscriptionWithOrg[]>([]);
  const [stats, setStats] = useState<SubscriptionStats>({
    mrr: 0,
    arr: 0,
    totalSubscriptions: 0,
    activeCount: 0,
    trialingCount: 0,
    canceledCount: 0,
    churnRate: 2.4,
    conversionRate: 67,
  });
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const [revenueData, setRevenueData] = useState<{ date: string; mrr: number }[]>([]);
  const [tierDistribution, setTierDistribution] = useState<
    { name: string; value: number; color: string }[]
  >([]);

  useEffect(() => {
    fetchSubscriptions();
  }, [page, tierFilter, statusFilter]);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      // Fetch subscriptions with organizations
      const { data: subs, count, error } = await supabase
        .from("organization_subscriptions")
        .select("*, organizations(name)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (error) throw error;

      // Fetch plans
      const { data: plans } = await supabase
        .from("subscription_plans")
        .select("id, name, tier, price_monthly");

      const planMap = new Map(
        plans?.map((p) => [p.id, { name: p.name, tier: p.tier, price: p.price_monthly }])
      );

      // Build subscriptions with org data
      const subsWithOrg: SubscriptionWithOrg[] = (subs || []).map((sub: any) => {
        const plan = sub.plan_id ? planMap.get(sub.plan_id) : null;
        return {
          id: sub.id,
          organization_id: sub.organization_id,
          organization_name: sub.organizations?.name || "Unknown",
          status: sub.status,
          plan_name: plan?.name || "Unknown",
          tier: plan?.tier || "unknown",
          price: plan?.price || 0,
          current_period_end: sub.current_period_end,
          trial_ends_at: sub.trial_ends_at,
          created_at: sub.created_at,
        };
      });

      // Calculate stats
      const allSubs = (
        await supabase.from("organization_subscriptions").select("status, plan_id")
      ).data || [];

      let mrr = 0;
      let activeCount = 0;
      let trialingCount = 0;
      let canceledCount = 0;

      const tierCounts: Record<string, number> = {};

      allSubs.forEach((sub) => {
        if (sub.status === "active") {
          activeCount++;
          const plan = sub.plan_id ? planMap.get(sub.plan_id) : null;
          if (plan) {
            mrr += plan.price;
            tierCounts[plan.tier] = (tierCounts[plan.tier] || 0) + 1;
          }
        } else if (sub.status === "trialing") {
          trialingCount++;
        } else if (sub.status === "canceled") {
          canceledCount++;
        }
      });

      setStats({
        mrr,
        arr: mrr * 12,
        totalSubscriptions: allSubs.length,
        activeCount,
        trialingCount,
        canceledCount,
        churnRate: 2.4,
        conversionRate: 67,
      });

      // Tier distribution
      const tierColors: Record<string, string> = {
        starter: "hsl(199, 89%, 48%)",
        professional: "hsl(173, 80%, 40%)",
        enterprise: "hsl(262, 83%, 58%)",
      };

      setTierDistribution(
        Object.entries(tierCounts).map(([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value,
          color: tierColors[name] || "hsl(217, 33%, 50%)",
        }))
      );

      // Mock revenue data
      const mockRevenueData = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return {
          date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          mrr: mrr + Math.random() * 1000 - 500,
        };
      });
      setRevenueData(mockRevenueData);

      // Store all subs for filtering
      setAllSubscriptions(subsWithOrg);

      // Apply filters
      let filteredSubs = subsWithOrg;
      if (tierFilter !== "all") {
        filteredSubs = filteredSubs.filter((s) => s.tier === tierFilter);
      }
      if (statusFilter !== "all") {
        filteredSubs = filteredSubs.filter((s) => s.status === statusFilter);
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        filteredSubs = filteredSubs.filter((s) => s.organization_name.toLowerCase().includes(q));
      }

      setSubscriptions(filteredSubs);
      setTotal(count || 0);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      toast.error("Failed to fetch subscriptions");
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (
    status: string
  ): "default" | "success" | "warning" | "destructive" => {
    const map: Record<string, "default" | "success" | "warning" | "destructive"> = {
      active: "success",
      trialing: "warning",
      canceled: "destructive",
      past_due: "destructive",
    };
    return map[status] || "default";
  };

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      starter: "bg-blue-500/20 text-blue-400",
      professional: "bg-primary/20 text-primary",
      enterprise: "bg-purple-500/20 text-purple-400",
    };
    return colors[tier] || "bg-muted text-muted-foreground";
  };

  const columns: Column<SubscriptionWithOrg>[] = [
    {
      key: "organization",
      header: "Organization",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <span className="font-medium">{row.organization_name}</span>
        </div>
      ),
    },
    {
      key: "plan",
      header: "Plan",
      cell: (row) => (
        <div className="space-y-1">
          <Badge className={getTierColor(row.tier)}>{row.tier}</Badge>
          <p className="text-xs text-muted-foreground">{row.plan_name}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <StatusBadge status={row.status} variant={getStatusVariant(row.status)} />
      ),
    },
    {
      key: "price",
      header: "MRR",
      cell: (row) => (
        <span className="font-medium">${row.price.toLocaleString()}</span>
      ),
    },
    {
      key: "billing",
      header: "Next Billing",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.current_period_end
            ? format(new Date(row.current_period_end), "MMM d, yyyy")
            : row.trial_ends_at
            ? `Trial ends ${format(new Date(row.trial_ends_at), "MMM d")}`
            : "-"}
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
            <DropdownMenuItem>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem>
              <CreditCard className="h-4 w-4 mr-2" />
              Manage Plan
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
          <h1 className="text-2xl font-bold text-foreground">
            Subscriptions & Revenue
          </h1>
          <p className="text-muted-foreground">
            Monitor subscription health and revenue metrics
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminStatCard
            title="Monthly Revenue"
            value={`$${stats.mrr.toLocaleString()}`}
            subtitle="MRR"
            trend={{ value: 12, label: "vs last month" }}
            icon={<DollarSign className="h-6 w-6" />}
            variant="success"
          />
          <AdminStatCard
            title="Annual Revenue"
            value={`$${stats.arr.toLocaleString()}`}
            subtitle="ARR"
            icon={<TrendingUp className="h-6 w-6" />}
            variant="primary"
          />
          <AdminStatCard
            title="Active Subscriptions"
            value={stats.activeCount}
            subtitle={`${stats.trialingCount} trialing`}
            icon={<CreditCard className="h-6 w-6" />}
            variant="default"
          />
          <AdminStatCard
            title="Conversion Rate"
            value={`${stats.conversionRate}%`}
            subtitle="trial to paid"
            trend={{ value: 5, label: "vs last month" }}
            icon={<TrendingUp className="h-6 w-6" />}
            variant="default"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RevenueChart data={revenueData} loading={loading} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tier Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={tierDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {tierDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(222, 47%, 9%)",
                        border: "1px solid hsl(217, 33%, 17%)",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subscriptions Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminDataTable
              columns={columns}
              data={subscriptions}
              loading={loading}
              searchPlaceholder="Search subscriptions..."
              onSearch={(query) => console.log("Search:", query)}
              pagination={{
                page,
                pageSize,
                total,
                onPageChange: setPage,
              }}
              onRefresh={fetchSubscriptions}
              filters={
                <div className="flex gap-2">
                  <Select value={tierFilter} onValueChange={setTierFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tiers</SelectItem>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
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
            />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
