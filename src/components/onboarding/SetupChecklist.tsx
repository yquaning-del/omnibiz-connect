import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  Circle, 
  Package, 
  Users, 
  ShoppingCart, 
  UserPlus,
  BarChart3,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  checkFn: () => Promise<boolean>;
}

export function SetupChecklist() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { currentOrganization, currentLocation, user } = useAuth();

  const checklistItems: ChecklistItem[] = [
    {
      id: "add_product",
      title: "Add your first product",
      description: "Create a product to start selling",
      icon: Package,
      path: "/products",
      checkFn: async () => {
        if (!currentOrganization) return false;
        const { count } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", currentOrganization.id);
        return (count || 0) > 0;
      },
    },
    {
      id: "add_customer",
      title: "Create a customer profile",
      description: "Add your first customer to track purchases",
      icon: Users,
      path: "/customers",
      checkFn: async () => {
        if (!currentOrganization) return false;
        const { count } = await supabase
          .from("customers")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", currentOrganization.id);
        return (count || 0) > 0;
      },
    },
    {
      id: "first_sale",
      title: "Make your first sale",
      description: "Process a transaction in the POS",
      icon: ShoppingCart,
      path: "/pos",
      checkFn: async () => {
        if (!currentOrganization) return false;
        const { count } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", currentOrganization.id);
        return (count || 0) > 0;
      },
    },
    {
      id: "invite_team",
      title: "Invite a team member",
      description: "Add staff to help manage your business",
      icon: UserPlus,
      path: "/staff",
      checkFn: async () => {
        if (!currentOrganization) return false;
        const { count } = await supabase
          .from("user_roles")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", currentOrganization.id);
        return (count || 0) > 1; // More than just the owner
      },
    },
    {
      id: "view_reports",
      title: "Explore reports",
      description: "Check your business analytics",
      icon: BarChart3,
      path: "/reports",
      checkFn: async () => {
        // This one we'll track via localStorage since it's a view action
        return localStorage.getItem("checklist_reports_viewed") === "true";
      },
    },
  ];

  useEffect(() => {
    checkProgress();
  }, [currentOrganization]);

  const checkProgress = async () => {
    setLoading(true);
    const completed = new Set<string>();
    
    for (const item of checklistItems) {
      try {
        const isComplete = await item.checkFn();
        if (isComplete) {
          completed.add(item.id);
        }
      } catch (error) {
        console.error(`Error checking ${item.id}:`, error);
      }
    }
    
    setCompletedItems(completed);
    setLoading(false);
    
    // Auto-dismiss if all complete
    if (completed.size === checklistItems.length) {
      setTimeout(() => setIsDismissed(true), 2000);
    }
  };

  const handleItemClick = (item: ChecklistItem) => {
    if (item.id === "view_reports") {
      localStorage.setItem("checklist_reports_viewed", "true");
    }
    navigate(item.path);
  };

  const handleDismiss = async () => {
    setIsDismissed(true);
    if (user) {
      await supabase
        .from("profiles")
        .update({ 
          onboarding_progress: { checklist_dismissed: true } 
        })
        .eq("id", user.id);
    }
  };

  if (isDismissed || completedItems.size === checklistItems.length) {
    return null;
  }

  const progress = (completedItems.size / checklistItems.length) * 100;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Getting Started</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Progress value={progress} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {completedItems.size}/{checklistItems.length} complete
          </span>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-2">
          <div className="space-y-2">
            {checklistItems.map((item) => {
              const isComplete = completedItems.has(item.id);
              const Icon = item.icon;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${
                    isComplete 
                      ? "bg-primary/10 text-muted-foreground" 
                      : "hover:bg-muted"
                  }`}
                  disabled={loading}
                >
                  {isComplete ? (
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isComplete ? "line-through" : ""}`}>
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.description}
                    </p>
                  </div>
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
