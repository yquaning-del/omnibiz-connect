import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { formatCurrency, type SupportedCurrency } from '@/lib/currency';
import { Loader2, CreditCard, Smartphone, Truck } from 'lucide-react';
import type { CartItem } from '@/hooks/useCart';
import { openPaystackPopup, convertToSmallestUnit, generateTransactionReference } from '@/lib/paystack';
import { toast } from 'sonner';

const checkoutSchema = z.object({
  fullName: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  addressLine1: z.string().min(5, 'Address is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default('Kenya'),
  paymentMethod: z.enum(['card', 'paystack', 'mpesa', 'bank_transfer']),
  shippingMethod: z.enum(['standard', 'express', 'pickup']),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

interface CheckoutFormProps {
  items: CartItem[];
  subtotal: number;
  currency?: SupportedCurrency;
  onSubmit: (data: CheckoutFormData, transactionReference?: string) => Promise<void>;
  onCancel: () => void;
  paystackPublicKey?: string; // Paystack public key (defaults to test key placeholder)
}

const SHIPPING_RATES = {
  standard: 250,
  express: 500,
  pickup: 0,
};

export function CheckoutForm({
  items,
  subtotal,
  currency = 'KES',
  onSubmit,
  onCancel,
  paystackPublicKey = 'pk_test_xxxxxxxxxxxxx',
}: CheckoutFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      country: 'Kenya',
      paymentMethod: 'mpesa',
      shippingMethod: 'standard',
    },
  });

  const shippingMethod = form.watch('shippingMethod');
  const shippingCost = SHIPPING_RATES[shippingMethod];
  const total = subtotal + shippingCost;
  const paymentMethod = form.watch('paymentMethod');

  const handleSubmit = async (data: CheckoutFormData) => {
    // Handle Paystack payment (card or paystack method)
    if (data.paymentMethod === 'card' || data.paymentMethod === 'paystack') {
      setSubmitting(true);
      try {
        const transactionRef = generateTransactionReference();
        const amountInSmallestUnit = convertToSmallestUnit(total);

        // Map currency codes to Paystack-supported currencies
        // Paystack supports: NGN, GHS, ZAR, KES, USD, etc.
        const paystackCurrency = currency === 'KES' ? 'KES' : currency;
        
        await openPaystackPopup({
          key: paystackPublicKey,
          email: data.email,
          amount: amountInSmallestUnit,
          currency: paystackCurrency,
          ref: transactionRef,
          callback: async (response) => {
            // Payment successful
            if (response.status === 'success' || response.reference) {
              try {
                await onSubmit(data, response.reference);
              } catch (error) {
                console.error('Error processing order after payment:', error);
                toast({
                  title: 'Payment successful, but order failed',
                  description: 'Please contact support with your transaction reference: ' + response.reference,
                  variant: 'destructive',
                });
                setSubmitting(false);
              }
            } else {
              toast({
                title: 'Payment failed',
                description: response.message || 'Payment was not successful. Please try again.',
                variant: 'destructive',
              });
              setSubmitting(false);
            }
          },
          onClose: () => {
            // User closed the popup
            toast.success("Payment cancelled", { description: "You cancelled the payment. You can try again when ready." });
            setSubmitting(false);
          },
          metadata: {
            fullName: data.fullName,
            phone: data.phone,
            orderItems: items.length,
          },
        });
      } catch (error) {
        console.error('Error opening Paystack popup:', error);
        toast({
          title: 'Payment error',
          description: error instanceof Error ? error.message : 'Failed to initialize payment. Please try again.',
          variant: 'destructive',
        });
        setSubmitting(false);
      }
      return;
    }

    // Handle other payment methods (mpesa, bank_transfer)
    setSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Checkout Form */}
      <div className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+254 712 345 678" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Shipping Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="addressLine1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main Street" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="addressLine2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apartment, suite, etc. (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Apt 4B" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="Nairobi" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input placeholder="00100" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Shipping Method */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Shipping Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="shippingMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          className="space-y-3"
                        >
                          <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="flex items-center gap-3">
                              <RadioGroupItem value="standard" id="standard" />
                              <Label htmlFor="standard" className="cursor-pointer">
                                <div className="font-medium">Standard Delivery</div>
                                <div className="text-sm text-muted-foreground">3-5 business days</div>
                              </Label>
                            </div>
                            <span className="font-medium">{formatCurrency(250, currency)}</span>
                          </div>
                          <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="flex items-center gap-3">
                              <RadioGroupItem value="express" id="express" />
                              <Label htmlFor="express" className="cursor-pointer">
                                <div className="font-medium">Express Delivery</div>
                                <div className="text-sm text-muted-foreground">1-2 business days</div>
                              </Label>
                            </div>
                            <span className="font-medium">{formatCurrency(500, currency)}</span>
                          </div>
                          <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="flex items-center gap-3">
                              <RadioGroupItem value="pickup" id="pickup" />
                              <Label htmlFor="pickup" className="cursor-pointer">
                                <div className="font-medium">Store Pickup</div>
                                <div className="text-sm text-muted-foreground">Ready in 24 hours</div>
                              </Label>
                            </div>
                            <span className="font-medium text-green-600">Free</span>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          className="space-y-3"
                        >
                          <div className="flex items-center gap-3 rounded-lg border p-4">
                            <RadioGroupItem value="mpesa" id="mpesa" />
                            <Label htmlFor="mpesa" className="flex cursor-pointer items-center gap-2">
                              <Smartphone className="h-5 w-5 text-green-600" />
                              <div>
                                <div className="font-medium">M-Pesa</div>
                                <div className="text-sm text-muted-foreground">Pay via mobile money</div>
                              </div>
                            </Label>
                          </div>
                          <div className="flex items-center gap-3 rounded-lg border p-4">
                            <RadioGroupItem value="card" id="card" />
                            <Label htmlFor="card" className="flex cursor-pointer items-center gap-2">
                              <CreditCard className="h-5 w-5 text-blue-600" />
                              <div>
                                <div className="font-medium">Card Payment (Paystack)</div>
                                <div className="text-sm text-muted-foreground">Visa, Mastercard, etc. - Secure payment via Paystack</div>
                              </div>
                            </Label>
                          </div>
                          <div className="flex items-center gap-3 rounded-lg border p-4">
                            <RadioGroupItem value="paystack" id="paystack" />
                            <Label htmlFor="paystack" className="flex cursor-pointer items-center gap-2">
                              <CreditCard className="h-5 w-5 text-purple-600" />
                              <div>
                                <div className="font-medium">Paystack</div>
                                <div className="text-sm text-muted-foreground">Pay securely with card or mobile money</div>
                              </div>
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                Back to Cart
              </Button>
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {paymentMethod === 'card' || paymentMethod === 'paystack' ? 'Pay Now' : 'Place Order'}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      {/* Order Summary */}
      <div className="lg:sticky lg:top-4">
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Items */}
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <div className="flex gap-2">
                    <span className="text-muted-foreground">{item.quantity}×</span>
                    <span>{item.product_name}</span>
                  </div>
                  <span>{formatCurrency(item.unit_price * item.quantity, currency)}</span>
                </div>
              ))}
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal, currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span>{shippingCost === 0 ? 'Free' : formatCurrency(shippingCost, currency)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>{formatCurrency(total, currency)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
