import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, BedDouble, Bath, Square, MapPin, Check } from 'lucide-react';

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

const UNIT_TYPE_COLORS: Record<string, string> = {
  studio: 'bg-muted text-muted-foreground',
  apartment: 'bg-info/20 text-info',
  house: 'bg-success/20 text-success',
  condo: 'bg-property/20 text-property',
  townhouse: 'bg-warning/20 text-warning',
  commercial: 'bg-primary/20 text-primary',
};

export function UnitListingCard({ unit, onApply, currencySymbol = '$' }: UnitListingCardProps) {
  const isAvailable = unit.status === 'available' || unit.status === 'vacant';
  
  return (
    <Card className="overflow-hidden border-border/50 bg-card/50 transition-all hover:border-primary/30 hover:shadow-lg">
      {/* Unit Image Placeholder */}
      <div className="relative h-48 bg-gradient-to-br from-muted to-muted/50">
        <div className="absolute inset-0 flex items-center justify-center">
          <Building2 className="h-16 w-16 text-muted-foreground/30" />
        </div>
        <Badge className={`absolute right-3 top-3 ${UNIT_TYPE_COLORS[unit.unit_type?.toLowerCase()] || UNIT_TYPE_COLORS.apartment}`}>
          {unit.unit_type || 'Apartment'}
        </Badge>
        {!isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <Badge variant="destructive" className="text-sm">Not Available</Badge>
          </div>
        )}
      </div>

      <CardContent className="p-4 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Unit {unit.unit_number}
          </h3>
          {unit.address && (
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {unit.address}
            </p>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {unit.bedrooms !== null && (
            <div className="flex items-center gap-1">
              <BedDouble className="h-4 w-4" />
              <span>{unit.bedrooms} bed{unit.bedrooms !== 1 ? 's' : ''}</span>
            </div>
          )}
          {unit.bathrooms !== null && (
            <div className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              <span>{unit.bathrooms} bath{unit.bathrooms !== 1 ? 's' : ''}</span>
            </div>
          )}
          {unit.square_feet !== null && (
            <div className="flex items-center gap-1">
              <Square className="h-4 w-4" />
              <span>{unit.square_feet.toLocaleString()} sqft</span>
            </div>
          )}
        </div>

        {unit.amenities && unit.amenities.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {unit.amenities.slice(0, 4).map((amenity) => (
              <Badge key={amenity} variant="outline" className="text-xs">
                <Check className="h-3 w-3 mr-1" />
                {amenity}
              </Badge>
            ))}
            {unit.amenities.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{unit.amenities.length - 4} more
              </Badge>
            )}
          </div>
        )}

        <div className="pt-2 border-t border-border/50">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-bold text-foreground">
                {currencySymbol}{unit.monthly_rent.toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground"> / month</span>
            </div>
            {unit.security_deposit !== null && (
              <div className="text-right text-sm text-muted-foreground">
                <p>Deposit: {currencySymbol}{unit.security_deposit.toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button 
          onClick={() => onApply(unit.id)} 
          className="w-full"
          disabled={!isAvailable}
          variant={isAvailable ? 'default' : 'secondary'}
        >
          {isAvailable ? 'Apply Now' : 'Not Available'}
        </Button>
      </CardFooter>
    </Card>
  );
}
