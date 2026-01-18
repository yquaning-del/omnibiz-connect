import { cn } from "@/lib/utils";
import { CreditCard, Smartphone } from "lucide-react";

interface PaymentMethodSelectorProps {
  value: "card" | "mobile_money";
  onChange: (method: "card" | "mobile_money") => void;
  showMobileMoney?: boolean;
}

export function PaymentMethodSelector({
  value,
  onChange,
  showMobileMoney = true,
}: PaymentMethodSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={() => onChange("card")}
        className={cn(
          "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
          value === "card"
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        )}
      >
        <CreditCard className={cn("h-8 w-8", value === "card" ? "text-primary" : "text-muted-foreground")} />
        <span className={cn("font-medium", value === "card" ? "text-primary" : "text-foreground")}>
          Card
        </span>
        <span className="text-xs text-muted-foreground">Visa, Mastercard</span>
      </button>

      {showMobileMoney && (
        <button
          type="button"
          onClick={() => onChange("mobile_money")}
          className={cn(
            "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
            value === "mobile_money"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          )}
        >
          <Smartphone className={cn("h-8 w-8", value === "mobile_money" ? "text-primary" : "text-muted-foreground")} />
          <span className={cn("font-medium", value === "mobile_money" ? "text-primary" : "text-foreground")}>
            Mobile Money
          </span>
          <span className="text-xs text-muted-foreground">MTN, Vodafone, AirtelTigo</span>
        </button>
      )}
    </div>
  );
}
