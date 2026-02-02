-- Night Audit Records Table for Hotel
CREATE TABLE public.night_audit_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  audit_date DATE NOT NULL,
  
  -- Room statistics
  total_rooms INTEGER NOT NULL DEFAULT 0,
  occupied_rooms INTEGER NOT NULL DEFAULT 0,
  available_rooms INTEGER NOT NULL DEFAULT 0,
  out_of_order_rooms INTEGER NOT NULL DEFAULT 0,
  occupancy_rate NUMERIC(5,2) DEFAULT 0,
  
  -- Revenue
  room_revenue NUMERIC(12,2) DEFAULT 0,
  incidental_revenue NUMERIC(12,2) DEFAULT 0,
  total_revenue NUMERIC(12,2) DEFAULT 0,
  
  -- Guest counts
  arrivals_count INTEGER DEFAULT 0,
  departures_count INTEGER DEFAULT 0,
  in_house_guests INTEGER DEFAULT 0,
  no_shows_count INTEGER DEFAULT 0,
  
  -- Discrepancies
  discrepancies JSONB DEFAULT '[]',
  notes TEXT,
  
  -- Audit metadata
  performed_by UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure one audit per location per date
  UNIQUE (location_id, audit_date)
);

-- Enable RLS
ALTER TABLE public.night_audit_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view night audits at their location"
  ON public.night_audit_records FOR SELECT
  USING (location_id IN (SELECT get_user_location_ids(auth.uid())));

CREATE POLICY "Managers can manage night audits"
  ON public.night_audit_records FOR ALL
  USING (location_id IN (
    SELECT ur.location_id FROM user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('super_admin', 'org_admin', 'location_manager')
  ));

-- Index for efficient date lookups
CREATE INDEX idx_night_audit_location_date ON public.night_audit_records(location_id, audit_date DESC);

-- Pharmacy Refill Requests Table
CREATE TABLE public.refill_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patient_profiles(id) ON DELETE SET NULL,
  prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE SET NULL,
  
  -- Request details
  medication_name TEXT NOT NULL,
  medication_strength TEXT,
  quantity_requested INTEGER,
  notes TEXT,
  
  -- Patient info (for non-registered requests)
  patient_name TEXT,
  patient_phone TEXT,
  patient_email TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'ready', 'completed', 'denied')),
  denial_reason TEXT,
  
  -- Processing
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.refill_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for refill requests
CREATE POLICY "Pharmacists can view refill requests at their location"
  ON public.refill_requests FOR SELECT
  USING (
    location_id IN (SELECT get_user_location_ids(auth.uid())) 
    AND is_pharmacist(auth.uid(), organization_id)
  );

CREATE POLICY "Pharmacists can manage refill requests"
  ON public.refill_requests FOR ALL
  USING (
    location_id IN (SELECT get_user_location_ids(auth.uid())) 
    AND is_pharmacist(auth.uid(), organization_id)
  );

-- Allow public inserts (patient portal)
CREATE POLICY "Anyone can submit refill requests"
  ON public.refill_requests FOR INSERT
  WITH CHECK (true);

-- Index for status filtering
CREATE INDEX idx_refill_requests_status ON public.refill_requests(location_id, status);
CREATE INDEX idx_refill_requests_patient ON public.refill_requests(patient_id);

-- Employee PINs for POS
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pos_pin TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pos_pin_enabled BOOLEAN DEFAULT false;

-- Create a security definer function to verify PIN (prevents exposing PIN in queries)
CREATE OR REPLACE FUNCTION public.verify_pos_pin(user_email TEXT, pin TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id UUID;
BEGIN
  SELECT p.id INTO user_id
  FROM profiles p
  WHERE p.email = user_email
    AND p.pos_pin_enabled = true
    AND p.pos_pin = pin;
  
  RETURN user_id;
END;
$$;