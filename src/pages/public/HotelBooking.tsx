import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PublicHeader } from '@/components/public/PublicHeader';
import { BookingCalendar } from '@/components/public/BookingCalendar';
import { RoomCard } from '@/components/public/RoomCard';
import { GuestInfoForm } from '@/components/public/GuestInfoForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { 
  BedDouble, 
  CalendarX, 
  AlertCircle, 
  Wifi, 
  Car, 
  UtensilsCrossed, 
  Dumbbell,
  Sparkles,
  Shield,
  Star,
  Clock,
  MapPin,
  Phone,
  CheckCircle,
  Coffee,
  Waves,
} from 'lucide-react';
import { differenceInDays } from 'date-fns';

interface HotelInfo {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_vertical: string;
  settings: unknown;
}

interface Room {
  id: string;
  room_number: string;
  room_type: string;
  capacity: number;
  price_per_night: number;
  amenities: string[] | null;
  status: string;
  location_id: string;
  image_url?: string | null;
}

interface Location {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
}

// Get currency symbol from settings
const getCurrencySymbol = (settings: unknown): string => {
  if (settings && typeof settings === 'object' && 'currencySymbol' in settings) {
    return (settings as Record<string, unknown>).currencySymbol as string || '$';
  }
  return '$';
};

const HOTEL_AMENITIES = [
  { icon: Wifi, label: 'Free WiFi' },
  { icon: Car, label: 'Free Parking' },
  { icon: UtensilsCrossed, label: 'Restaurant' },
  { icon: Dumbbell, label: 'Fitness Center' },
  { icon: Waves, label: 'Swimming Pool' },
  { icon: Coffee, label: 'Room Service' },
];

export default function HotelBooking() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [hotel, setHotel] = useState<HotelInfo | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Booking state
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [guests, setGuests] = useState(2);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);

  const nights = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : 1;
  const currencySymbol = getCurrencySymbol(hotel?.settings);

  useEffect(() => {
    loadHotel();
  }, [orgSlug]);

  const loadHotel = async () => {
    if (!orgSlug) return;
    
    setLoading(true);
    try {
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, slug, logo_url, primary_vertical, settings')
        .eq('slug', orgSlug)
        .single();

      if (orgError) throw orgError;
      
      if (orgData.primary_vertical !== 'hotel') {
        toast({
          title: 'Not a Hotel',
          description: 'This business does not offer room bookings.',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }

      setHotel(orgData);

      const { data: locData } = await supabase
        .from('locations')
        .select('id, name, address, phone')
        .eq('organization_id', orgData.id)
        .eq('vertical', 'hotel')
        .eq('is_active', true);

      setLocations(locData || []);
    } catch (error) {
      console.error('Error loading hotel:', error);
      toast({
        title: 'Hotel not found',
        description: 'The hotel you are looking for does not exist.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const searchRooms = async (checkInDate: Date, checkOutDate: Date, guestCount: number) => {
    if (!hotel || locations.length === 0) return;

    setSearchLoading(true);
    setHasSearched(true);
    setCheckIn(checkInDate);
    setCheckOut(checkOutDate);
    setGuests(guestCount);

    try {
      const locationIds = locations.map(l => l.id);

      const { data: roomsData, error: roomsError } = await supabase
        .from('hotel_rooms')
        .select('*')
        .in('location_id', locationIds)
        .eq('status', 'available')
        .gte('capacity', guestCount)
        .order('price_per_night', { ascending: true });

      if (roomsError) throw roomsError;

      const { data: reservations, error: resError } = await supabase
        .from('reservations')
        .select('room_id')
        .in('location_id', locationIds)
        .eq('reservation_type', 'room')
        .in('status', ['confirmed', 'checked-in'])
        .lte('check_in', checkOutDate.toISOString())
        .gte('check_out', checkInDate.toISOString());

      if (resError) throw resError;

      const bookedRoomIds = new Set((reservations || []).map(r => r.room_id));
      const availableRooms = (roomsData || []).filter(room => !bookedRoomIds.has(room.id));

      setRooms(availableRooms);
    } catch (error) {
      console.error('Error searching rooms:', error);
      toast({
        title: 'Search failed',
        description: 'Unable to search for available rooms.',
        variant: 'destructive',
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleBookRoom = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (room) {
      setSelectedRoom(room);
      setBookingDialogOpen(true);
    }
  };

  const handleSubmitBooking = async (guestData: {
    fullName: string;
    email: string;
    phone: string;
    specialRequests?: string;
  }) => {
    if (!selectedRoom || !checkIn || !checkOut || !hotel) {
      throw new Error('Missing booking information');
    }

    try {
      const { error } = await supabase
        .from('reservations')
        .insert({
          organization_id: hotel.id,
          location_id: selectedRoom.location_id,
          room_id: selectedRoom.id,
          reservation_type: 'room',
          guest_name: guestData.fullName,
          guest_email: guestData.email,
          guest_phone: guestData.phone,
          guest_count: guests,
          check_in: checkIn.toISOString(),
          check_out: checkOut.toISOString(),
          status: 'confirmed',
          notes: guestData.specialRequests || null,
        });

      if (error) throw error;

      toast({
        title: 'Booking Confirmed!',
        description: 'Your room has been reserved. Check your email for details.',
      });

      setRooms(rooms.filter(r => r.id !== selectedRoom.id));
    } catch (error) {
      console.error('Error creating reservation:', error);
      toast({
        title: 'Booking Failed',
        description: 'Unable to complete your booking. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border/50">
          <div className="container mx-auto flex h-16 items-center px-4">
            <Skeleton className="h-8 w-48" />
          </div>
        </div>
        <Skeleton className="h-96" />
        <div className="container mx-auto px-4 py-8">
          <div className="grid gap-8 lg:grid-cols-3">
            <Skeleton className="h-96 lg:col-span-1" />
            <div className="lg:col-span-2 grid gap-6 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-80 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <AlertCircle className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold text-foreground">Hotel Not Found</h1>
        <p className="text-muted-foreground">The hotel you are looking for does not exist.</p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader orgName={hotel.name} logoUrl={hotel.logo_url} />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-hotel/10 via-background to-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-hotel/5 via-transparent to-transparent" />
        
        <div className="container relative mx-auto px-4 py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4 bg-hotel/10 text-hotel border-0">
              <Star className="mr-1 h-3 w-3 fill-current" />
              Premium Accommodation
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
              Book Your Perfect Stay
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              Experience luxury and comfort at {hotel.name}. Find the ideal room for your needs.
            </p>
            
            {/* Trust indicators */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="h-5 w-5 text-hotel" />
                <span className="text-sm">Best Price Guarantee</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle className="h-5 w-5 text-hotel" />
                <span className="text-sm">Free Cancellation</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-5 w-5 text-hotel" />
                <span className="text-sm">24/7 Support</span>
              </div>
            </div>
          </div>
        </div>

        {/* Amenities bar */}
        <div className="border-y border-border/50 bg-card/50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
              {HOTEL_AMENITIES.map((amenity, index) => {
                const AmenityIcon = amenity.icon;
                return (
                  <div key={index} className="flex items-center gap-2 text-muted-foreground">
                    <AmenityIcon className="h-4 w-4 text-hotel" />
                    <span className="text-sm">{amenity.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Search Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <BookingCalendar onSearch={searchRooms} loading={searchLoading} />
              
              {/* Location info */}
              {locations[0] && (
                <Card className="border-border/50 bg-card/50">
                  <CardContent className="p-4 space-y-3">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-hotel" />
                      Location
                    </h3>
                    {locations[0].address && (
                      <p className="text-sm text-muted-foreground">{locations[0].address}</p>
                    )}
                    {locations[0].phone && (
                      <a 
                        href={`tel:${locations[0].phone}`}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-hotel"
                      >
                        <Phone className="h-3 w-3" />
                        {locations[0].phone}
                      </a>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Why book with us */}
              <Card className="border-border/50 bg-card/50">
                <CardContent className="p-4 space-y-4">
                  <h3 className="font-semibold text-foreground">Why Book Direct?</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-hotel shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Best Rate Guarantee</p>
                        <p className="text-xs text-muted-foreground">Lowest price when booking direct</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Sparkles className="h-5 w-5 text-hotel shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Exclusive Perks</p>
                        <p className="text-xs text-muted-foreground">Welcome amenities & upgrades</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-hotel shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Flexible Booking</p>
                        <p className="text-xs text-muted-foreground">Easy modifications & cancellations</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-2">
            {!hasSearched ? (
              <Card className="border-dashed border-border/50 bg-muted/10">
                <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-hotel/10 mb-6">
                    <BedDouble className="h-10 w-10 text-hotel" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">
                    Search for Available Rooms
                  </h3>
                  <p className="mt-3 text-muted-foreground max-w-md">
                    Select your check-in and check-out dates along with the number of guests to view available rooms.
                  </p>
                </CardContent>
              </Card>
            ) : searchLoading ? (
              <div className="grid gap-6 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-80 rounded-lg" />
                ))}
              </div>
            ) : rooms.length === 0 ? (
              <Card className="border-dashed border-border/50 bg-muted/10">
                <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/50 mb-6">
                    <CalendarX className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">
                    No Rooms Available
                  </h3>
                  <p className="mt-3 text-muted-foreground max-w-md">
                    Unfortunately, no rooms match your criteria for the selected dates.
                    Please try different dates or adjust the number of guests.
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-6"
                    onClick={() => setHasSearched(false)}
                  >
                    Modify Search
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Available Rooms</h2>
                    <p className="text-sm text-muted-foreground">
                      {rooms.length} room{rooms.length !== 1 ? 's' : ''} available for your dates
                    </p>
                  </div>
                  <Badge variant="outline" className="text-hotel border-hotel/30">
                    {nights} night{nights !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                  {rooms.map((room) => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      onBook={handleBookRoom}
                      currencySymbol={currencySymbol}
                      nights={nights}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/30 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} {hotel.name}. All rights reserved.</p>
        </div>
      </footer>

      {/* Booking Dialog */}
      {selectedRoom && checkIn && checkOut && (
        <GuestInfoForm
          open={bookingDialogOpen}
          onOpenChange={setBookingDialogOpen}
          onSubmit={handleSubmitBooking}
          roomDetails={selectedRoom}
          checkIn={checkIn}
          checkOut={checkOut}
          guests={guests}
          currencySymbol={currencySymbol}
        />
      )}
    </div>
  );
}
