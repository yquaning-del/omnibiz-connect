import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PaymentMethodSelector } from "./PaymentMethodSelector";
import { MobileMoneyForm } from "./MobileMoneyForm";
import { Country } from "./CountrySelector";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface PaystackCheckoutProps {
  open: boolean;
  onClose: () => void;
  planName: string;
  amount: number;
  currency: string;
  currencySymbol: string;
  country: Country;
  onSuccess: (reference: string) => void;
  billingCycle: "monthly" | "yearly";
}

type PaymentStatus = "idle" | "processing" | "success" | "failed";

export function PaystackCheckout({
  open,
  onClose,
  planName,
  amount,
  currency,
  currencySymbol,
  country,
  onSuccess,
  billingCycle,
}: PaystackCheckoutProps) {
  const [paymentMethod, setPaymentMethod] = useState<"card" | "mobile_money">("card");
  const [email, setEmail] = useState("");
  const [mobileMoneyData, setMobileMoneyData] = useState({ phone: "", network: "" });
  const [status, setStatus] = useState<PaymentStatus>("idle");

  const showMobileMoney = country.code === "GH";

  const handlePayment = async () => {
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    if (paymentMethod === "mobile_money" && (!mobileMoneyData.phone || !mobileMoneyData.network)) {
      toast.error("Please complete mobile money details");
      return;
    }

    setStatus("processing");

    // PLACEHOLDER: Simulate Paystack payment
    // In production, this would call the paystack-payment edge function
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Simulate 90% success rate for testing
      const isSuccess = Math.random() > 0.1;

      if (isSuccess) {
        const mockReference = `PSK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setStatus("success");
        
        setTimeout(() => {
          onSuccess(mockReference);
          toast.success("Payment successful! Your subscription is now active.");
        }, 1500);
      } else {
        setStatus("failed");
        toast.error("Payment failed. Please try again.");
      }
    } catch (error) {
      setStatus("failed");
      toast.error("Payment failed. Please try again.");
    }
  };

  const resetAndClose = () => {
    setStatus("idle");
    setPaymentMethod("card");
    setEmail("");
    setMobileMoneyData({ phone: "", network: "" });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Payment</DialogTitle>
          <DialogDescription>
            Subscribe to {planName} - {billingCycle === "yearly" ? "Annual" : "Monthly"} plan
          </DialogDescription>
        </DialogHeader>

        {status === "success" ? (
          <div className="py-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Payment Successful!</h3>
            <p className="text-muted-foreground">
              Your subscription is now active. Redirecting...
            </p>
          </div>
        ) : status === "failed" ? (
          <div className="py-8 text-center">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Payment Failed</h3>
            <p className="text-muted-foreground mb-4">
              Something went wrong. Please try again.
            </p>
            <Button onClick={() => setStatus("idle")}>Try Again</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Plan Summary */}
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex justify-between items-center">
                <span className="font-medium">{planName}</span>
                <span className="text-lg font-bold">
                  {currencySymbol}{amount.toLocaleString()}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{billingCycle === "yearly" ? "year" : "month"}
                  </span>
                </span>
              </div>
              {billingCycle === "yearly" && (
                <p className="text-xs text-green-600 mt-1">Save 17% with annual billing</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <PaymentMethodSelector
                value={paymentMethod}
                onChange={setPaymentMethod}
                showMobileMoney={showMobileMoney}
              />
            </div>

            {/* Mobile Money Form */}
            {paymentMethod === "mobile_money" && showMobileMoney && (
              <MobileMoneyForm onDataChange={setMobileMoneyData} />
            )}

            {/* Card placeholder */}
            {paymentMethod === "card" && (
              <div className="p-4 rounded-lg border border-dashed border-muted-foreground/50 text-center text-muted-foreground">
                <p className="text-sm">Card payment form</p>
                <p className="text-xs">(Paystack integration placeholder)</p>
              </div>
            )}

            {/* Pay Button */}
            <Button
              onClick={handlePayment}
              className="w-full"
              size="lg"
              disabled={status === "processing"}
            >
              {status === "processing" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Pay {currencySymbol}{amount.toLocaleString()}</>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Secured by Paystack. Your payment information is encrypted.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
