import React, { useState, useEffect, useMemo } from "react";
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
  Sparkles,
  Building2,
  FileText,
  BedDouble,
  CalendarCheck,
  UtensilsCrossed,
  Pill,
  ClipboardList
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
  const { currentOrganization, user } = useAuth();

  const vertical = currentOrganization?.primary_vertical || 'retail';

  // Shared checklist items (invite team & reports)
  const sharedChecklistItems: ChecklistItem[] = useMemo(() => [
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
        return (count || 0) > 1;
      },
    },
    {
      id: "view_reports",
      title: "Explore reports",
      description: "Check your business analytics",
      icon: BarChart3,
      path: vertical === 'property' ? "/property/reports" : "/reports",
      checkFn: async () => {
        return localStorage.getItem("checklist_reports_viewed") === "true";
      },
    },
  ], [currentOrganization, vertical]);

  // Property-specific checklist items
  const propertyChecklistItems: ChecklistItem[] = useMemo(() => [
    {
      id: "add_unit",
      title: "Add your first unit",
      description: "Create a property unit to start managing",
      icon: Building2,
      path: "/property/units",
      checkFn: async () => {
        if (!currentOrganization) return false;
        const { count } = await supabase
          .from("property_units")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", currentOrganization.id);
        return (count || 0) > 0;
      },
    },
    {
      id: "add_tenant",
      title: "Create a tenant profile",
      description: "Add your first tenant to track leases",
      icon: Users,
      path: "/property/tenants",
      checkFn: async () => {
        if (!currentOrganization) return false;
        const { count } = await supabase
          .from("tenants")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", currentOrganization.id);
        return (count || 0) > 0;
      },
    },
    {
      id: "create_lease",
      title: "Create your first lease",
      description: "Set up a lease agreement for a unit",
      icon: FileText,
      path: "/property/leases",
      checkFn: async () => {
        if (!currentOrganization) return false;
        const { count } = await supabase
          .from("leases")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", currentOrganization.id);
        return (count || 0) > 0;
      },
    },
    ...sharedChecklistItems,
  ], [currentOrganization, sharedChecklistItems]);

  // Hotel-specific checklist items
  const hotelChecklistItems: ChecklistItem[] = useMemo(() => [
    {
      id: "add_room",
      title: "Add your first room",
      description: "Create a room to start accepting guests",
      icon: BedDouble,
      path: "/rooms",
      checkFn: async () => {
        if (!currentOrganization) return false;
        const { count } = await (supabase as any)
          .from("hotel_rooms")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", currentOrganization.id);
        return (count || 0) > 0;
      },
    },
    {
      id: "add_guest",
      title: "Create a guest profile",
      description: "Add your first guest to track stays",
      icon: Users,
      path: "/guest-profiles",
      checkFn: async () => {
        if (!currentOrganization) return false;
        const { count } = await supabase
          .from("guest_profiles")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", currentOrganization.id);
        return (count || 0) > 0;
      },
    },
    {
      id: "create_reservation",
      title: "Create a reservation",
      description: "Book your first guest stay",
      icon: CalendarCheck,
      path: "/reservations",
      checkFn: async () => {
        if (!currentOrganization) return false;
        const { count } = await supabase
          .from("reservations")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", currentOrganization.id);
        return (count || 0) > 0;
      },
    },
    ...sharedChecklistItems,
  ], [currentOrganization, sharedChecklistItems]);

  // Restaurant-specific checklist items
  const restaurantChecklistItems: ChecklistItem[] = useMemo(() => [
    {
      id: "add_product",
      title: "Add your first menu item",
      description: "Create a dish to start selling",
      icon: UtensilsCrossed,
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
      id: "add_table",
      title: "Create a table",
      description: "Set up your dining area layout",
      icon: Package,
      path: "/tables",
      checkFn: async () => {
        if (!currentOrganization) return false;
        const { count } = await supabase
          .from("restaurant_tables")
          .select("*", { count: "exact", head: true })
          .eq("location_id", currentOrganization.id);
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
    ...sharedChecklistItems,
  ], [currentOrganization, sharedChecklistItems]);

  // Pharmacy-specific checklist items
  const pharmacyChecklistItems: ChecklistItem[] = useMemo(() => [
    {
      id: "add_medication",
      title: "Add your first medication",
      description: "Create a medication in your inventory",
      icon: Pill,
      path: "/pharmacy/medications",
      checkFn: async () => {
        if (!currentOrganization) return false;
        const { count } = await supabase
          .from("medications")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", currentOrganization.id);
        return (count || 0) > 0;
      },
    },
    {
      id: "add_patient",
      title: "Create a patient profile",
      description: "Add your first patient record",
      icon: Users,
      path: "/pharmacy/patients",
      checkFn: async () => {
        if (!currentOrganization) return false;
        const { count } = await supabase
          .from("patient_profiles")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", currentOrganization.id);
        return (count || 0) > 0;
      },
    },
    {
      id: "process_prescription",
      title: "Process a prescription",
      description: "Fill your first prescription order",
      icon: ClipboardList,
      path: "/pharmacy/prescriptions",
      checkFn: async () => {
        if (!currentOrganization) return false;
        const { count } = await supabase
          .from("prescriptions")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", currentOrganization.id);
        return (count || 0) > 0;
      },
    },
    ...sharedChecklistItems,
  ], [currentOrganization, sharedChecklistItems]);

  // Retail-specific checklist items (default)
  const retailChecklistItems: ChecklistItem[] = useMemo(() => [
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
    ...sharedChecklistItems,
  ], [currentOrganization, sharedChecklistItems]);

  // Select checklist based on vertical
  const checklistItems = useMemo(() => {
    switch (vertical) {
      case 'property':
        return propertyChecklistItems;
      case 'hotel':
        return hotelChecklistItems;
      case 'restaurant':
        return restaurantChecklistItems;
      case 'pharmacy':
        return pharmacyChecklistItems;
      default:
        return retailChecklistItems;
    }
  }, [vertical, propertyChecklistItems, hotelChecklistItems, restaurantChecklistItems, pharmacyChecklistItems, retailChecklistItems]);

  useEffect(() => {
    checkProgress();
  }, [currentOrganization, checklistItems]);

  const checkProgress = async () => {
    if (!currentOrganization) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    try {
      const results = await Promise.all(
        checklistItems.map(async (item) => {
          try {
            const isComplete = await item.checkFn();
            return { id: item.id, complete: isComplete };
          } catch (error) {
            console.error(`Error checking ${item.id}:`, error);
            return { id: item.id, complete: false };
          }
        })
      );
      
      const completed = new Set<string>(
        results.filter(r => r.complete).map(r => r.id)
      );
      setCompletedItems(completed);
      
      if (completed.size === checklistItems.length) {
        setTimeout(() => setIsDismissed(true), 2000);
      }
    } catch (error) {
      console.error('Error checking progress:', error);
    } finally {
      setLoading(false);
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
