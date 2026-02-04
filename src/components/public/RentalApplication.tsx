import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Building2, CalendarDays, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const applicationSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(5, 'Phone number is required'),
  currentAddress: z.string().min(5, 'Current address is required'),
  employerName: z.string().optional(),
  monthlyIncome: z.string().optional(),
  additionalNotes: z.string().optional(),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

interface RentalApplicationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ApplicationFormData & { moveInDate: Date }) => Promise<void>;
  unitDetails: {
    unit_number: string;
    unit_type: string;
    monthly_rent: number;
    bedrooms: number | null;
    bathrooms: number | null;
  } | null;
  currencySymbol?: string;
}

export function RentalApplication({
  open,
  onOpenChange,
  onSubmit,
  unitDetails,
  currencySymbol = '$',
}: RentalApplicationProps) {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [moveInDate, setMoveInDate] = useState<Date | undefined>(undefined);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
  });

  const handleFormSubmit = async (data: ApplicationFormData) => {
    if (!moveInDate) return;
    
    setSubmitting(true);
    try {
      await onSubmit({ ...data, moveInDate });
      setSuccess(true);
      setTimeout(() => {
        reset();
        setSuccess(false);
        setMoveInDate(undefined);
        onOpenChange(false);
      }, 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      reset();
      setSuccess(false);
      setMoveInDate(undefined);
      onOpenChange(false);
    }
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-success/20 p-4 mb-4">
              <CheckCircle className="h-12 w-12 text-success" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Application Submitted!</h3>
            <p className="text-muted-foreground">
              We'll review your application and get back to you within 2-3 business days.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rental Application</DialogTitle>
          <DialogDescription>
            Complete this form to apply for the unit
          </DialogDescription>
        </DialogHeader>

        {/* Unit Summary */}
        {unitDetails && (
          <Card className="p-4 bg-muted/30 border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-property/20">
                <Building2 className="h-5 w-5 text-property" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-foreground">
                  Unit {unitDetails.unit_number}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {unitDetails.unit_type} • {unitDetails.bedrooms || 0} bed • {unitDetails.bathrooms || 0} bath
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-foreground">
                  {currencySymbol}{unitDetails.monthly_rent.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">per month</p>
              </div>
            </div>
          </Card>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Personal Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Personal Information</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  {...register('firstName')}
                  className={errors.firstName ? 'border-destructive' : ''}
                />
                {errors.firstName && (
                  <p className="text-xs text-destructive">{errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  {...register('lastName')}
                  className={errors.lastName ? 'border-destructive' : ''}
                />
                {errors.lastName && (
                  <p className="text-xs text-destructive">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                {...register('email')}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                placeholder="+1 234 567 8900"
                {...register('phone')}
                className={errors.phone ? 'border-destructive' : ''}
              />
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentAddress">Current Address *</Label>
              <Input
                id="currentAddress"
                placeholder="123 Main St, City, Country"
                {...register('currentAddress')}
                className={errors.currentAddress ? 'border-destructive' : ''}
              />
              {errors.currentAddress && (
                <p className="text-xs text-destructive">{errors.currentAddress.message}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Employment Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Employment Information (Optional)</h4>
            
            <div className="space-y-2">
              <Label htmlFor="employerName">Employer Name</Label>
              <Input
                id="employerName"
                placeholder="Company Inc."
                {...register('employerName')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthlyIncome">Monthly Income</Label>
              <Input
                id="monthlyIncome"
                placeholder={`${currencySymbol}5,000`}
                {...register('monthlyIncome')}
              />
            </div>
          </div>

          <Separator />

          {/* Move-in Date */}
          <div className="space-y-2">
            <Label>Preferred Move-in Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !moveInDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {moveInDate ? format(moveInDate, 'PPP') : 'Select a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={moveInDate}
                  onSelect={setMoveInDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="additionalNotes">Additional Notes</Label>
            <Textarea
              id="additionalNotes"
              placeholder="Any additional information you'd like us to know..."
              {...register('additionalNotes')}
              rows={3}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            size="lg" 
            disabled={submitting || !moveInDate}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting Application...
              </>
            ) : (
              'Submit Application'
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            By submitting, you agree to our rental application terms and authorize a background check.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
