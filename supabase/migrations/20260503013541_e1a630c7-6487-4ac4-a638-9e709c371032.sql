-- Tighten customers RLS: drop broad staff policies, keep manager-only access
DROP POLICY IF EXISTS "Staff can manage customers in their org" ON public.customers;
DROP POLICY IF EXISTS "Staff can view customers in their org" ON public.customers;

-- Tighten patient_profiles RLS: drop broad staff policies; only pharmacists/admins can access medical PII
DROP POLICY IF EXISTS "Staff can manage patient profiles in their org" ON public.patient_profiles;
DROP POLICY IF EXISTS "Staff can view patient profiles in their org" ON public.patient_profiles;

-- Tighten reservations: only managers/front-desk should access guest contact info
DROP POLICY IF EXISTS "Staff can manage reservations at their location" ON public.reservations;

CREATE POLICY "Front desk can manage reservations at their location"
ON public.reservations
FOR ALL
TO authenticated
USING (
  location_id IN (SELECT get_user_location_ids(auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.locations l
    WHERE l.id = reservations.location_id
      AND (
        public.is_front_desk(auth.uid(), l.organization_id)
        OR public.is_manager(auth.uid(), l.organization_id)
      )
  )
)
WITH CHECK (
  location_id IN (SELECT get_user_location_ids(auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.locations l
    WHERE l.id = reservations.location_id
      AND (
        public.is_front_desk(auth.uid(), l.organization_id)
        OR public.is_manager(auth.uid(), l.organization_id)
      )
  )
);