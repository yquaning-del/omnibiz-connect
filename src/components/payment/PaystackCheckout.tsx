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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PaystackCheckoutProps {
  open: boolean;
  onClose: () => void;
  planName: string;
  planId: string;
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
  planId,
  amount,
  currency,
  currencySymbol,
  country,
  onSuccess,
  billingCycle,
}: PaystackCheckoutProps) {
  const { currentOrganization, profile } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<"card" | "mobile_money">("card");
  const [email, setEmail] = useState(profile?.email || "");
  const [mobileMoneyData, setMobileMoneyData] = useState({ phone: "", network: "" });
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

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

    if (!currentOrganization?.id) {
      toast.error("No organization selected");
      return;
    }

    setStatus("processing");
    setErrorMessage("");

    try {
      const { data, error } = await supabase.functions.invoke("paystack-payment", {
        body: {
          email,
          amount,
          currency,
          planId,
          organizationId: currentOrganization.id,
          billingCycle,
          paymentMethod,
          mobileNetwork: mobileMoneyData.network || undefined,
          mobilePhone: mobileMoneyData.phone || undefined,
        },
      });

      if (error) throw error;

      if (data?.success && data?.data?.authorization_url) {
        // Show placeholder message if in demo mode
        if (data.isPlaceholder) {
          toast.info("Demo Mode: Paystack not configured. Simulating success...");
          
          // Simulate successful payment after 2 seconds
          setTimeout(() => {
            setStatus("success");
            setTimeout(() => {
              onSuccess(data.data.reference);
              toast.success("Subscription activated successfully!");
            }, 1500);
          }, 2000);
        } else {
          // Real payment: redirect to Paystack checkout
          window.location.href = data.data.authorization_url;
        }
      } else {
        throw new Error(data?.error || "Payment initialization failed");
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      setStatus("failed");
      setErrorMessage(error.message || "Payment failed. Please try again.");
      toast.error(error.message || "Payment failed. Please try again.");
    }
  };

  const resetAndClose = () => {
    setStatus("idle");
    setPaymentMethod("card");
    setEmail(profile?.email || "");
    setMobileMoneyData({ phone: "", network: "" });
    setErrorMessage("");
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
              {errorMessage || "Something went wrong. Please try again."}
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
