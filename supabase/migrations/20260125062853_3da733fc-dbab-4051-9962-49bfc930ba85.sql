-- Add user_id column to tenants table to link to auth users
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON public.tenants(user_id);

-- Add signature tracking columns to leases table
ALTER TABLE public.leases 
  ADD COLUMN IF NOT EXISTS landlord_signed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS tenant_signed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS signed_lease_pdf TEXT;

-- Add tenant submission tracking to maintenance_requests
ALTER TABLE public.maintenance_requests 
  ADD COLUMN IF NOT EXISTS submitted_by_tenant UUID REFERENCES public.tenants(id);

-- Create lease_invitations table
CREATE TABLE IF NOT EXISTS public.lease_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for lease_invitations
CREATE INDEX IF NOT EXISTS idx_lease_invitations_token ON public.lease_invitations(token);
CREATE INDEX IF NOT EXISTS idx_lease_invitations_email ON public.lease_invitations(email);
CREATE INDEX IF NOT EXISTS idx_lease_invitations_organization ON public.lease_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_lease_invitations_status ON public.lease_invitations(status);

-- Enable RLS on lease_invitations
ALTER TABLE public.lease_invitations ENABLE ROW LEVEL SECURITY;

-- Create lease_signatures table
CREATE TABLE IF NOT EXISTS public.lease_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  signer_type TEXT NOT NULL CHECK (signer_type IN ('landlord', 'tenant')),
  signer_id UUID NOT NULL REFERENCES auth.users(id),
  signature_data JSONB NOT NULL,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for lease_signatures
CREATE INDEX IF NOT EXISTS idx_lease_signatures_lease ON public.lease_signatures(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_signatures_signer ON public.lease_signatures(signer_id);

-- Enable RLS on lease_signatures
ALTER TABLE public.lease_signatures ENABLE ROW LEVEL SECURITY;

-- Create helper function to check if user is a tenant
CREATE OR REPLACE FUNCTION public.is_tenant(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'tenant'
  )
$$;

-- Create helper function to get tenant record for a user
CREATE OR REPLACE FUNCTION public.get_tenant_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.tenants WHERE user_id = _user_id LIMIT 1
$$;

-- RLS policies for lease_invitations
CREATE POLICY "Managers can manage invitations in their org"
ON public.lease_invitations
FOR ALL
USING (organization_id IN (
  SELECT organization_id FROM user_roles 
  WHERE user_id = auth.uid() 
  AND role IN ('super_admin', 'org_admin', 'location_manager')
));

CREATE POLICY "Users can view invitations by their email"
ON public.lease_invitations
FOR SELECT
USING (
  email = (SELECT email FROM profiles WHERE id = auth.uid())
);

-- RLS policies for lease_signatures
CREATE POLICY "Users can insert their own signatures"
ON public.lease_signatures
FOR INSERT
WITH CHECK (signer_id = auth.uid());

CREATE POLICY "Users can view signatures on their leases"
ON public.lease_signatures
FOR SELECT
USING (
  signer_id = auth.uid() 
  OR lease_id IN (
    SELECT id FROM leases 
    WHERE tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
  )
  OR organization_id IN (SELECT get_user_org_ids(auth.uid()))
);

-- Add tenant access policy to leases
CREATE POLICY "Tenants can view their own leases"
ON public.leases
FOR SELECT
USING (
  tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
);

-- Add tenant access policy to rent_payments
CREATE POLICY "Tenants can view their own payments"
ON public.rent_payments
FOR SELECT
USING (
  tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
);

CREATE POLICY "Tenants can insert their own payments"
ON public.rent_payments
FOR INSERT
WITH CHECK (
  tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
);

-- Add tenant access policy to maintenance_requests for submission
CREATE POLICY "Tenants can submit maintenance requests"
ON public.maintenance_requests
FOR INSERT
WITH CHECK (
  submitted_by_tenant IN (SELECT id FROM tenants WHERE user_id = auth.uid())
);

CREATE POLICY "Tenants can view their submitted requests"
ON public.maintenance_requests
FOR SELECT
USING (
  submitted_by_tenant IN (SELECT id FROM tenants WHERE user_id = auth.uid())
);

-- Add trigger for updated_at on lease_invitations
CREATE TRIGGER update_lease_invitations_updated_at
BEFORE UPDATE ON public.lease_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();