import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, BedDouble, Bath, Square, MapPin, Check, Home, Sparkles } from 'lucide-react';

interface UnitListingCardProps {
  unit: {
    id: string;
    unit_number: string;
    unit_type: string;
    bedrooms: number | null;
    bathrooms: number | null;
    square_feet?: number | null;
    monthly_rent: number;
    security_deposit: number | null;
    amenities: string[] | null;
    status: string;
    address?: string | null;
  };
  onApply: (unitId: string) => void;
  currencySymbol?: string;
}

const UNIT_TYPE_CONFIG: Record<string, { color: string; bgColor: string; label: string }> = {
  studio: { color: 'text-muted-foreground', bgColor: 'bg-muted', label: 'Studio' },
  apartment: { color: 'text-info', bgColor: 'bg-info/10', label: 'Apartment' },
  house: { color: 'text-success', bgColor: 'bg-success/10', label: 'House' },
  condo: { color: 'text-property', bgColor: 'bg-property/10', label: 'Condo' },
  townhouse: { color: 'text-warning', bgColor: 'bg-warning/10', label: 'Townhouse' },
  commercial: { color: 'text-primary', bgColor: 'bg-primary/10', label: 'Commercial' },
};

export function UnitListingCard({ unit, onApply, currencySymbol = '$' }: UnitListingCardProps) {
  const isAvailable = unit.status === 'available' || unit.status === 'vacant';
  const unitConfig = UNIT_TYPE_CONFIG[unit.unit_type?.toLowerCase()] || UNIT_TYPE_CONFIG.apartment;
  
  return (
    <Card className="group overflow-hidden border-border/50 bg-card/50 transition-all duration-300 hover:border-property/30 hover:shadow-xl hover:shadow-property/5">
      {/* Unit Image Placeholder */}
      <div className="relative h-52 bg-gradient-to-br from-property/20 via-property/10 to-muted/50 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <Home className="h-20 w-20 text-property/20 group-hover:scale-110 transition-transform duration-300" />
        </div>
        
        {/* Unit type badge */}
        <Badge className={`absolute left-3 top-3 ${unitConfig.bgColor} ${unitConfig.color} border-0 shadow-sm`}>
          <Sparkles className="mr-1 h-3 w-3" />
          {unitConfig.label}
        </Badge>
        
        {/* Availability overlay */}
        {!isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <Badge variant="destructive" className="text-sm px-4 py-1.5">Not Available</Badge>
          </div>
        )}
        
        {/* Price overlay */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-background/90 to-transparent p-4">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-foreground">
              {currencySymbol}{unit.monthly_rent.toLocaleString()}
            </span>
            <span className="text-sm text-muted-foreground">/ month</span>
          </div>
        </div>
      </div>

      <CardContent className="p-5 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground group-hover:text-property transition-colors">
            Unit {unit.unit_number}
          </h3>
          {unit.address && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-1">{unit.address}</span>
            </p>
          )}
        </div>

        {/* Features */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {unit.bedrooms !== null && (
            <div className="flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1.5">
              <BedDouble className="h-4 w-4 text-property" />
              <span className="text-foreground font-medium">{unit.bedrooms}</span>
              <span className="text-muted-foreground">bed{unit.bedrooms !== 1 ? 's' : ''}</span>
            </div>
          )}
          {unit.bathrooms !== null && (
            <div className="flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1.5">
              <Bath className="h-4 w-4 text-property" />
              <span className="text-foreground font-medium">{unit.bathrooms}</span>
              <span className="text-muted-foreground">bath{unit.bathrooms !== 1 ? 's' : ''}</span>
            </div>
          )}
          {unit.square_feet !== null && (
            <div className="flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1.5">
              <Square className="h-4 w-4 text-property" />
              <span className="text-foreground font-medium">{unit.square_feet.toLocaleString()}</span>
              <span className="text-muted-foreground">sqft</span>
            </div>
          )}
        </div>

        {/* Amenities */}
        {unit.amenities && unit.amenities.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {unit.amenities.slice(0, 3).map((amenity) => (
              <Badge key={amenity} variant="outline" className="text-xs font-normal border-border/50 bg-muted/30">
                <Check className="h-3 w-3 mr-1 text-property" />
                {amenity}
              </Badge>
            ))}
            {unit.amenities.length > 3 && (
              <Badge variant="outline" className="text-xs font-normal border-border/50">
                +{unit.amenities.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Deposit info */}
        {unit.security_deposit !== null && (
          <div className="rounded-lg bg-muted/30 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Security Deposit</span>
              <span className="font-semibold text-foreground">{currencySymbol}{unit.security_deposit.toLocaleString()}</span>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="p-5 pt-0">
        <Button 
          onClick={() => onApply(unit.id)} 
          className="w-full h-11 text-base shadow-sm"
          disabled={!isAvailable}
          variant={isAvailable ? 'default' : 'secondary'}
        >
          {isAvailable ? 'Apply Now' : 'Not Available'}
        </Button>
      </CardFooter>
    </Card>
  );
}
