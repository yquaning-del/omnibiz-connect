import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { AdminSearchBar } from "@/components/admin/AdminSearchBar";
import { ActivityFeed } from "@/components/admin/ActivityFeed";
import { VerticalDistribution } from "@/components/admin/VerticalDistribution";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2,
  Users,
  DollarSign,
  CreditCard,
  TrendingUp,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PlatformStats {
  totalOrganizations: number;
  totalUsers: number;
  mrr: number;
  activeSubscriptions: number;
  trialOrgs: number;
  paidOrgs: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PlatformStats>({
    totalOrganizations: 0,
    totalUsers: 0,
    mrr: 0,
    activeSubscriptions: 0,
    trialOrgs: 0,
    paidOrgs: 0,
  });

  const [verticalData, setVerticalData] = useState<
    { name: string; value: number; color: string }[]
  >([]);

  const [revenueData, setRevenueData] = useState<
    { date: string; mrr: number }[]
  >([]);

  const [activities, setActivities] = useState<
    {
      id: string;
      type: "org_created" | "user_signup" | "subscription_change" | "payment_failed" | "payment_success";
      title: string;
      description?: string;
      timestamp: Date;
      metadata?: Record<string, string>;
    }[]
  >([]);

  useEffect(() => {
    fetchPlatformStats();
  }, []);

  const fetchPlatformStats = async () => {
    setLoading(true);
    try {
      // Fetch organizations count
      const { count: orgCount } = await supabase
        .from("organizations")
        .select("*", { count: "exact", head: true });

      // Fetch organizations by vertical
      const { data: orgs } = await supabase
        .from("organizations")
        .select("primary_vertical");

      // Fetch users count
      const { count: userCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Fetch subscriptions
      const { data: subscriptions } = await supabase
        .from("organization_subscriptions")
        .select("status, plan_id");

      // Fetch plans for pricing
      const { data: plans } = await supabase
        .from("subscription_plans")
        .select("id, price_monthly, tier");

      // Calculate stats
      const activeSubscriptions = subscriptions?.filter(
        (s) => s.status === "active" || s.status === "trialing"
      ).length || 0;

      const trialOrgs = subscriptions?.filter((s) => s.status === "trialing").length || 0;
      const paidOrgs = subscriptions?.filter((s) => s.status === "active").length || 0;

      // Calculate MRR
      let mrr = 0;
      subscriptions?.forEach((sub) => {
        if (sub.status === "active" && sub.plan_id) {
          const plan = plans?.find((p) => p.id === sub.plan_id);
          if (plan) {
            mrr += plan.price_monthly;
          }
        }
      });

      // Calculate vertical distribution
      const verticalCounts: Record<string, number> = {};
      orgs?.forEach((org) => {
        const v = org.primary_vertical;
        verticalCounts[v] = (verticalCounts[v] || 0) + 1;
      });

      const verticalColors: Record<string, string> = {
        restaurant: "hsl(14, 100%, 57%)",
        hotel: "hsl(262, 83%, 58%)",
        pharmacy: "hsl(142, 71%, 45%)",
        retail: "hsl(199, 89%, 48%)",
      };

      setVerticalData(
        Object.entries(verticalCounts).map(([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value,
          color: verticalColors[name] || "hsl(217, 33%, 50%)",
        }))
      );

      setStats({
        totalOrganizations: orgCount || 0,
        totalUsers: userCount || 0,
        mrr,
        activeSubscriptions,
        trialOrgs,
        paidOrgs,
      });

      // Generate mock revenue data
      const mockRevenueData = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return {
          date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          mrr: mrr + Math.random() * 1000 - 500,
        };
      });
      setRevenueData(mockRevenueData);

      // Generate mock activities from recent orgs
      const { data: recentOrgs } = await supabase
        .from("organizations")
        .select("id, name, created_at, primary_vertical")
        .order("created_at", { ascending: false })
        .limit(10);

      const mockActivities = recentOrgs?.map((org) => ({
        id: org.id,
        type: "org_created" as const,
        title: `New organization: ${org.name}`,
        description: `Registered as ${org.primary_vertical}`,
        timestamp: new Date(org.created_at),
        metadata: { vertical: org.primary_vertical },
      })) || [];

      setActivities(mockActivities);
    } catch (error) {
      console.error("Error fetching platform stats:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Platform Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor and manage the HospitalityOS platform
            </p>
          </div>
          <AdminSearchBar
            onSelect={(result) => {
              if (result.type === "organization") {
                navigate(`/admin/organizations?id=${result.id}`);
              } else if (result.type === "user") {
                navigate(`/admin/users?id=${result.id}`);
              }
            }}
          />
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminStatCard
            title="Total Organizations"
            value={stats.totalOrganizations}
            trend={{ value: 12, label: "vs last month" }}
            icon={<Building2 className="h-6 w-6" />}
            variant="primary"
          />
          <AdminStatCard
            title="Total Users"
            value={stats.totalUsers}
            trend={{ value: 8, label: "vs last month" }}
            icon={<Users className="h-6 w-6" />}
            variant="default"
          />
          <AdminStatCard
            title="Monthly Revenue"
            value={`$${stats.mrr.toLocaleString()}`}
            subtitle="MRR"
            trend={{ value: 15, label: "vs last month" }}
            icon={<DollarSign className="h-6 w-6" />}
            variant="success"
          />
          <AdminStatCard
            title="Active Subscriptions"
            value={stats.activeSubscriptions}
            subtitle={`${stats.trialOrgs} trial, ${stats.paidOrgs} paid`}
            icon={<CreditCard className="h-6 w-6" />}
            variant="default"
          />
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Trial Conversion</p>
                  <p className="text-2xl font-bold text-success">67%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-success/30" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Churn Rate</p>
                  <p className="text-2xl font-bold text-warning">2.4%</p>
                </div>
                <AlertCircle className="h-8 w-8 text-warning/30" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Revenue/Org</p>
                  <p className="text-2xl font-bold">
                    ${stats.totalOrganizations > 0 
                      ? Math.round(stats.mrr / stats.totalOrganizations)
                      : 0}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Platform Health</p>
                  <p className="text-2xl font-bold text-primary">98.5%</p>
                </div>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  Healthy
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RevenueChart data={revenueData} loading={loading} />
          </div>
          <VerticalDistribution data={verticalData} loading={loading} />
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ActivityFeed activities={activities} loading={loading} />

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => navigate("/admin/organizations")}
              >
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Manage Organizations
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => navigate("/admin/users")}
              >
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Manage Users
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => navigate("/admin/subscriptions")}
              >
                <span className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  View Subscriptions
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => navigate("/admin/support")}
              >
                <span className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Support Tools
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
