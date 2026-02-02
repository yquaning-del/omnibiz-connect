-- Fix the overly permissive INSERT policy for refill_requests
-- Drop the old policy
DROP POLICY IF EXISTS "Anyone can submit refill requests" ON public.refill_requests;

-- Create a more restrictive policy that requires valid organization_id and location_id
CREATE POLICY "Public can submit refill requests with valid org"
  ON public.refill_requests FOR INSERT
  WITH CHECK (
    -- Must have a valid organization_id and location_id
    organization_id IS NOT NULL 
    AND location_id IS NOT NULL
    -- Only allow pending status on insert
    AND status = 'pending'
  );