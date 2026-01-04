-- Fix: Allow users to insert their first location during onboarding
-- This policy allows a user who has no existing roles to insert a location
-- (which happens during the onboarding flow right after creating their first org)

CREATE POLICY "Users can insert first location during onboarding"
ON public.locations
FOR INSERT
WITH CHECK (
  -- Super admins can always insert
  is_super_admin(auth.uid()) 
  OR 
  -- Users with no roles yet can insert (onboarding flow)
  (NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()
  ))
);