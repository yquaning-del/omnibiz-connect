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
import { Loader2, Calendar, Users, BedDouble, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const guestSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(5, 'Phone number is required'),
  specialRequests: z.string().optional(),
});

type GuestFormData = z.infer<typeof guestSchema>;

interface GuestInfoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: GuestFormData) => Promise<void>;
  roomDetails: {
    room_type: string;
    room_number: string;
    price_per_night: number;
  } | null;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  currencySymbol?: string;
}

export function GuestInfoForm({
  open,
  onOpenChange,
  onSubmit,
  roomDetails,
  checkIn,
  checkOut,
  guests,
  currencySymbol = '$',
}: GuestInfoFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<GuestFormData>({
    resolver: zodResolver(guestSchema),
  });

  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  const totalPrice = roomDetails ? roomDetails.price_per_night * nights : 0;

  const handleFormSubmit = async (data: GuestFormData) => {
    setSubmitting(true);
    try {
      await onSubmit(data);
      setSuccess(true);
      setTimeout(() => {
        reset();
        setSuccess(false);
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
            <h3 className="text-xl font-semibold text-foreground mb-2">Booking Confirmed!</h3>
            <p className="text-muted-foreground">
              We've sent a confirmation email with your booking details.
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
          <DialogTitle>Complete Your Booking</DialogTitle>
          <DialogDescription>
            Enter your details to confirm your reservation
          </DialogDescription>
        </DialogHeader>

        {/* Booking Summary */}
        {roomDetails && (
          <Card className="p-4 bg-muted/30 border-border/50">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <BedDouble className="h-4 w-4 text-primary" />
                <span className="font-medium">
                  {roomDetails.room_type.charAt(0).toUpperCase() + roomDetails.room_type.slice(1)} Room
                </span>
                <Badge variant="outline" className="ml-auto">
                  Room {roomDetails.room_number}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Check-in</p>
                    <p className="font-medium">{format(checkIn, 'MMM d, yyyy')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Check-out</p>
                    <p className="font-medium">{format(checkOut, 'MMM d, yyyy')}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{guests} guest{guests !== 1 ? 's' : ''}</span>
                <span className="text-muted-foreground">•</span>
                <span>{nights} night{nights !== 1 ? 's' : ''}</span>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="text-xl font-bold text-foreground">
                  {currencySymbol}{totalPrice.toFixed(0)}
                </span>
              </div>
            </div>
          </Card>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              placeholder="John Doe"
              {...register('fullName')}
              className={errors.fullName ? 'border-destructive' : ''}
            />
            {errors.fullName && (
              <p className="text-xs text-destructive">{errors.fullName.message}</p>
            )}
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
            <Label htmlFor="specialRequests">Special Requests</Label>
            <Textarea
              id="specialRequests"
              placeholder="Any special requirements or preferences..."
              {...register('specialRequests')}
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Confirming Booking...
              </>
            ) : (
              `Confirm Booking - ${currencySymbol}${totalPrice.toFixed(0)}`
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            By confirming, you agree to our booking terms and conditions.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
