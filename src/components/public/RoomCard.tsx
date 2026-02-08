import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BedDouble, Users, Wifi, Coffee, Tv, Wind, Car, Dumbbell, Sparkles, Star } from 'lucide-react';

interface RoomCardProps {
  room: {
    id: string;
    room_number: string;
    room_type: string;
    capacity: number;
    price_per_night: number;
    amenities: string[] | null;
    status: string;
    image_url?: string | null;
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

const ROOM_TYPE_CONFIG: Record<string, { color: string; bgColor: string; label: string }> = {
  standard: { color: 'text-muted-foreground', bgColor: 'bg-muted', label: 'Standard' },
  deluxe: { color: 'text-info', bgColor: 'bg-info/10', label: 'Deluxe' },
  suite: { color: 'text-hotel', bgColor: 'bg-hotel/10', label: 'Suite' },
  executive: { color: 'text-warning', bgColor: 'bg-warning/10', label: 'Executive' },
  presidential: { color: 'text-primary', bgColor: 'bg-primary/10', label: 'Presidential' },
};

export function RoomCard({ room, onBook, currencySymbol = '$', nights = 1 }: RoomCardProps) {
  const totalPrice = room.price_per_night * nights;
  const isAvailable = room.status === 'available';
  const roomConfig = ROOM_TYPE_CONFIG[room.room_type] || ROOM_TYPE_CONFIG.standard;
  
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
    <Card className="group overflow-hidden border-border/50 bg-card/50 transition-all duration-300 hover:border-hotel/30 hover:shadow-xl hover:shadow-hotel/5">
      {/* Room Image */}
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-hotel/20 via-hotel/10 to-muted/50">
        {room.image_url ? (
          <img
            src={room.image_url}
            alt={`${roomConfig.label} Room ${room.room_number}`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
            <BedDouble className="h-20 w-20 text-hotel/20 group-hover:scale-110 transition-transform duration-300" />
          </div>
        )}
        
        {/* Room type badge */}
        <Badge className={`absolute left-3 top-3 ${roomConfig.bgColor} ${roomConfig.color} border-0 shadow-sm`}>
          <Sparkles className="mr-1 h-3 w-3" />
          {roomConfig.label}
        </Badge>
        
        {/* Rating badge */}
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-sm shadow-sm">
          <Star className="h-3 w-3 fill-warning text-warning" />
          <span className="font-medium text-foreground">4.8</span>
        </div>
        
        {/* Price overlay */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-background/90 to-transparent p-4">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-foreground">
              {currencySymbol}{room.price_per_night.toFixed(0)}
            </span>
            <span className="text-sm text-muted-foreground">/ night</span>
          </div>
        </div>
      </div>

      <CardContent className="p-5 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground group-hover:text-hotel transition-colors">
            {roomConfig.label} Room
          </h3>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              Up to {room.capacity} guests
            </span>
            <span className="mx-2">•</span>
            <span>Room {room.room_number}</span>
          </p>
        </div>

        {room.amenities && room.amenities.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {room.amenities.slice(0, 4).map((amenity) => (
              <Badge key={amenity} variant="outline" className="text-xs font-normal border-border/50 bg-muted/30">
                {getAmenityIcon(amenity)}
                <span className="ml-1">{amenity}</span>
              </Badge>
            ))}
            {room.amenities.length > 4 && (
              <Badge variant="outline" className="text-xs font-normal border-border/50">
                +{room.amenities.length - 4} more
              </Badge>
            )}
          </div>
        )}

        {nights > 1 && (
          <div className="rounded-lg bg-muted/30 p-3 text-center">
            <p className="text-lg font-bold text-foreground">
              {currencySymbol}{totalPrice.toFixed(0)} <span className="text-sm font-normal text-muted-foreground">total</span>
            </p>
            <p className="text-xs text-muted-foreground">{nights} nights × {currencySymbol}{room.price_per_night.toFixed(0)}</p>
          </div>
        )}
      </CardContent>

      <CardFooter className="p-5 pt-0">
        <Button 
          onClick={() => onBook(room.id)} 
          className="w-full h-11 text-base shadow-sm"
          disabled={!isAvailable}
          variant={isAvailable ? 'default' : 'secondary'}
        >
          {isAvailable ? 'Book Now' : 'Not Available'}
        </Button>
      </CardFooter>
    </Card>
  );
}
