import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface MobileMoneyFormProps {
  onDataChange: (data: { phone: string; network: string }) => void;
}

const MOBILE_NETWORKS = [
  { id: "mtn", name: "MTN Mobile Money", color: "bg-yellow-500" },
  { id: "vodafone", name: "Vodafone Cash", color: "bg-red-500" },
  { id: "airteltigo", name: "AirtelTigo Money", color: "bg-blue-500" },
];

export function MobileMoneyForm({ onDataChange }: MobileMoneyFormProps) {
  const [phone, setPhone] = useState("");
  const [network, setNetwork] = useState("");

  const formatPhoneNumber = (value: string) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, "");
    
    // Format as Ghana phone number
    if (digits.startsWith("233")) {
      return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 12)}`.trim();
    } else if (digits.startsWith("0")) {
      return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`.trim();
    }
    return value;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
    onDataChange({ phone: formatted, network });
  };

  const handleNetworkChange = (value: string) => {
    setNetwork(value);
    onDataChange({ phone, network: value });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="network">Mobile Network</Label>
        <Select value={network} onValueChange={handleNetworkChange}>
          <SelectTrigger id="network">
            <SelectValue placeholder="Select your network" />
          </SelectTrigger>
          <SelectContent>
            {MOBILE_NETWORKS.map((net) => (
              <SelectItem key={net.id} value={net.id}>
                <div className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-full", net.color)} />
                  {net.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Mobile Money Number</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="024 XXX XXXX"
          value={phone}
          onChange={handlePhoneChange}
        />
        <p className="text-xs text-muted-foreground">
          Enter the phone number linked to your mobile money account
        </p>
      </div>

      {network && (
        <div className="p-3 rounded-lg bg-muted/50 text-sm">
          <p className="font-medium mb-1">How it works:</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Click "Pay Now" to initiate payment</li>
            <li>You'll receive a prompt on your phone</li>
            <li>Enter your PIN to authorize the payment</li>
            <li>You'll be redirected once payment is confirmed</li>
          </ol>
        </div>
      )}
    </div>
  );
}
