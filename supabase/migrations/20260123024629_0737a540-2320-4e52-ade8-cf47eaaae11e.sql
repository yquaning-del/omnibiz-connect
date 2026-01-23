-- Phase 1: Critical RLS Policy Fixes for Production Readiness
-- Fix access policies for sensitive tables (using correct columns)

-- 1. patient_profiles: Tighten to organization-based (no location_id column)
DROP POLICY IF EXISTS "Pharmacists can manage patient profiles" ON patient_profiles;
DROP POLICY IF EXISTS "Pharmacists can view patient profiles" ON patient_profiles;

CREATE POLICY "Pharmacists can view patient profiles in their org" 
ON patient_profiles 
FOR SELECT 
USING (
  organization_id IN (SELECT get_user_org_ids(auth.uid()))
  AND is_pharmacist(auth.uid(), organization_id)
);

CREATE POLICY "Pharmacists can manage patient profiles in their org" 
ON patient_profiles 
FOR ALL 
USING (
  organization_id IN (SELECT get_user_org_ids(auth.uid()))
  AND is_pharmacist(auth.uid(), organization_id)
);

-- 2. prescriptions: Add location-based restriction (has location_id)
DROP POLICY IF EXISTS "Pharmacists can manage prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Pharmacists can view prescriptions" ON prescriptions;

CREATE POLICY "Pharmacists can view prescriptions at their location" 
ON prescriptions 
FOR SELECT 
USING (
  location_id IN (SELECT get_user_location_ids(auth.uid()))
  AND is_pharmacist(auth.uid(), organization_id)
);

CREATE POLICY "Pharmacists can manage prescriptions at their location" 
ON prescriptions 
FOR ALL 
USING (
  location_id IN (SELECT get_user_location_ids(auth.uid()))
  AND is_pharmacist(auth.uid(), organization_id)
);

-- 3. guest_profiles: Tighten with is_front_desk check (has organization_id only)
DROP POLICY IF EXISTS "Front desk can manage guest profiles" ON guest_profiles;
DROP POLICY IF EXISTS "Front desk can view guest profiles" ON guest_profiles;

CREATE POLICY "Front desk can view guest profiles in their org" 
ON guest_profiles 
FOR SELECT 
USING (
  organization_id IN (SELECT get_user_org_ids(auth.uid()))
  AND is_front_desk(auth.uid(), organization_id)
);

CREATE POLICY "Front desk can manage guest profiles in their org" 
ON guest_profiles 
FOR ALL 
USING (
  organization_id IN (SELECT get_user_org_ids(auth.uid()))
  AND is_front_desk(auth.uid(), organization_id)
);

-- 4. reservations: Tighten to location-based (has location_id)
DROP POLICY IF EXISTS "Staff can manage reservations" ON reservations;
DROP POLICY IF EXISTS "Users can view reservations in their org" ON reservations;

CREATE POLICY "Staff can view reservations at their location" 
ON reservations 
FOR SELECT 
USING (
  location_id IN (SELECT get_user_location_ids(auth.uid()))
);

CREATE POLICY "Staff can manage reservations at their location" 
ON reservations 
FOR ALL 
USING (
  location_id IN (SELECT get_user_location_ids(auth.uid()))
);

-- 5. customers: Organization-based (no location_id column)
DROP POLICY IF EXISTS "Staff can manage customers" ON customers;
DROP POLICY IF EXISTS "Staff can view customers" ON customers;

CREATE POLICY "Staff can view customers in their org" 
ON customers 
FOR SELECT 
USING (
  organization_id IN (SELECT get_user_org_ids(auth.uid()))
);

CREATE POLICY "Staff can manage customers in their org" 
ON customers 
FOR ALL 
USING (
  organization_id IN (SELECT get_user_org_ids(auth.uid()))
);

-- 6. guest_folios: Tighten to location-based (has location_id)
DROP POLICY IF EXISTS "Staff can manage folios in their org" ON guest_folios;
DROP POLICY IF EXISTS "Staff can view folios in their org" ON guest_folios;

CREATE POLICY "Staff can view folios at their location" 
ON guest_folios 
FOR SELECT 
USING (
  location_id IN (SELECT get_user_location_ids(auth.uid()))
);

CREATE POLICY "Staff can manage folios at their location" 
ON guest_folios 
FOR ALL 
USING (
  location_id IN (SELECT get_user_location_ids(auth.uid()))
);

-- 7. insurance_claims: Tighten with pharmacist check (has organization_id)
DROP POLICY IF EXISTS "Pharmacists can manage insurance claims" ON insurance_claims;
DROP POLICY IF EXISTS "Pharmacists can view insurance claims" ON insurance_claims;

CREATE POLICY "Pharmacists can view insurance claims in their org" 
ON insurance_claims 
FOR SELECT 
USING (
  organization_id IN (SELECT get_user_org_ids(auth.uid()))
  AND is_pharmacist(auth.uid(), organization_id)
);

CREATE POLICY "Pharmacists can manage insurance claims in their org" 
ON insurance_claims 
FOR ALL 
USING (
  organization_id IN (SELECT get_user_org_ids(auth.uid()))
  AND is_pharmacist(auth.uid(), organization_id)
);

-- 8. controlled_substance_log: Tighten to location-based (has location_id)
DROP POLICY IF EXISTS "Pharmacists can insert controlled substance log" ON controlled_substance_log;
DROP POLICY IF EXISTS "Pharmacists can view controlled substance log" ON controlled_substance_log;

CREATE POLICY "Pharmacists can view controlled substance log at their location" 
ON controlled_substance_log 
FOR SELECT 
USING (
  location_id IN (SELECT get_user_location_ids(auth.uid()))
  AND is_pharmacist(auth.uid(), organization_id)
);

CREATE POLICY "Pharmacists can insert controlled substance log at their location" 
ON controlled_substance_log 
FOR INSERT 
WITH CHECK (
  location_id IN (SELECT get_user_location_ids(auth.uid()))
  AND is_pharmacist(auth.uid(), organization_id)
);

-- 9. Add audit logging table for PHI access (HIPAA compliance)
CREATE TABLE IF NOT EXISTS public.phi_access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  location_id UUID,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  action TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.phi_access_logs ENABLE ROW LEVEL SECURITY;

-- Only managers can view audit logs
CREATE POLICY "Managers can view PHI access logs" 
ON phi_access_logs 
FOR SELECT 
USING (is_manager(auth.uid(), organization_id));

-- System can insert audit logs (via service role)
CREATE POLICY "Service role can insert PHI access logs" 
ON phi_access_logs 
FOR INSERT 
WITH CHECK (true);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_phi_access_logs_org_date 
ON phi_access_logs(organization_id, accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_phi_access_logs_user 
ON phi_access_logs(user_id, accessed_at DESC);