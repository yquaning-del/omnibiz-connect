import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Users, Minus, Plus } from 'lucide-react';
import { format, differenceInDays, addDays } from 'date-fns';
import { DateRange } from 'react-day-picker';

interface BookingCalendarProps {
  onSearch: (checkIn: Date, checkOut: Date, guests: number) => void;
  loading?: boolean;
}

export function BookingCalendar({ onSearch, loading }: BookingCalendarProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 1),
  });
  const [guests, setGuests] = useState(2);

  const nights = dateRange?.from && dateRange?.to 
    ? differenceInDays(dateRange.to, dateRange.from)
    : 0;

  const handleSearch = () => {
    if (dateRange?.from && dateRange?.to) {
      onSearch(dateRange.from, dateRange.to, guests);
    }
  };

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarDays className="h-5 w-5 text-primary" />
          Select Your Stay
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Calendar */}
        <div className="flex justify-center">
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={setDateRange}
            numberOfMonths={1}
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            className="rounded-md border border-border/50"
          />
        </div>

        {/* Selected Dates Summary */}
        {dateRange?.from && dateRange?.to && (
          <div className="flex items-center justify-center gap-2 text-sm">
            <Badge variant="outline" className="px-3 py-1">
              {format(dateRange.from, 'MMM d, yyyy')}
            </Badge>
            <span className="text-muted-foreground">→</span>
            <Badge variant="outline" className="px-3 py-1">
              {format(dateRange.to, 'MMM d, yyyy')}
            </Badge>
            <Badge className="ml-2 bg-primary/20 text-primary">
              {nights} night{nights !== 1 ? 's' : ''}
            </Badge>
          </div>
        )}

        {/* Guests Selector */}
        <div className="flex items-center justify-between rounded-lg border border-border/50 p-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium text-foreground">Guests</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setGuests(Math.max(1, guests - 1))}
              disabled={guests <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-8 text-center font-semibold">{guests}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setGuests(Math.min(10, guests + 1))}
              disabled={guests >= 10}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search Button */}
        <Button 
          onClick={handleSearch} 
          className="w-full" 
          size="lg"
          disabled={!dateRange?.from || !dateRange?.to || loading}
        >
          {loading ? 'Searching...' : 'Search Available Rooms'}
        </Button>
      </CardContent>
    </Card>
  );
}
