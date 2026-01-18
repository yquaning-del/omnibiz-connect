import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  UserPlus,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  type: "org_created" | "user_signup" | "subscription_change" | "payment_failed" | "payment_success";
  title: string;
  description?: string;
  timestamp: Date;
  metadata?: Record<string, string>;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  loading?: boolean;
  maxHeight?: string;
  title?: string;
}

const activityConfig = {
  org_created: {
    icon: Building2,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  user_signup: {
    icon: UserPlus,
    color: "text-info",
    bgColor: "bg-info/10",
  },
  subscription_change: {
    icon: CreditCard,
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  payment_failed: {
    icon: AlertCircle,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
  payment_success: {
    icon: CheckCircle,
    color: "text-success",
    bgColor: "bg-success/10",
  },
};

export function ActivityFeed({
  activities,
  loading = false,
  maxHeight = "400px",
  title = "Recent Activity",
}: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea style={{ height: maxHeight }}>
          <div className="space-y-4">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="h-10 w-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 bg-muted rounded" />
                    <div className="h-3 w-1/2 bg-muted rounded" />
                  </div>
                </div>
              ))
            ) : activities.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No recent activity
              </p>
            ) : (
              activities.map((activity) => {
                const config = activityConfig[activity.type];
                const Icon = config.icon;

                return (
                  <div
                    key={activity.id}
                    className="flex gap-3 pb-4 border-b border-border last:border-0 last:pb-0"
                  >
                    <div
                      className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0",
                        config.bgColor
                      )}
                    >
                      <Icon className={cn("h-5 w-5", config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {activity.title}
                      </p>
                      {activity.description && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {activity.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(activity.timestamp, {
                            addSuffix: true,
                          })}
                        </span>
                        {activity.metadata &&
                          Object.entries(activity.metadata).map(([key, value]) => (
                            <Badge
                              key={key}
                              variant="outline"
                              className="text-xs px-1.5 py-0"
                            >
                              {value}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
