-- Create patient profiles table with prescription history, allergies, insurance
CREATE TABLE public.patient_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  blood_type TEXT,
  allergies TEXT[] DEFAULT '{}',
  medical_conditions TEXT[] DEFAULT '{}',
  insurance_provider TEXT,
  insurance_policy_number TEXT,
  insurance_group_number TEXT,
  insurance_expiry DATE,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create medications database
CREATE TABLE public.medications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  generic_name TEXT,
  brand_names TEXT[] DEFAULT '{}',
  drug_class TEXT,
  dosage_forms TEXT[] DEFAULT '{}',
  strengths TEXT[] DEFAULT '{}',
  route_of_administration TEXT,
  controlled_substance_schedule TEXT,
  requires_prescription BOOLEAN DEFAULT true,
  warnings TEXT[] DEFAULT '{}',
  contraindications TEXT[] DEFAULT '{}',
  side_effects TEXT[] DEFAULT '{}',
  storage_requirements TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create drug interactions table
CREATE TABLE public.drug_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medication_1_id UUID REFERENCES public.medications(id) ON DELETE CASCADE,
  medication_2_id UUID REFERENCES public.medications(id) ON DELETE CASCADE,
  severity TEXT NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe', 'contraindicated')),
  description TEXT NOT NULL,
  recommendation TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(medication_1_id, medication_2_id)
);

-- Create prescriptions table
CREATE TABLE public.prescriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  location_id UUID NOT NULL,
  patient_id UUID REFERENCES public.patient_profiles(id),
  prescriber_name TEXT NOT NULL,
  prescriber_license TEXT,
  prescriber_phone TEXT,
  prescription_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'dispensed', 'cancelled', 'refill_requested')),
  date_written DATE NOT NULL DEFAULT CURRENT_DATE,
  date_filled DATE,
  refills_authorized INTEGER DEFAULT 0,
  refills_remaining INTEGER DEFAULT 0,
  is_controlled_substance BOOLEAN DEFAULT false,
  notes TEXT,
  created_by UUID,
  verified_by UUID,
  dispensed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create prescription items table
CREATE TABLE public.prescription_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE CASCADE NOT NULL,
  medication_id UUID REFERENCES public.medications(id),
  product_id UUID REFERENCES public.products(id),
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  days_supply INTEGER,
  directions TEXT NOT NULL,
  unit_price NUMERIC DEFAULT 0,
  copay_amount NUMERIC DEFAULT 0,
  insurance_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create insurance claims table
CREATE TABLE public.insurance_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES public.patient_profiles(id),
  claim_number TEXT,
  insurance_provider TEXT NOT NULL,
  policy_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'approved', 'denied', 'paid')),
  amount_claimed NUMERIC NOT NULL DEFAULT 0,
  amount_approved NUMERIC DEFAULT 0,
  copay_amount NUMERIC DEFAULT 0,
  denial_reason TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create controlled substance log
CREATE TABLE public.controlled_substance_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  location_id UUID NOT NULL,
  medication_id UUID REFERENCES public.medications(id),
  product_id UUID REFERENCES public.products(id),
  prescription_id UUID REFERENCES public.prescriptions(id),
  action TEXT NOT NULL CHECK (action IN ('received', 'dispensed', 'destroyed', 'transferred', 'adjusted')),
  quantity_change INTEGER NOT NULL,
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  lot_number TEXT,
  expiry_date DATE,
  performed_by UUID NOT NULL,
  witnessed_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create prescription reminders table
CREATE TABLE public.prescription_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES public.patient_profiles(id),
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('refill', 'pickup', 'medication')),
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'acknowledged', 'cancelled')),
  notification_method TEXT DEFAULT 'sms' CHECK (notification_method IN ('sms', 'email', 'push')),
  message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.patient_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drug_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.controlled_substance_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for patient_profiles
CREATE POLICY "Staff can view patient profiles in their org"
ON public.patient_profiles FOR SELECT
USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Staff can manage patient profiles in their org"
ON public.patient_profiles FOR ALL
USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- RLS Policies for medications
CREATE POLICY "Staff can view medications in their org"
ON public.medications FOR SELECT
USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Managers can manage medications"
ON public.medications FOR ALL
USING (organization_id IN (
  SELECT organization_id FROM user_roles
  WHERE user_id = auth.uid() AND role IN ('super_admin', 'org_admin', 'location_manager')
));

-- RLS Policies for drug_interactions
CREATE POLICY "All authenticated users can view drug interactions"
ON public.drug_interactions FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage drug interactions"
ON public.drug_interactions FOR ALL
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_id = auth.uid() AND role IN ('super_admin', 'org_admin')
));

-- RLS Policies for prescriptions
CREATE POLICY "Staff can view prescriptions in their org"
ON public.prescriptions FOR SELECT
USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Staff can manage prescriptions in their org"
ON public.prescriptions FOR ALL
USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- RLS Policies for prescription_items
CREATE POLICY "Staff can view prescription items"
ON public.prescription_items FOR SELECT
USING (prescription_id IN (
  SELECT id FROM prescriptions WHERE organization_id IN (SELECT get_user_org_ids(auth.uid()))
));

CREATE POLICY "Staff can manage prescription items"
ON public.prescription_items FOR ALL
USING (prescription_id IN (
  SELECT id FROM prescriptions WHERE organization_id IN (SELECT get_user_org_ids(auth.uid()))
));

-- RLS Policies for insurance_claims
CREATE POLICY "Staff can view insurance claims in their org"
ON public.insurance_claims FOR SELECT
USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Staff can manage insurance claims"
ON public.insurance_claims FOR ALL
USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- RLS Policies for controlled_substance_log
CREATE POLICY "Staff can view controlled substance log"
ON public.controlled_substance_log FOR SELECT
USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Staff can insert controlled substance log"
ON public.controlled_substance_log FOR INSERT
WITH CHECK (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- RLS Policies for prescription_reminders
CREATE POLICY "Staff can view prescription reminders"
ON public.prescription_reminders FOR SELECT
USING (prescription_id IN (
  SELECT id FROM prescriptions WHERE organization_id IN (SELECT get_user_org_ids(auth.uid()))
));

CREATE POLICY "Staff can manage prescription reminders"
ON public.prescription_reminders FOR ALL
USING (prescription_id IN (
  SELECT id FROM prescriptions WHERE organization_id IN (SELECT get_user_org_ids(auth.uid()))
));

-- Create updated_at triggers
CREATE TRIGGER update_patient_profiles_updated_at
BEFORE UPDATE ON public.patient_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_medications_updated_at
BEFORE UPDATE ON public.medications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prescriptions_updated_at
BEFORE UPDATE ON public.prescriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_insurance_claims_updated_at
BEFORE UPDATE ON public.insurance_claims
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();