import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MapPin, Building2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  LEASE_COUNTRIES,
  getStatesForCountry,
  getCitiesForCountry,
  getLocationValidationError,
} from '@/lib/leaseLocations';

interface LocationConfirmStepProps {
  formData: {
    country: string;
    state: string;
    city: string;
    address: string;
  };
  unitDetails?: {
    unit_number: string;
    unit_type: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  onFormDataChange: (updates: Partial<{
    country: string;
    state: string;
    city: string;
    address: string;
  }>) => void;
}

export function LocationConfirmStep({
  formData,
  unitDetails,
  onFormDataChange,
}: LocationConfirmStepProps) {
  const selectedCountry = LEASE_COUNTRIES.find(c => c.code === formData.country);
  const states = getStatesForCountry(formData.country);
  const cities = getCitiesForCountry(formData.country);
  
  const validationError = getLocationValidationError(
    formData.country,
    formData.state,
    formData.city
  );

  const handleCountryChange = (value: string) => {
    // Reset state and city when country changes
    onFormDataChange({
      country: value,
      state: '',
      city: '',
    });
  };

  return (
    <div className="space-y-6">
      {/* Unit Info Banner */}
      {unitDetails && (
        <div className="p-4 bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-property" />
            <div>
              <p className="font-medium">Unit {unitDetails.unit_number}</p>
              <p className="text-sm text-muted-foreground capitalize">
                {unitDetails.unit_type?.replace('-', ' ')}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-muted-foreground">
        <MapPin className="h-4 w-4" />
        <span className="text-sm">
          Confirm or update the property location. This determines which lease template will be used.
        </span>
      </div>

      {/* Country Selection */}
      <div className="space-y-2">
        <Label htmlFor="country">Country *</Label>
        <Select
          value={formData.country}
          onValueChange={handleCountryChange}
        >
          <SelectTrigger id="country">
            <SelectValue placeholder="Select country" />
          </SelectTrigger>
          <SelectContent className="bg-background">
            {LEASE_COUNTRIES.map((country) => (
              <SelectItem key={country.code} value={country.code}>
                {country.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* State/Province Selection (conditional) */}
      {selectedCountry?.requiresState && states.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="state">
            {formData.country === 'CA' ? 'Province' : 'State'} *
          </Label>
          <Select
            value={formData.state}
            onValueChange={(value) => onFormDataChange({ state: value })}
          >
            <SelectTrigger id="state">
              <SelectValue placeholder={`Select ${formData.country === 'CA' ? 'province' : 'state'}`} />
            </SelectTrigger>
            <SelectContent className="bg-background max-h-[300px]">
              {states.map((state) => (
                <SelectItem key={state.code} value={state.code}>
                  {state.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* City Selection (conditional) */}
      {selectedCountry?.requiresCity && cities.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="city">City *</Label>
          <Select
            value={formData.city}
            onValueChange={(value) => onFormDataChange({ city: value })}
          >
            <SelectTrigger id="city">
              <SelectValue placeholder="Select city" />
            </SelectTrigger>
            <SelectContent className="bg-background max-h-[300px]">
              {cities.map((city) => (
                <SelectItem key={city.name} value={city.name}>
                  {city.name} ({city.region})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* City Text Input (for countries without predefined cities) */}
      {!selectedCountry?.requiresCity && (
        <div className="space-y-2">
          <Label htmlFor="city-input">City (Optional)</Label>
          <Input
            id="city-input"
            value={formData.city}
            onChange={(e) => onFormDataChange({ city: e.target.value })}
            placeholder="Enter city name"
          />
        </div>
      )}

      {/* State Text Input (for countries without predefined states) */}
      {!selectedCountry?.requiresState && formData.country !== 'OTHER' && (
        <div className="space-y-2">
          <Label htmlFor="state-input">State/Region (Optional)</Label>
          <Input
            id="state-input"
            value={formData.state}
            onChange={(e) => onFormDataChange({ state: e.target.value })}
            placeholder="Enter state or region"
          />
        </div>
      )}

      {/* Address Input */}
      <div className="space-y-2">
        <Label htmlFor="address">Property Address</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => onFormDataChange({ address: e.target.value })}
          placeholder="Enter full property address"
        />
      </div>

      {/* Validation Error */}
      {validationError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      {/* Location Preview */}
      {formData.country && !validationError && (
        <div className="p-4 bg-property/10 rounded-lg border border-property/30">
          <p className="text-sm font-medium text-property mb-1">Lease Jurisdiction</p>
          <p className="text-sm text-muted-foreground">
            {[
              formData.address,
              formData.city,
              formData.state,
              LEASE_COUNTRIES.find(c => c.code === formData.country)?.name,
            ]
              .filter(Boolean)
              .join(', ') || 'Location details will appear here'}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Template: {formData.country === 'US' && formData.state
              ? `US-${formData.state}`
              : formData.country === 'GH' && formData.city
              ? `GH-${formData.city.toUpperCase()}`
              : formData.country !== 'OTHER'
              ? formData.country
              : 'GENERIC'}
          </p>
        </div>
      )}
    </div>
  );
}
