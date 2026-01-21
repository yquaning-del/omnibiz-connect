import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight, 
  ArrowLeft, 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users,
  BarChart3,
  Pill,
  Building2,
  UtensilsCrossed,
  Store,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DemoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const demoSteps = [
  {
    title: 'Welcome to HospitalityOS',
    description: 'Your all-in-one platform for managing restaurants, hotels, pharmacies, and retail businesses.',
    icon: Sparkles,
    color: 'text-primary',
    features: [
      'Unified dashboard for all verticals',
      'Real-time analytics & insights',
      'AI-powered recommendations',
    ],
  },
  {
    title: 'Point of Sale',
    description: 'Fast, intuitive POS system designed for high-volume transactions with touch-optimized interface.',
    icon: ShoppingCart,
    color: 'text-success',
    features: [
      'Quick product search & barcode scanning',
      'Multiple payment methods',
      'Automatic receipt generation',
      'Discount & promotion support',
    ],
  },
  {
    title: 'Inventory Management',
    description: 'Track stock levels across all locations with automated low-stock alerts and reorder suggestions.',
    icon: Package,
    color: 'text-retail',
    features: [
      'Real-time stock tracking',
      'Low stock alerts',
      'Multi-location inventory',
      'Expiry date management',
    ],
  },
  {
    title: 'Restaurant Features',
    description: 'Manage tables, kitchen displays, and reservations for seamless restaurant operations.',
    icon: UtensilsCrossed,
    color: 'text-restaurant',
    features: [
      'Interactive table layout',
      'Kitchen display system',
      'Reservation management',
      'Order tracking',
    ],
  },
  {
    title: 'Hotel Management',
    description: 'Complete room management with housekeeping coordination and guest reservations.',
    icon: Building2,
    color: 'text-hotel',
    features: [
      'Room status tracking',
      'Housekeeping tasks',
      'Guest check-in/out',
      'Booking calendar',
    ],
  },
  {
    title: 'Pharmacy Module',
    description: 'Comprehensive pharmacy management with prescription tracking and drug interaction alerts.',
    icon: Pill,
    color: 'text-pharmacy',
    features: [
      'Prescription management',
      'Patient profiles & history',
      'AI drug interaction alerts',
      'Insurance billing',
    ],
  },
  {
    title: 'Analytics & Reports',
    description: 'Make data-driven decisions with AI-powered insights and comprehensive reporting.',
    icon: BarChart3,
    color: 'text-primary',
    features: [
      'Sales forecasting',
      'Performance dashboards',
      'Custom report builder',
      'Export to PDF/Excel',
    ],
  },
  {
    title: 'Property Management',
    description: 'Complete solution for managing apartments, tenants, leases, and rent collection.',
    icon: Building2,
    color: 'text-property',
    features: [
      'Unit & tenant management',
      'Lease lifecycle tracking',
      'Rent collection & reminders',
      'Tenant application screening',
    ],
  },
];

export function DemoModal({ open, onOpenChange }: DemoModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < demoSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onOpenChange(false);
      setCurrentStep(0);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setCurrentStep(0);
  };

  const step = demoSteps[currentStep];
  const StepIcon = step.icon;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl bg-card/95 backdrop-blur-xl border-border/50">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="text-xs">
              {currentStep + 1} of {demoSteps.length}
            </Badge>
          </div>
          <DialogTitle className="flex items-center gap-3 text-2xl font-display">
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center',
              'bg-gradient-to-br from-primary/20 to-accent/20'
            )}>
              <StepIcon className={cn('w-6 h-6', step.color)} />
            </div>
            {step.title}
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            {step.description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <div className="grid gap-3">
            {step.features.map((feature, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50"
              >
                <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                <span className="text-foreground">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 py-4">
          {demoSteps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={cn(
                'w-2 h-2 rounded-full transition-all',
                index === currentStep 
                  ? 'w-6 bg-primary' 
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              )}
            />
          ))}
        </div>

        <div className="flex justify-between gap-3">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </Button>
          
          <Button onClick={handleNext} className="gap-2">
            {currentStep === demoSteps.length - 1 ? (
              <>
                Get Started
                <CheckCircle2 className="w-4 h-4" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}