-- Drop existing insert policy for organizations
DROP POLICY IF EXISTS "Super admins can insert organizations" ON public.organizations;

-- Create new insert policy that allows:
-- 1. Super admins to insert
-- 2. Users with NO existing roles (new users during onboarding)
CREATE POLICY "Users can insert organizations"
ON public.organizations
FOR INSERT
WITH CHECK (
  is_super_admin(auth.uid()) 
  OR NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid()
  )
);