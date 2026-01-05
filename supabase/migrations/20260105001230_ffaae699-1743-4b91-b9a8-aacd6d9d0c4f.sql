-- Fix RLS policy for organizations to allow new users during onboarding
-- Drop the existing policy
DROP POLICY IF EXISTS "Users can insert organizations" ON public.organizations;

-- Recreate with proper check that allows users without existing roles to create their first org
CREATE POLICY "Users can insert organizations during onboarding" 
ON public.organizations 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    is_super_admin(auth.uid()) 
    OR NOT EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()
    )
  )
);