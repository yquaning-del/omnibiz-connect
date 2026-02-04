import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PublicHeader } from '@/components/public/PublicHeader';
import { BookingCalendar } from '@/components/public/BookingCalendar';
import { RoomCard } from '@/components/public/RoomCard';
import { GuestInfoForm } from '@/components/public/GuestInfoForm';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { BedDouble, CalendarX, AlertCircle } from 'lucide-react';
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings';
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
}

interface Location {
  id: string;
  name: string;
}

// Get currency symbol from settings
const getCurrencySymbol = (settings: unknown): string => {
  if (settings && typeof settings === 'object' && 'currencySymbol' in settings) {
    return (settings as Record<string, unknown>).currencySymbol as string || '$';
  }
  return '$';
};

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

  // Get currency from hotel settings
  const currencySymbol = getCurrencySymbol(hotel?.settings);

  useEffect(() => {
    loadHotel();
  }, [orgSlug]);

  const loadHotel = async () => {
    if (!orgSlug) return;
    
    setLoading(true);
    try {
      // Load organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, slug, logo_url, primary_vertical, settings')
        .eq('slug', orgSlug)
        .single();

      if (orgError) throw orgError;
      
      // Check if it's a hotel
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

      // Load locations for this hotel
      const { data: locData } = await supabase
        .from('locations')
        .select('id, name')
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

      // Get all available rooms with sufficient capacity
      const { data: roomsData, error: roomsError } = await supabase
        .from('hotel_rooms')
        .select('*')
        .in('location_id', locationIds)
        .eq('status', 'available')
        .gte('capacity', guestCount)
        .order('price_per_night', { ascending: true });

      if (roomsError) throw roomsError;

      // Check for existing reservations in the date range
      const { data: reservations, error: resError } = await supabase
        .from('reservations')
        .select('room_id')
        .in('location_id', locationIds)
        .eq('reservation_type', 'room')
        .in('status', ['confirmed', 'checked_in'])
        .or(`check_in.lte.${checkOutDate.toISOString()},check_out.gte.${checkInDate.toISOString()}`);

      if (resError) throw resError;

      // Filter out rooms with conflicting reservations
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
      // Create reservation
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

      // Remove booked room from list
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
        <div className="container mx-auto px-4 py-8">
          <div className="grid gap-8 lg:grid-cols-3">
            <Skeleton className="h-96 lg:col-span-1" />
            <div className="lg:col-span-2">
              <Skeleton className="h-64 mb-4" />
              <Skeleton className="h-64" />
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
      <section className="border-b border-border/50 bg-gradient-to-b from-hotel/5 to-transparent py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">
            Book Your Perfect Stay
          </h1>
          <p className="mt-3 text-muted-foreground">
            Find and reserve the ideal room at {hotel.name}
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Search Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <BookingCalendar onSearch={searchRooms} loading={searchLoading} />
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-2">
            {!hasSearched ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 bg-muted/10 py-16 text-center">
                <BedDouble className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium text-foreground">
                  Search for Available Rooms
                </h3>
                <p className="mt-2 text-muted-foreground">
                  Select your dates and number of guests to see available rooms.
                </p>
              </div>
            ) : searchLoading ? (
              <div className="grid gap-6 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-80 rounded-lg" />
                ))}
              </div>
            ) : rooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 bg-muted/10 py-16 text-center">
                <CalendarX className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium text-foreground">
                  No Rooms Available
                </h3>
                <p className="mt-2 text-muted-foreground">
                  Sorry, no rooms are available for your selected dates and guest count.
                  Try different dates or fewer guests.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {rooms.length} room{rooms.length !== 1 ? 's' : ''} available
                  </p>
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
