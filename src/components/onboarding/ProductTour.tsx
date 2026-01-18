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
  Sparkles
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

const tourSteps: TourStep[] = [
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

interface ProductTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function ProductTour({ onComplete, onSkip }: ProductTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { user } = useAuth();
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
