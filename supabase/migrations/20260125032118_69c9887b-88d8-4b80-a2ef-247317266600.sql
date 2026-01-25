-- Create tenants table for Property Management vertical
CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  date_of_birth DATE,
  id_type TEXT,
  id_number TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  move_in_date DATE,
  move_out_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create leases table
CREATE TABLE public.leases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.property_units(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  lease_type TEXT NOT NULL DEFAULT 'fixed',
  start_date DATE NOT NULL,
  end_date DATE,
  monthly_rent NUMERIC NOT NULL DEFAULT 0,
  security_deposit NUMERIC DEFAULT 0,
  payment_due_day INTEGER DEFAULT 1,
  late_fee_amount NUMERIC DEFAULT 0,
  grace_period_days INTEGER DEFAULT 5,
  special_terms TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rent_payments table
CREATE TABLE public.rent_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  late_fee NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tenant_applications table
CREATE TABLE public.tenant_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.property_units(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  current_address TEXT,
  employer TEXT,
  monthly_income NUMERIC,
  move_in_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX idx_tenants_organization ON public.tenants(organization_id);
CREATE INDEX idx_tenants_status ON public.tenants(status);
CREATE INDEX idx_leases_organization ON public.leases(organization_id);
CREATE INDEX idx_leases_status ON public.leases(status);
CREATE INDEX idx_rent_payments_organization ON public.rent_payments(organization_id);
CREATE INDEX idx_tenant_applications_organization ON public.tenant_applications(organization_id);

-- Enable RLS on all tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_applications ENABLE ROW LEVEL SECURITY;

-- RLS policies for tenants
CREATE POLICY "Users can view tenants in their organization"
  ON public.tenants FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Managers can manage tenants in their organization"
  ON public.tenants FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM user_roles
    WHERE user_id = auth.uid() AND role IN ('super_admin', 'org_admin', 'location_manager')
  ));

-- RLS policies for leases
CREATE POLICY "Users can view leases in their organization"
  ON public.leases FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Managers can manage leases in their organization"
  ON public.leases FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM user_roles
    WHERE user_id = auth.uid() AND role IN ('super_admin', 'org_admin', 'location_manager')
  ));

-- RLS policies for rent_payments
CREATE POLICY "Users can view rent payments in their organization"
  ON public.rent_payments FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Managers can manage rent payments in their organization"
  ON public.rent_payments FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM user_roles
    WHERE user_id = auth.uid() AND role IN ('super_admin', 'org_admin', 'location_manager')
  ));

-- RLS policies for tenant_applications
CREATE POLICY "Users can view applications in their organization"
  ON public.tenant_applications FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Managers can manage applications in their organization"
  ON public.tenant_applications FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM user_roles
    WHERE user_id = auth.uid() AND role IN ('super_admin', 'org_admin', 'location_manager')
  ));

-- Triggers for updated_at
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leases_updated_at
  BEFORE UPDATE ON public.leases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_applications_updated_at
  BEFORE UPDATE ON public.tenant_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();