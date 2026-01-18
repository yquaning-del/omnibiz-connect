import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, ChevronDown } from "lucide-react";

interface Country {
  code: string;
  name: string;
  currency: string;
  symbol: string;
  flag: string;
}

const SUPPORTED_COUNTRIES: Country[] = [
  { code: "GH", name: "Ghana", currency: "GHS", symbol: "₵", flag: "🇬🇭" },
  { code: "US", name: "United States", currency: "USD", symbol: "$", flag: "🇺🇸" },
];

interface CountrySelectorProps {
  value: string;
  onChange: (country: Country) => void;
}

export function CountrySelector({ value, onChange }: CountrySelectorProps) {
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    SUPPORTED_COUNTRIES.find((c) => c.code === value) || SUPPORTED_COUNTRIES[0]
  );

  useEffect(() => {
    const saved = localStorage.getItem("selectedCountry");
    if (saved) {
      const country = SUPPORTED_COUNTRIES.find((c) => c.code === saved);
      if (country) {
        setSelectedCountry(country);
        onChange(country);
      }
    }
  }, []);

  const handleSelect = (country: Country) => {
    setSelectedCountry(country);
    localStorage.setItem("selectedCountry", country.code);
    onChange(country);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="text-lg">{selectedCountry.flag}</span>
          <span>{selectedCountry.currency}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_COUNTRIES.map((country) => (
          <DropdownMenuItem
            key={country.code}
            onClick={() => handleSelect(country)}
            className="gap-2 cursor-pointer"
          >
            <span className="text-lg">{country.flag}</span>
            <span>{country.name}</span>
            <span className="text-muted-foreground">({country.symbol})</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { SUPPORTED_COUNTRIES };
export type { Country };
