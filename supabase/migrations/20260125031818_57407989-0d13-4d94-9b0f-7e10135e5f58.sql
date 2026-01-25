-- Create property_units table for Property Management vertical
CREATE TABLE public.property_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  unit_number TEXT NOT NULL,
  unit_type TEXT NOT NULL DEFAULT 'apartment',
  floor INTEGER,
  square_footage NUMERIC,
  bedrooms INTEGER NOT NULL DEFAULT 1,
  bathrooms NUMERIC NOT NULL DEFAULT 1,
  monthly_rent NUMERIC NOT NULL DEFAULT 0,
  security_deposit NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'available',
  amenities TEXT[] DEFAULT '{}',
  notes TEXT,
  current_tenant_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX idx_property_units_organization ON public.property_units(organization_id);
CREATE INDEX idx_property_units_status ON public.property_units(status);

-- Enable Row Level Security
ALTER TABLE public.property_units ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for property_units
CREATE POLICY "Users can view units in their organization"
  ON public.property_units
  FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Managers can manage units in their organization"
  ON public.property_units
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'org_admin', 'location_manager')
    )
  );

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_property_units_updated_at
  BEFORE UPDATE ON public.property_units
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();