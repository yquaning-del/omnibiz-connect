
-- Drop duplicate SELECT policies on tables that already have ALL policies
DROP POLICY IF EXISTS "Staff can view folios at their location" ON public.guest_folios;
DROP POLICY IF EXISTS "Staff can view reservations at their location" ON public.reservations;
DROP POLICY IF EXISTS "Staff can view room service orders in their location" ON public.room_service_orders;
DROP POLICY IF EXISTS "Pharmacists can view prescriptions at their location" ON public.prescriptions;
DROP POLICY IF EXISTS "Front desk can view guest profiles in their org" ON public.guest_profiles;
DROP POLICY IF EXISTS "Super admins can view platform metrics" ON public.platform_metrics;
DROP POLICY IF EXISTS "Users can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Managers can view all schedules in location" ON public.staff_schedules;
