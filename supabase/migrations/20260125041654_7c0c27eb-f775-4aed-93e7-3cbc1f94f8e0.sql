-- Phase 1: Add location columns to property_units table
ALTER TABLE public.property_units
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'US';

-- Phase 2: Add location & template columns to leases table
ALTER TABLE public.leases
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS template_source TEXT,
  ADD COLUMN IF NOT EXISTS lease_document JSONB;

-- Phase 3: Create lease_templates reference table
CREATE TABLE IF NOT EXISTS public.lease_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  country TEXT NOT NULL,
  state TEXT,
  city TEXT,
  template_name TEXT NOT NULL,
  template_content JSONB NOT NULL DEFAULT '{}',
  required_clauses TEXT[] DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on lease_templates
ALTER TABLE public.lease_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for lease_templates
CREATE POLICY "Users can view templates in their organization"
ON public.lease_templates
FOR SELECT
USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Managers can manage templates in their organization"
ON public.lease_templates
FOR ALL
USING (organization_id IN (
  SELECT organization_id FROM user_roles
  WHERE user_id = auth.uid()
  AND role IN ('super_admin', 'org_admin', 'location_manager')
));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_lease_templates_org ON public.lease_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_lease_templates_country ON public.lease_templates(country);
CREATE INDEX IF NOT EXISTS idx_property_units_country ON public.property_units(country);
CREATE INDEX IF NOT EXISTS idx_leases_country ON public.leases(country);

-- Add updated_at trigger for lease_templates
CREATE TRIGGER update_lease_templates_updated_at
BEFORE UPDATE ON public.lease_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();