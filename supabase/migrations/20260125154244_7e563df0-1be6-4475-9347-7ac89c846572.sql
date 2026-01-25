-- User permissions table for granular, module-specific access control
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_role_id UUID NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_role_id, permission_key)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Indexes for faster lookups
CREATE INDEX idx_user_permissions_role ON user_permissions(user_role_id);
CREATE INDEX idx_user_permissions_key ON user_permissions(permission_key);

-- RLS Policies
CREATE POLICY "Users can view their own permissions"
ON public.user_permissions FOR SELECT
USING (
  user_role_id IN (SELECT id FROM user_roles WHERE user_id = auth.uid())
);

CREATE POLICY "Org admins can manage permissions in their org"
ON public.user_permissions FOR ALL
USING (
  user_role_id IN (
    SELECT ur.id FROM user_roles ur
    WHERE ur.organization_id IN (
      SELECT organization_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'org_admin')
    )
  )
);