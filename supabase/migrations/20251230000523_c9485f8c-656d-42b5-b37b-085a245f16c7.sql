-- Hotel rooms table
CREATE TABLE public.hotel_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  room_type TEXT NOT NULL DEFAULT 'standard',
  floor INTEGER DEFAULT 1,
  capacity INTEGER NOT NULL DEFAULT 2,
  price_per_night DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'available',
  housekeeping_status TEXT NOT NULL DEFAULT 'clean',
  amenities TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(location_id, room_number)
);

-- Reservations table (for tables and rooms)
CREATE TABLE public.reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  reservation_type TEXT NOT NULL, -- 'table' or 'room'
  table_id UUID REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  room_id UUID REFERENCES public.hotel_rooms(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  guest_phone TEXT,
  guest_email TEXT,
  guest_count INTEGER NOT NULL DEFAULT 1,
  check_in TIMESTAMP WITH TIME ZONE NOT NULL,
  check_out TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'confirmed',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hotel_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Hotel rooms policies
CREATE POLICY "Users can view rooms in their locations" ON public.hotel_rooms
  FOR SELECT USING (location_id IN (SELECT public.get_user_location_ids(auth.uid())));

CREATE POLICY "Managers can manage rooms" ON public.hotel_rooms
  FOR ALL USING (
    location_id IN (
      SELECT location_id FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'org_admin', 'location_manager')
    )
  );

-- Reservations policies
CREATE POLICY "Users can view reservations in their org" ON public.reservations
  FOR SELECT USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Staff can manage reservations" ON public.reservations
  FOR ALL USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- Triggers for updated_at
CREATE TRIGGER update_hotel_rooms_updated_at 
  BEFORE UPDATE ON public.hotel_rooms 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at 
  BEFORE UPDATE ON public.reservations 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for orders (for KDS)
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;