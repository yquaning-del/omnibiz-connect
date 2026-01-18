import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface AdminStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    label: string;
  };
  icon?: ReactNode;
  variant?: "default" | "primary" | "success" | "warning" | "destructive";
  className?: string;
}

const variantStyles = {
  default: "bg-card",
  primary: "bg-primary/10 border-primary/20",
  success: "bg-success/10 border-success/20",
  warning: "bg-warning/10 border-warning/20",
  destructive: "bg-destructive/10 border-destructive/20",
};

const iconVariantStyles = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/20 text-primary",
  success: "bg-success/20 text-success",
  warning: "bg-warning/20 text-warning",
  destructive: "bg-destructive/20 text-destructive",
};

export function AdminStatCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  variant = "default",
  className,
}: AdminStatCardProps) {
  const TrendIcon = trend
    ? trend.value > 0
      ? TrendingUp
      : trend.value < 0
      ? TrendingDown
      : Minus
    : null;

  const trendColor = trend
    ? trend.value > 0
      ? "text-success"
      : trend.value < 0
      ? "text-destructive"
      : "text-muted-foreground"
    : "";

  return (
    <Card className={cn(variantStyles[variant], "border", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-foreground">{value}</p>
              {subtitle && (
                <span className="text-sm text-muted-foreground">{subtitle}</span>
              )}
            </div>
            {trend && TrendIcon && (
              <div className={cn("flex items-center gap-1 text-sm", trendColor)}>
                <TrendIcon className="h-4 w-4" />
                <span className="font-medium">
                  {trend.value > 0 ? "+" : ""}
                  {trend.value}%
                </span>
                <span className="text-muted-foreground">{trend.label}</span>
              </div>
            )}
          </div>
          {icon && (
            <div
              className={cn(
                "h-12 w-12 rounded-xl flex items-center justify-center",
                iconVariantStyles[variant]
              )}
            >
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
