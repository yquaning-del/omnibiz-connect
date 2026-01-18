import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Building2,
  MapPin,
  Users,
  CreditCard,
  Calendar,
  Mail,
  Phone,
  ExternalLink,
  UserCog,
  Pause,
  Play,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";

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

interface OrgDetailPanelProps {
  open: boolean;
  onClose: () => void;
  organization: Organization | null;
  locations?: Location[];
  subscription?: Subscription | null;
  userCount?: number;
  onImpersonate?: () => void;
  onSuspend?: () => void;
  onDelete?: () => void;
}

export function OrgDetailPanel({
  open,
  onClose,
  organization,
  locations = [],
  subscription,
  userCount = 0,
  onImpersonate,
  onSuspend,
  onDelete,
}: OrgDetailPanelProps) {
  if (!organization) return null;

  const getVerticalColor = (vertical: string) => {
    const colors: Record<string, string> = {
      restaurant: "bg-orange-500/20 text-orange-400",
      hotel: "bg-purple-500/20 text-purple-400",
      pharmacy: "bg-green-500/20 text-green-400",
      retail: "bg-blue-500/20 text-blue-400",
    };
    return colors[vertical] || "bg-muted text-muted-foreground";
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-success/20 text-success",
      trialing: "bg-warning/20 text-warning",
      canceled: "bg-destructive/20 text-destructive",
      past_due: "bg-destructive/20 text-destructive",
    };
    return colors[status] || "bg-muted text-muted-foreground";
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader className="pb-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-xl">{organization.name}</SheetTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getVerticalColor(organization.primary_vertical)}>
                  {organization.primary_vertical}
                </Badge>
                {subscription && (
                  <Badge className={getStatusColor(subscription.status)}>
                    {subscription.status}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-200px)]">
          <Tabs defaultValue="overview" className="mt-4">
            <TabsList className="w-full">
              <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
              <TabsTrigger value="locations" className="flex-1">Locations</TabsTrigger>
              <TabsTrigger value="subscription" className="flex-1">Billing</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">Locations</span>
                  </div>
                  <p className="text-2xl font-bold">{locations.length}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">Users</span>
                  </div>
                  <p className="text-2xl font-bold">{userCount}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Created:</span>
                  <span>{format(new Date(organization.created_at), "PPP")}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Slug:</span>
                  <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                    {organization.slug}
                  </span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium">Quick Actions</h4>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={onImpersonate}>
                    <UserCog className="h-4 w-4 mr-2" />
                    Impersonate
                  </Button>
                  <Button variant="outline" size="sm" onClick={onSuspend}>
                    <Pause className="h-4 w-4 mr-2" />
                    Suspend
                  </Button>
                  <Button variant="destructive" size="sm" onClick={onDelete}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="locations" className="mt-4 space-y-4">
              {locations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No locations found
                </p>
              ) : (
                locations.map((location) => (
                  <div
                    key={location.id}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{location.name}</h4>
                      <Badge
                        variant={location.is_active ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {location.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <Badge className={getVerticalColor(location.vertical)} variant="outline">
                      {location.vertical}
                    </Badge>
                    {(location.address || location.city) && (
                      <p className="text-sm text-muted-foreground">
                        {[location.address, location.city, location.country]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      {location.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {location.email}
                        </span>
                      )}
                      {location.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {location.phone}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="subscription" className="mt-4 space-y-4">
              {subscription ? (
                <div className="space-y-4">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-muted-foreground">Plan</span>
                      <Badge>{subscription.tier || subscription.plan_name}</Badge>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-muted-foreground">Status</span>
                      <Badge className={getStatusColor(subscription.status)}>
                        {subscription.status}
                      </Badge>
                    </div>
                    {subscription.current_period_end && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Next billing</span>
                        <span>
                          {format(new Date(subscription.current_period_end), "PPP")}
                        </span>
                      </div>
                    )}
                    {subscription.trial_ends_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Trial ends</span>
                        <span>
                          {format(new Date(subscription.trial_ends_at), "PPP")}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Manage Plan
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No subscription found
                </p>
              )}
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
