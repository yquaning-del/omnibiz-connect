-- Create security definer function to check if user is a pharmacist
CREATE OR REPLACE FUNCTION public.is_pharmacist(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role IN ('super_admin', 'org_admin', 'pharmacist')
  )
$$;

-- Create security definer function to check if user is front desk
CREATE OR REPLACE FUNCTION public.is_front_desk(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role IN ('super_admin', 'org_admin', 'location_manager', 'front_desk')
  )
$$;

-- Create security definer function to check if user is a manager
CREATE OR REPLACE FUNCTION public.is_manager(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role IN ('super_admin', 'org_admin', 'location_manager')
  )
$$;

-- PATIENT_PROFILES: Drop old permissive policies, create pharmacist-only policies
DROP POLICY IF EXISTS "Users can view patient profiles in their organization" ON public.patient_profiles;
DROP POLICY IF EXISTS "Users can insert patient profiles in their organization" ON public.patient_profiles;
DROP POLICY IF EXISTS "Users can update patient profiles in their organization" ON public.patient_profiles;

CREATE POLICY "Pharmacists can view patient profiles"
ON public.patient_profiles FOR SELECT TO authenticated
USING (public.is_pharmacist(auth.uid(), organization_id));

CREATE POLICY "Pharmacists can insert patient profiles"
ON public.patient_profiles FOR INSERT TO authenticated
WITH CHECK (public.is_pharmacist(auth.uid(), organization_id));

CREATE POLICY "Pharmacists can update patient profiles"
ON public.patient_profiles FOR UPDATE TO authenticated
USING (public.is_pharmacist(auth.uid(), organization_id));

-- PRESCRIPTIONS: Replace with pharmacist-only policies
DROP POLICY IF EXISTS "Staff can manage prescriptions in their org" ON public.prescriptions;
DROP POLICY IF EXISTS "Staff can view prescriptions in their org" ON public.prescriptions;

CREATE POLICY "Pharmacists can view prescriptions"
ON public.prescriptions FOR SELECT TO authenticated
USING (public.is_pharmacist(auth.uid(), organization_id));

CREATE POLICY "Pharmacists can manage prescriptions"
ON public.prescriptions FOR ALL TO authenticated
USING (public.is_pharmacist(auth.uid(), organization_id));

-- CONTROLLED_SUBSTANCE_LOG: Replace with pharmacist-only policies
DROP POLICY IF EXISTS "Staff can view controlled substance log" ON public.controlled_substance_log;
DROP POLICY IF EXISTS "Staff can insert controlled substance log" ON public.controlled_substance_log;

CREATE POLICY "Pharmacists can view controlled substance log"
ON public.controlled_substance_log FOR SELECT TO authenticated
USING (public.is_pharmacist(auth.uid(), organization_id));

CREATE POLICY "Pharmacists can insert controlled substance log"
ON public.controlled_substance_log FOR INSERT TO authenticated
WITH CHECK (public.is_pharmacist(auth.uid(), organization_id));

-- INSURANCE_CLAIMS: Replace with pharmacist-only policies
DROP POLICY IF EXISTS "Staff can manage insurance claims" ON public.insurance_claims;
DROP POLICY IF EXISTS "Staff can view insurance claims in their org" ON public.insurance_claims;

CREATE POLICY "Pharmacists can view insurance claims"
ON public.insurance_claims FOR SELECT TO authenticated
USING (public.is_pharmacist(auth.uid(), organization_id));

CREATE POLICY "Pharmacists can manage insurance claims"
ON public.insurance_claims FOR ALL TO authenticated
USING (public.is_pharmacist(auth.uid(), organization_id));

-- GUEST_PROFILES: Replace with front desk-only policies
DROP POLICY IF EXISTS "Staff can manage guest profiles in their org" ON public.guest_profiles;
DROP POLICY IF EXISTS "Staff can view guest profiles in their org" ON public.guest_profiles;

CREATE POLICY "Front desk can view guest profiles"
ON public.guest_profiles FOR SELECT TO authenticated
USING (public.is_front_desk(auth.uid(), organization_id));

CREATE POLICY "Front desk can manage guest profiles"
ON public.guest_profiles FOR ALL TO authenticated
USING (public.is_front_desk(auth.uid(), organization_id));

-- CUSTOMERS: Replace with manager-only policies
DROP POLICY IF EXISTS "Staff can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Users can view customers in their org" ON public.customers;

CREATE POLICY "Managers can view customers"
ON public.customers FOR SELECT TO authenticated
USING (public.is_manager(auth.uid(), organization_id));

CREATE POLICY "Managers can manage customers"
ON public.customers FOR ALL TO authenticated
USING (public.is_manager(auth.uid(), organization_id));

-- PAYMENT_TRANSACTIONS: Replace with org admin-only policies
DROP POLICY IF EXISTS "Users can view their organization transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Users can insert transactions for their organization" ON public.payment_transactions;

CREATE POLICY "Org admins can view payment transactions"
ON public.payment_transactions FOR SELECT TO authenticated
USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert payment transactions"
ON public.payment_transactions FOR INSERT TO authenticated
WITH CHECK (public.is_org_admin(auth.uid(), organization_id));