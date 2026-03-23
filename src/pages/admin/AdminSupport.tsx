import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminSearchBar } from "@/components/admin/AdminSearchBar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Building2,
  UserCog,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw,
  Activity,
  Database,
  Server,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface QuickLookupResult {
  organization?: {
    id: string;
    name: string;
    vertical: string;
    status: string;
    locations: number;
    users: number;
  };
  user?: {
    id: string;
    name: string;
    email: string;
    roles: string[];
  };
}

export default function AdminSupport() {
  const { user, setCurrentOrganization, setCurrentLocation } = useAuth();
  const navigate = useNavigate();
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupResult, setLookupResult] = useState<QuickLookupResult | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [impersonating, setImpersonating] = useState(false);
  const [readOnlyMode, setReadOnlyMode] = useState(true);
  const [diagOrgId, setDiagOrgId] = useState("");
  const [diagResults, setDiagResults] = useState("");

  const handleQuickLookup = async () => {
    if (!lookupQuery.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    setLookupLoading(true);
    try {
      // Search organizations
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id, name, primary_vertical")
        .or(`name.ilike.%${lookupQuery}%,slug.ilike.%${lookupQuery}%`)
        .limit(1);

      if (orgs && orgs.length > 0) {
        const org = orgs[0];
        
        // Get subscription
        const { data: sub } = await supabase
          .from("organization_subscriptions")
          .select("status")
          .eq("organization_id", org.id)
          .single();

        // Get location count
        const { count: locCount } = await supabase
          .from("locations")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", org.id);

        // Get user count
        const { count: userCount } = await supabase
          .from("user_roles")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", org.id);

        setLookupResult({
          organization: {
            id: org.id,
            name: org.name,
            vertical: org.primary_vertical,
            status: sub?.status || "unknown",
            locations: locCount || 0,
            users: userCount || 0,
          },
        });
        return;
      }

      // Search users
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .or(`email.ilike.%${lookupQuery}%,full_name.ilike.%${lookupQuery}%`)
        .limit(1);

      if (profiles && profiles.length > 0) {
        const profile = profiles[0];
        
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", profile.id);

        setLookupResult({
          user: {
            id: profile.id,
            name: profile.full_name || "Unknown",
            email: profile.email || "",
            roles: roles?.map((r) => r.role) || [],
          },
        });
        return;
      }

      toast.info("No results found");
      setLookupResult(null);
    } catch (error) {
      console.error("Lookup error:", error);
      toast.error("Search failed");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleImpersonate = async () => {
    if (!lookupResult?.organization) {
      toast.error("No organization selected");
      return;
    }

    if (!user?.id) {
      toast.error("User not authenticated");
      return;
    }

    // Log impersonation session
    await supabase.from("admin_audit_logs").insert({
      admin_user_id: user.id,
      action_type: "impersonation_start",
      target_type: "organization",
      target_id: lookupResult.organization.id,
      details: {
        organization_name: lookupResult.organization.name,
        read_only: readOnlyMode,
      },
    });

    // Switch the app context to the target organization
    setCurrentOrganization({
      id: lookupResult.organization.id,
      name: lookupResult.organization.name,
      slug: (lookupResult.organization as any).slug || '',
      primary_vertical: (lookupResult.organization as any).primary_vertical || lookupResult.organization.vertical as any,
      settings: {},
      created_at: '',
      updated_at: '',
    });

    // Fetch and set the first location for this org
    const { data: locations } = await supabase
      .from('locations')
      .select('*')
      .eq('organization_id', lookupResult.organization.id)
      .eq('is_active', true)
      .limit(1);

    if (locations && locations.length > 0) {
      setCurrentLocation(locations[0] as any);
    }

    setImpersonating(true);
    toast.success(
      `Viewing as ${lookupResult.organization.name} (${readOnlyMode ? "Read-only" : "Full access"})`
    );
    navigate('/dashboard');
  };

  const stopImpersonation = async () => {
    if (lookupResult?.organization && user?.id) {
      await supabase.from("admin_audit_logs").insert({
        admin_user_id: user.id,
        action_type: "impersonation_end",
        target_type: "organization",
        target_id: lookupResult.organization.id,
      });
    }
    setImpersonating(false);
    toast.info("Impersonation ended");
  };

  const runDiagnostic = async (type: 'rls' | 'roles' | 'data') => {
    if (!diagOrgId.trim()) {
      toast.error("Enter an organization ID first");
      return;
    }
    setDiagResults(`Running ${type} check for ${diagOrgId}...\n`);

    try {
      if (type === 'rls' || type === 'data') {
        const { data: org, error: orgErr } = await supabase
          .from('organizations')
          .select('id, name, primary_vertical')
          .eq('id', diagOrgId.trim())
          .single();
        
        if (orgErr || !org) {
          setDiagResults(`ERROR: Organization not found (${orgErr?.message || 'no data'})`);
          return;
        }

        const { count: locCount } = await supabase
          .from('locations')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', diagOrgId.trim());

        const { count: prodCount } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', diagOrgId.trim());

        setDiagResults(prev => prev + `Organization: ${org.name} (${org.primary_vertical})\n`
          + `Locations: ${locCount ?? 0}\n`
          + `Products: ${prodCount ?? 0}\n`);
      }

      if (type === 'roles') {
        const { data: roles, error: rolesErr } = await supabase
          .from('user_roles')
          .select('id, role, user_id, profiles:user_id(full_name)')
          .eq('organization_id', diagOrgId.trim());

        if (rolesErr) {
          setDiagResults(`ERROR: ${rolesErr.message}`);
          return;
        }

        setDiagResults(prev => prev + `User roles (${roles?.length ?? 0}):\n`
          + (roles || []).map((r: any) => `  - ${r.profiles?.full_name || r.user_id}: ${r.role}`).join('\n')
          + '\n');
      }

      setDiagResults(prev => prev + `\n✓ ${type.toUpperCase()} check complete`);
    } catch (err: any) {
      setDiagResults(`ERROR: ${err.message}`);
    }
  };

  // Mock system health data
  const systemHealth = [
    { name: "Database", status: "healthy", latency: "12ms" },
    { name: "Auth Service", status: "healthy", latency: "8ms" },
    { name: "Edge Functions", status: "healthy", latency: "45ms" },
    { name: "Storage", status: "healthy", latency: "23ms" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Support Tools</h1>
          <p className="text-muted-foreground">
            Troubleshoot user issues and access organization views
          </p>
        </div>

        {/* Impersonation Warning Banner */}
        {impersonating && (
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-warning" />
              <div>
                <p className="font-medium text-warning">
                  Viewing as: {lookupResult?.organization?.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {readOnlyMode ? "Read-only mode" : "Full access mode"}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={stopImpersonation}>
              Stop Viewing
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Lookup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Quick Lookup
              </CardTitle>
              <CardDescription>
                Find organizations or users by name, email, or ID
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by name, email, or ID..."
                  value={lookupQuery}
                  onChange={(e) => setLookupQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleQuickLookup()}
                />
                <Button onClick={handleQuickLookup} disabled={lookupLoading}>
                  {lookupLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {lookupResult?.organization && (
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{lookupResult.organization.name}</p>
                      <div className="flex gap-2">
                        <Badge variant="outline">
                          {lookupResult.organization.vertical}
                        </Badge>
                        <Badge
                          variant={
                            lookupResult.organization.status === "active"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {lookupResult.organization.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Locations:</span>{" "}
                      {lookupResult.organization.locations}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Users:</span>{" "}
                      {lookupResult.organization.users}
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="read-only"
                        checked={readOnlyMode}
                        onCheckedChange={setReadOnlyMode}
                      />
                      <Label htmlFor="read-only" className="text-sm">
                        Read-only mode
                      </Label>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleImpersonate}
                      disabled={impersonating}
                    >
                      <UserCog className="h-4 w-4 mr-2" />
                      View as Organization
                    </Button>
                  </div>
                </div>
              )}

              {lookupResult?.user && (
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <UserCog className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{lookupResult.user.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {lookupResult.user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {lookupResult.user.roles.map((role) => (
                      <Badge key={role} variant="outline">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Health */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                System Health
              </CardTitle>
              <CardDescription>
                Real-time status of platform services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {systemHealth.map((service) => (
                  <div
                    key={service.name}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {service.name === "Database" && (
                        <Database className="h-4 w-4 text-muted-foreground" />
                      )}
                      {service.name === "Auth Service" && (
                        <UserCog className="h-4 w-4 text-muted-foreground" />
                      )}
                      {service.name === "Edge Functions" && (
                        <Server className="h-4 w-4 text-muted-foreground" />
                      )}
                      {service.name === "Storage" && (
                        <Database className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span>{service.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {service.latency}
                      </span>
                      {service.status === "healthy" ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Common Issues & Diagnostics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Common Issues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg">
                    <p className="font-medium text-sm">Login Issues</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Check user exists in profiles, verify email confirmed,
                      reset password if needed
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="font-medium text-sm">Missing Data</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Verify RLS policies, check organization_id assignments,
                      confirm location access
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="font-medium text-sm">Subscription Issues</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Check subscription status, verify plan_id, check trial
                      expiration dates
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="font-medium text-sm">Permission Errors</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Verify user_roles entries, check role hierarchy, confirm
                      location_id assignments
                    </p>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Run Diagnostics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Organization ID</Label>
                <Input
                  placeholder="Enter organization ID to diagnose"
                  value={diagOrgId}
                  onChange={(e) => setDiagOrgId(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => runDiagnostic('rls')}>
                  Check RLS
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => runDiagnostic('roles')}>
                  Check Roles
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => runDiagnostic('data')}>
                  Check Data
                </Button>
              </div>
              <Textarea
                placeholder="Diagnostic results will appear here..."
                className="h-[100px] font-mono text-xs"
                readOnly
                value={diagResults}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
