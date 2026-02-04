import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BedDouble, Users, Wifi, Coffee, Tv, Wind, Car, Dumbbell } from 'lucide-react';

interface RoomCardProps {
  room: {
    id: string;
    room_number: string;
    room_type: string;
    capacity: number;
    price_per_night: number;
    amenities: string[] | null;
    status: string;
  };
  onBook: (roomId: string) => void;
  currencySymbol?: string;
  nights?: number;
}

const AMENITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  wifi: Wifi,
  coffee: Coffee,
  tv: Tv,
  ac: Wind,
  parking: Car,
  gym: Dumbbell,
};

const ROOM_TYPE_COLORS: Record<string, string> = {
  standard: 'bg-muted text-muted-foreground',
  deluxe: 'bg-info/20 text-info',
  suite: 'bg-hotel/20 text-hotel',
  executive: 'bg-warning/20 text-warning',
  presidential: 'bg-primary/20 text-primary',
};

export function RoomCard({ room, onBook, currencySymbol = '$', nights = 1 }: RoomCardProps) {
  const totalPrice = room.price_per_night * nights;
  const isAvailable = room.status === 'available';
  
  const getAmenityIcon = (amenity: string) => {
    const lowerAmenity = amenity.toLowerCase();
    for (const [key, Icon] of Object.entries(AMENITY_ICONS)) {
      if (lowerAmenity.includes(key)) {
        return <Icon key={amenity} className="h-4 w-4" />;
      }
    }
    return null;
  };

  return (
    <Card className="overflow-hidden border-border/50 bg-card/50 transition-all hover:border-primary/30 hover:shadow-lg">
      {/* Room Image Placeholder */}
      <div className="relative h-48 bg-gradient-to-br from-muted to-muted/50">
        <div className="absolute inset-0 flex items-center justify-center">
          <BedDouble className="h-16 w-16 text-muted-foreground/30" />
        </div>
        <Badge className={`absolute right-3 top-3 ${ROOM_TYPE_COLORS[room.room_type] || ROOM_TYPE_COLORS.standard}`}>
          {room.room_type.charAt(0).toUpperCase() + room.room_type.slice(1)}
        </Badge>
      </div>

      <CardContent className="p-4 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {room.room_type.charAt(0).toUpperCase() + room.room_type.slice(1)} Room
          </h3>
          <p className="text-sm text-muted-foreground">Room {room.room_number}</p>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>Up to {room.capacity} guests</span>
          </div>
        </div>

        {room.amenities && room.amenities.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {room.amenities.slice(0, 5).map((amenity) => (
              <Badge key={amenity} variant="outline" className="text-xs">
                {getAmenityIcon(amenity)}
                <span className="ml-1">{amenity}</span>
              </Badge>
            ))}
            {room.amenities.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{room.amenities.length - 5} more
              </Badge>
            )}
          </div>
        )}

        <div className="pt-2 border-t border-border/50">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-bold text-foreground">
                {currencySymbol}{room.price_per_night.toFixed(0)}
              </span>
              <span className="text-sm text-muted-foreground"> / night</span>
            </div>
            {nights > 1 && (
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">
                  {currencySymbol}{totalPrice.toFixed(0)} total
                </p>
                <p className="text-xs text-muted-foreground">{nights} nights</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button 
          onClick={() => onBook(room.id)} 
          className="w-full"
          disabled={!isAvailable}
          variant={isAvailable ? 'default' : 'secondary'}
        >
          {isAvailable ? 'Book Now' : 'Not Available'}
        </Button>
      </CardFooter>
    </Card>
  );
}
