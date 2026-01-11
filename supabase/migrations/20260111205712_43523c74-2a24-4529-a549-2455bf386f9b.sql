-- =============================================
-- PHASE 5: HOTEL MODULE DATABASE SCHEMA
-- =============================================

-- 1. MAINTENANCE REQUESTS TABLE
CREATE TABLE public.maintenance_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.hotel_rooms(id) ON DELETE SET NULL,
  reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'open',
  estimated_cost NUMERIC DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  scheduled_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view maintenance requests in their locations"
  ON public.maintenance_requests FOR SELECT
  USING (location_id IN (SELECT get_user_location_ids(auth.uid())));

CREATE POLICY "Managers can manage maintenance requests"
  ON public.maintenance_requests FOR ALL
  USING (location_id IN (
    SELECT user_roles.location_id FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = ANY(ARRAY['super_admin', 'org_admin', 'location_manager', 'department_lead']::app_role[])
  ));

CREATE POLICY "Staff can update assigned maintenance requests"
  ON public.maintenance_requests FOR UPDATE
  USING (assigned_to = auth.uid());

-- 2. GUEST PROFILES TABLE (extends customers for hotel-specific data)
CREATE TABLE public.guest_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  loyalty_tier TEXT DEFAULT 'bronze',
  total_stays INTEGER DEFAULT 0,
  total_nights INTEGER DEFAULT 0,
  total_spent NUMERIC DEFAULT 0,
  preferences JSONB DEFAULT '{}'::jsonb,
  room_preferences TEXT[],
  dietary_restrictions TEXT[],
  special_requests TEXT,
  id_type TEXT,
  id_number TEXT,
  id_expiry DATE,
  nationality TEXT,
  vip_status BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.guest_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view guest profiles in their org"
  ON public.guest_profiles FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Staff can manage guest profiles in their org"
  ON public.guest_profiles FOR ALL
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- 3. GUEST FOLIOS TABLE (billing)
CREATE TABLE public.guest_folios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  folio_number TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  room_number TEXT,
  check_in DATE,
  check_out DATE,
  status TEXT NOT NULL DEFAULT 'open',
  room_charges NUMERIC DEFAULT 0,
  incidental_charges NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  balance_due NUMERIC DEFAULT 0,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.guest_folios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view folios in their org"
  ON public.guest_folios FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Staff can manage folios in their org"
  ON public.guest_folios FOR ALL
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- 4. FOLIO CHARGES TABLE
CREATE TABLE public.folio_charges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  folio_id UUID NOT NULL REFERENCES public.guest_folios(id) ON DELETE CASCADE,
  charge_type TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  posted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  posted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  voided BOOLEAN DEFAULT false,
  voided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  voided_at TIMESTAMP WITH TIME ZONE,
  void_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.folio_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view folio charges"
  ON public.folio_charges FOR SELECT
  USING (folio_id IN (
    SELECT id FROM guest_folios WHERE organization_id IN (SELECT get_user_org_ids(auth.uid()))
  ));

CREATE POLICY "Staff can manage folio charges"
  ON public.folio_charges FOR ALL
  USING (folio_id IN (
    SELECT id FROM guest_folios WHERE organization_id IN (SELECT get_user_org_ids(auth.uid()))
  ));

-- 5. ROOM SERVICE ORDERS TABLE
CREATE TABLE public.room_service_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.hotel_rooms(id) ON DELETE SET NULL,
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
  folio_id UUID REFERENCES public.guest_folios(id) ON DELETE SET NULL,
  order_number TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  room_number TEXT,
  order_type TEXT NOT NULL DEFAULT 'food',
  items JSONB DEFAULT '[]'::jsonb,
  special_instructions TEXT,
  subtotal NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  service_charge NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_delivery_time TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  delivered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.room_service_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view room service orders in their location"
  ON public.room_service_orders FOR SELECT
  USING (location_id IN (SELECT get_user_location_ids(auth.uid())));

CREATE POLICY "Staff can manage room service orders"
  ON public.room_service_orders FOR ALL
  USING (location_id IN (SELECT get_user_location_ids(auth.uid())));

-- 6. AMENITY REQUESTS TABLE
CREATE TABLE public.amenity_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.hotel_rooms(id) ON DELETE SET NULL,
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  room_number TEXT,
  request_type TEXT NOT NULL,
  description TEXT,
  quantity INTEGER DEFAULT 1,
  priority TEXT DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.amenity_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view amenity requests in their location"
  ON public.amenity_requests FOR SELECT
  USING (location_id IN (SELECT get_user_location_ids(auth.uid())));

CREATE POLICY "Staff can manage amenity requests"
  ON public.amenity_requests FOR ALL
  USING (location_id IN (SELECT get_user_location_ids(auth.uid())));

-- 7. Add check-in/check-out fields to reservations
ALTER TABLE public.reservations 
  ADD COLUMN IF NOT EXISTS actual_check_in TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS actual_check_out TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS id_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS key_card_issued BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS express_checkout BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS folio_id UUID REFERENCES public.guest_folios(id) ON DELETE SET NULL;

-- 8. Add rate management fields to hotel_rooms
ALTER TABLE public.hotel_rooms
  ADD COLUMN IF NOT EXISTS base_rate NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weekend_rate NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seasonal_rate JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_ota_available BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS ota_markup_percent NUMERIC DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_location ON public.maintenance_requests(location_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status ON public.maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_guest_folios_org ON public.guest_folios(organization_id);
CREATE INDEX IF NOT EXISTS idx_guest_folios_reservation ON public.guest_folios(reservation_id);
CREATE INDEX IF NOT EXISTS idx_folio_charges_folio ON public.folio_charges(folio_id);
CREATE INDEX IF NOT EXISTS idx_room_service_orders_location ON public.room_service_orders(location_id);
CREATE INDEX IF NOT EXISTS idx_amenity_requests_location ON public.amenity_requests(location_id);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_service_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.amenity_requests;

-- Trigger for updating timestamps
CREATE TRIGGER update_maintenance_requests_updated_at
  BEFORE UPDATE ON public.maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_guest_profiles_updated_at
  BEFORE UPDATE ON public.guest_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_guest_folios_updated_at
  BEFORE UPDATE ON public.guest_folios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_room_service_orders_updated_at
  BEFORE UPDATE ON public.room_service_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_amenity_requests_updated_at
  BEFORE UPDATE ON public.amenity_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();