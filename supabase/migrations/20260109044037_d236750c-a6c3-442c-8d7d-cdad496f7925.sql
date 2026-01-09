-- Previous migration failed because Postgres doesn't support `CREATE POLICY IF NOT EXISTS`.
-- Re-applying with `DROP POLICY IF EXISTS` + `CREATE POLICY`.

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Organizations
DROP POLICY IF EXISTS "Creators can view their organizations" ON public.organizations;
CREATE POLICY "Creators can view their organizations"
ON public.organizations
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR public.is_org_admin(auth.uid(), id)
  OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users can create organizations (created_by self)" ON public.organizations;
CREATE POLICY "Users can create organizations (created_by self)"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Creators can update their organizations" ON public.organizations;
CREATE POLICY "Creators can update their organizations"
ON public.organizations
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR public.is_org_admin(auth.uid(), id)
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  created_by = auth.uid()
  OR public.is_org_admin(auth.uid(), id)
  OR public.is_super_admin(auth.uid())
);

-- Locations
DROP POLICY IF EXISTS "Creators can view locations in their orgs" ON public.locations;
CREATE POLICY "Creators can view locations in their orgs"
ON public.locations
FOR SELECT
TO authenticated
USING (
  public.is_org_creator(auth.uid(), organization_id)
  OR public.is_org_admin(auth.uid(), organization_id)
  OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Creators can create locations in their orgs" ON public.locations;
CREATE POLICY "Creators can create locations in their orgs"
ON public.locations
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_org_creator(auth.uid(), organization_id)
  OR public.is_org_admin(auth.uid(), organization_id)
  OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Creators can update locations in their orgs" ON public.locations;
CREATE POLICY "Creators can update locations in their orgs"
ON public.locations
FOR UPDATE
TO authenticated
USING (
  public.is_org_creator(auth.uid(), organization_id)
  OR public.is_org_admin(auth.uid(), organization_id)
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  public.is_org_creator(auth.uid(), organization_id)
  OR public.is_org_admin(auth.uid(), organization_id)
  OR public.is_super_admin(auth.uid())
);

-- User roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Org creators can self-assign org_admin" ON public.user_roles;
CREATE POLICY "Org creators can self-assign org_admin"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'org_admin'
  AND organization_id IS NOT NULL
  AND public.is_org_creator(auth.uid(), organization_id)
);
