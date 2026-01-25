import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  X, 
  ChevronRight, 
  ChevronLeft,
  LayoutDashboard,
  ShoppingCart,
  Package,
  BarChart3,
  Settings,
  Sparkles,
  Building2,
  Users,
  FileText,
  Wallet,
  Hotel,
  BedDouble,
  Utensils,
  ClipboardList,
  Pill,
  Stethoscope
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: string;
}

// Retail/Default tour steps
const retailTourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Your Dashboard! 🎉",
    description: "This is your command center. Here you'll see key metrics, recent activity, and quick actions to manage your business.",
    icon: LayoutDashboard,
  },
  {
    id: "pos",
    title: "Point of Sale",
    description: "Process sales quickly with our intuitive POS. Search products, apply discounts, and accept multiple payment methods.",
    icon: ShoppingCart,
  },
  {
    id: "products",
    title: "Product Management",
    description: "Add, edit, and organize your products. Set prices, track inventory, and categorize items for easy access.",
    icon: Package,
  },
  {
    id: "reports",
    title: "Reports & Analytics",
    description: "Get insights into your business performance. View sales trends, top products, and revenue analytics.",
    icon: BarChart3,
  },
  {
    id: "settings",
    title: "Customize Your Experience",
    description: "Configure your business settings, manage team members, and personalize the platform to fit your needs.",
    icon: Settings,
  },
  {
    id: "complete",
    title: "You're All Set!",
    description: "Use ⌘K (or Ctrl+K) anytime to quickly navigate and perform actions. Need help? Click the help icon in the header.",
    icon: Sparkles,
  },
];

// Property Management tour steps
const propertyTourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Property Management! 🏢",
    description: "This is your property dashboard. Monitor occupancy, rent collection, and manage your units all from one place.",
    icon: LayoutDashboard,
  },
  {
    id: "units",
    title: "Unit Management",
    description: "Add and manage your property units. Track availability, set rental rates, and view unit details at a glance.",
    icon: Building2,
  },
  {
    id: "tenants",
    title: "Tenant Profiles",
    description: "Manage tenant information, contact details, and rental history. Keep all tenant data organized and accessible.",
    icon: Users,
  },
  {
    id: "leases",
    title: "Lease Management",
    description: "Create and track leases. Set terms, payment schedules, and manage the entire lease lifecycle.",
    icon: FileText,
  },
  {
    id: "rent",
    title: "Rent Collection",
    description: "Track rent payments, send reminders, and manage overdue accounts. Never miss a payment again.",
    icon: Wallet,
  },
  {
    id: "complete",
    title: "You're All Set!",
    description: "Use ⌘K (or Ctrl+K) anytime to quickly navigate. Need help? Check the Documentation in Settings.",
    icon: Sparkles,
  },
];

// Hotel tour steps
const hotelTourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Hotel Management! 🏨",
    description: "Your hotel dashboard shows occupancy rates, arrivals, departures, and key metrics at a glance.",
    icon: LayoutDashboard,
  },
  {
    id: "frontdesk",
    title: "Front Desk Operations",
    description: "Handle check-ins, check-outs, and room assignments. Manage guest IDs and key cards seamlessly.",
    icon: Hotel,
  },
  {
    id: "rooms",
    title: "Room Management",
    description: "View room status, availability, and housekeeping needs. Manage rates and room types easily.",
    icon: BedDouble,
  },
  {
    id: "reservations",
    title: "Reservations",
    description: "Create, modify, and track reservations. View upcoming arrivals and manage booking details.",
    icon: ClipboardList,
  },
  {
    id: "settings",
    title: "Customize Your Experience",
    description: "Configure hotel settings, manage staff, and personalize the platform to fit your needs.",
    icon: Settings,
  },
  {
    id: "complete",
    title: "You're All Set!",
    description: "Use ⌘K (or Ctrl+K) anytime to quickly navigate. Need help? Check the Documentation in Settings.",
    icon: Sparkles,
  },
];

// Restaurant tour steps
const restaurantTourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Restaurant Management! 🍽️",
    description: "Your restaurant dashboard shows sales, orders, and table status at a glance.",
    icon: LayoutDashboard,
  },
  {
    id: "pos",
    title: "Point of Sale",
    description: "Take orders quickly with our intuitive POS. Add items, modifiers, and process payments easily.",
    icon: ShoppingCart,
  },
  {
    id: "tables",
    title: "Table Management",
    description: "View table layout, manage seating, and track table status in real-time.",
    icon: Utensils,
  },
  {
    id: "menu",
    title: "Menu Management",
    description: "Add and organize menu items. Set prices, descriptions, and categorize dishes.",
    icon: Package,
  },
  {
    id: "settings",
    title: "Customize Your Experience",
    description: "Configure restaurant settings, manage staff, and personalize the platform.",
    icon: Settings,
  },
  {
    id: "complete",
    title: "You're All Set!",
    description: "Use ⌘K (or Ctrl+K) anytime to quickly navigate. Need help? Check the Documentation in Settings.",
    icon: Sparkles,
  },
];

// Pharmacy tour steps
const pharmacyTourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Pharmacy Management! 💊",
    description: "Your pharmacy dashboard shows prescriptions, inventory alerts, and key metrics.",
    icon: LayoutDashboard,
  },
  {
    id: "prescriptions",
    title: "Prescription Management",
    description: "Process prescriptions, track refills, and manage patient medications safely.",
    icon: Pill,
  },
  {
    id: "patients",
    title: "Patient Profiles",
    description: "Manage patient information, allergies, and medication history for safe dispensing.",
    icon: Stethoscope,
  },
  {
    id: "inventory",
    title: "Inventory Management",
    description: "Track medication stock, manage expiry dates, and set reorder alerts.",
    icon: Package,
  },
  {
    id: "settings",
    title: "Customize Your Experience",
    description: "Configure pharmacy settings, manage staff, and set up compliance features.",
    icon: Settings,
  },
  {
    id: "complete",
    title: "You're All Set!",
    description: "Use ⌘K (or Ctrl+K) anytime to quickly navigate. Need help? Check the Documentation in Settings.",
    icon: Sparkles,
  },
];

interface ProductTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function ProductTour({ onComplete, onSkip }: ProductTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { user, currentOrganization } = useAuth();
  
  // Get tour steps based on vertical
  const vertical = currentOrganization?.primary_vertical || 'retail';
  const tourSteps = React.useMemo(() => {
    switch (vertical) {
      case 'property':
        return propertyTourSteps;
      case 'hotel':
        return hotelTourSteps;
      case 'restaurant':
        return restaurantTourSteps;
      case 'pharmacy':
        return pharmacyTourSteps;
      default:
        return retailTourSteps;
    }
  }, [vertical]);
  
  const progress = ((currentStep + 1) / tourSteps.length) * 100;
  const step = tourSteps[currentStep];
  const Icon = step.icon;

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (user) {
      await supabase
        .from("profiles")
        .update({ tour_completed: true })
        .eq("id", user.id);
    }
    onComplete();
  };

  const handleSkip = async () => {
    if (user) {
      await supabase
        .from("profiles")
        .update({ tour_completed: true })
        .eq("id", user.id);
    }
    onSkip();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4 shadow-2xl border-2">
        <CardHeader className="relative pb-2">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2"
            onClick={handleSkip}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                Step {currentStep + 1} of {tourSteps.length}
              </p>
              <CardTitle className="text-lg">{step.title}</CardTitle>
            </div>
          </div>
          <Progress value={progress} className="h-1" />
        </CardHeader>
        
        <CardContent className="pt-4">
          <p className="text-muted-foreground">{step.description}</p>
        </CardContent>
        
        <CardFooter className="flex justify-between gap-2">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleSkip}>
              Skip Tour
            </Button>
            <Button onClick={handleNext}>
              {currentStep === tourSteps.length - 1 ? (
                "Get Started"
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
