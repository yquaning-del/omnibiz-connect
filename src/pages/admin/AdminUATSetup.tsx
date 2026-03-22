import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  FlaskConical,
  Play,
  Loader2,
  Copy,
  Check,
  LogIn,
  ShieldAlert,
} from "lucide-react";

interface TestCredential {
  email: string;
  password: string;
  name: string;
  vertical: string;
  tier: string;
  role: string;
}

const TEST_CREDENTIALS: TestCredential[] = [
  // Restaurant
  { email: "restaurant.starter@test.com", password: "Test123!", name: "Restaurant Starter Admin", vertical: "restaurant", tier: "starter", role: "org_admin" },
  { email: "restaurant.pro@test.com", password: "Test123!", name: "Restaurant Pro Admin", vertical: "restaurant", tier: "professional", role: "org_admin" },
  { email: "restaurant.enterprise@test.com", password: "Test123!", name: "Restaurant Enterprise Admin", vertical: "restaurant", tier: "enterprise", role: "org_admin" },
  // Hotel
  { email: "hotel.starter@test.com", password: "Test123!", name: "Hotel Starter Admin", vertical: "hotel", tier: "starter", role: "org_admin" },
  { email: "hotel.pro@test.com", password: "Test123!", name: "Hotel Pro Admin", vertical: "hotel", tier: "professional", role: "org_admin" },
  { email: "hotel.enterprise@test.com", password: "Test123!", name: "Hotel Enterprise Admin", vertical: "hotel", tier: "enterprise", role: "org_admin" },
  // Pharmacy
  { email: "pharmacy.starter@test.com", password: "Test123!", name: "Pharmacy Starter Admin", vertical: "pharmacy", tier: "starter", role: "org_admin" },
  { email: "pharmacy.pro@test.com", password: "Test123!", name: "Pharmacy Pro Admin", vertical: "pharmacy", tier: "professional", role: "org_admin" },
  { email: "pharmacy.enterprise@test.com", password: "Test123!", name: "Pharmacy Enterprise Admin", vertical: "pharmacy", tier: "enterprise", role: "org_admin" },
  // Retail
  { email: "retail.starter@test.com", password: "Test123!", name: "Retail Starter Admin", vertical: "retail", tier: "starter", role: "org_admin" },
  { email: "retail.pro@test.com", password: "Test123!", name: "Retail Pro Admin", vertical: "retail", tier: "professional", role: "org_admin" },
  { email: "retail.enterprise@test.com", password: "Test123!", name: "Retail Enterprise Admin", vertical: "retail", tier: "enterprise", role: "org_admin" },
  // Role-specific
  { email: "pharmacist@test.com", password: "Test123!", name: "Test Pharmacist", vertical: "pharmacy", tier: "professional", role: "pharmacist" },
  { email: "frontdesk@test.com", password: "Test123!", name: "Test Front Desk", vertical: "hotel", tier: "professional", role: "front_desk" },
  { email: "manager@test.com", password: "Test123!", name: "Test Manager", vertical: "retail", tier: "professional", role: "location_manager" },
  { email: "staff@test.com", password: "Test123!", name: "Test Staff", vertical: "restaurant", tier: "professional", role: "staff" },
];

const VERTICAL_COLORS: Record<string, string> = {
  restaurant: "bg-orange-500/10 text-orange-600 border-orange-200",
  hotel: "bg-blue-500/10 text-blue-600 border-blue-200",
  pharmacy: "bg-green-500/10 text-green-600 border-green-200",
  retail: "bg-purple-500/10 text-purple-600 border-purple-200",
};

const TIER_COLORS: Record<string, string> = {
  starter: "bg-slate-100 text-slate-700",
  professional: "bg-primary/10 text-primary",
  enterprise: "bg-amber-100 text-amber-700",
};

export default function AdminUATSetup() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [seeding, setSeeding] = useState(false);
  const [seedLog, setSeedLog] = useState<string>("");
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  if (!isSuperAdmin) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ShieldAlert className="w-12 h-12 text-destructive mb-4" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground mt-2">This page is only accessible to super administrators.</p>
          <Button className="mt-4" onClick={() => navigate('/admin')}>Back to Admin Dashboard</Button>
        </div>
      </AdminLayout>
    );
  }

  const handleSeedData = async () => {
    setSeeding(true);
    setSeedLog("Starting demo data seeding...\n");
    try {
      const { data, error } = await supabase.functions.invoke("create-test-users");
      if (error) {
        setSeedLog(prev => prev + `\nError: ${error.message}`);
        toast.error("Seeding failed", { description: error.message });
      } else {
        const output = JSON.stringify(data, null, 2);
        setSeedLog(prev => prev + "\n" + output);
        toast.success("Demo data seeded successfully");
      }
    } catch (err: any) {
      setSeedLog(prev => prev + `\nException: ${err.message}`);
      toast.error("Unexpected error during seeding");
    } finally {
      setSeeding(false);
    }
  };

  const handleCopy = async (text: string, type: "email" | "password", identifier: string) => {
    await navigator.clipboard.writeText(text);
    if (type === "email") {
      setCopiedEmail(identifier);
      setTimeout(() => setCopiedEmail(null), 2000);
    }
    toast.success(`${type === "email" ? "Email" : "Password"} copied`);
  };

  const handleQuickLogin = (email: string) => {
    navigate(`/auth?email=${encodeURIComponent(email)}`);
  };

  const groupedByVertical = TEST_CREDENTIALS.reduce<Record<string, TestCredential[]>>((acc, cred) => {
    if (!acc[cred.vertical]) acc[cred.vertical] = [];
    acc[cred.vertical].push(cred);
    return acc;
  }, {});

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <FlaskConical className="w-7 h-7 text-amber-600" />
              <h1 className="text-2xl font-bold font-display text-foreground">UAT Setup & Demo Data</h1>
              <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                Super Admin Only
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              Seed test user accounts and access demo credentials for UAT testing sessions.
            </p>
          </div>
        </div>

        {/* Seed Data Card */}
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Play className="w-4 h-4" />
              Seed Demo Data
            </CardTitle>
            <CardDescription>
              Creates 16 test user accounts across all verticals and subscription tiers.
              This is idempotent — running it again will skip already-existing users.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleSeedData} disabled={seeding} className="bg-amber-600 hover:bg-amber-700">
              {seeding ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Seeding...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run Demo Data Seed
                </>
              )}
            </Button>
            {seedLog && (
              <pre className="mt-3 p-3 rounded-lg bg-muted text-xs font-mono overflow-auto max-h-48 whitespace-pre-wrap text-foreground border border-border">
                {seedLog}
              </pre>
            )}
          </CardContent>
        </Card>

        {/* Test Credentials */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Test Credentials</h2>
          <p className="text-sm text-muted-foreground">
            All test accounts use password: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">Test123!</code>
          </p>

          {Object.entries(groupedByVertical).map(([vertical, creds]) => (
            <Card key={vertical} className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium capitalize flex items-center gap-2">
                  <Badge className={`${VERTICAL_COLORS[vertical]} border`} variant="outline">
                    {vertical}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground border-b border-border/50">
                        <th className="text-left py-2 pr-4 font-medium">Name</th>
                        <th className="text-left py-2 pr-4 font-medium">Email</th>
                        <th className="text-left py-2 pr-4 font-medium">Tier</th>
                        <th className="text-left py-2 pr-4 font-medium">Role</th>
                        <th className="text-right py-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creds.map((cred) => (
                        <tr key={cred.email} className="border-b border-border/30 last:border-0">
                          <td className="py-2 pr-4 text-foreground">{cred.name}</td>
                          <td className="py-2 pr-4">
                            <div className="flex items-center gap-1.5">
                              <code className="text-xs text-muted-foreground">{cred.email}</code>
                              <button
                                onClick={() => handleCopy(cred.email, "email", cred.email)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                title="Copy email"
                              >
                                {copiedEmail === cred.email
                                  ? <Check className="w-3 h-3 text-green-500" />
                                  : <Copy className="w-3 h-3" />
                                }
                              </button>
                            </div>
                          </td>
                          <td className="py-2 pr-4">
                            <Badge variant="secondary" className={`text-xs ${TIER_COLORS[cred.tier]}`}>
                              {cred.tier}
                            </Badge>
                          </td>
                          <td className="py-2 pr-4">
                            <span className="text-xs text-muted-foreground">{cred.role}</span>
                          </td>
                          <td className="py-2 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => handleQuickLogin(cred.email)}
                              title="Navigate to login pre-filled with this email"
                            >
                              <LogIn className="w-3 h-3" />
                              Login
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* UAT Notes */}
        <Card className="border-border/50 bg-muted/20">
          <CardHeader>
            <CardTitle className="text-sm">UAT Testing Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• <strong>Quick Login</strong> navigates to the sign-in page with the email pre-filled. Enter <code className="bg-muted px-1 rounded">Test123!</code> as the password.</p>
            <p>• Each vertical account has its own isolated organization and location. Data created in one account does not affect others.</p>
            <p>• <strong>Tier differences:</strong> Starter accounts have limited features. Professional and Enterprise unlock the full feature set.</p>
            <p>• Role-specific accounts (pharmacist, front_desk, manager, staff) test permission boundaries — they should be blocked from admin features.</p>
            <p>• Use the <strong>UAT Checklist</strong> (amber clipboard icon, bottom-left) to track testing progress.</p>
            <p>• Use the <strong>Feedback</strong> button (bottom-right) to report issues found during testing.</p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
