-- Staff invitations table for inviting new staff members
CREATE TABLE public.staff_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  location_id UUID,
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'staff',
  token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '7 days',
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

-- Org admins can manage staff invitations in their organization
CREATE POLICY "Org admins can manage staff invitations"
ON public.staff_invitations FOR ALL
USING (is_org_admin(auth.uid(), organization_id));

-- Users can view invitations sent to their email
CREATE POLICY "Users can view invitations for their email"
ON public.staff_invitations FOR SELECT
USING (email = (SELECT email FROM profiles WHERE id = auth.uid()));

-- Create index for faster token lookups
CREATE INDEX idx_staff_invitations_token ON public.staff_invitations(token);
CREATE INDEX idx_staff_invitations_org ON public.staff_invitations(organization_id);
CREATE INDEX idx_staff_invitations_status ON public.staff_invitations(status);