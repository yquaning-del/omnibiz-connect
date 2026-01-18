-- Create subscription plans table
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  vertical public.business_vertical NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('starter', 'professional', 'enterprise')),
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2),
  features JSONB DEFAULT '[]'::jsonb,
  max_locations INTEGER DEFAULT 1,
  max_users INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create organization subscriptions table
CREATE TABLE public.organization_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'past_due', 'cancelled', 'expired')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ DEFAULT (now() + interval '14 days'),
  cancelled_at TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_org_subscription UNIQUE (organization_id)
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscription_plans (everyone can view active plans)
CREATE POLICY "Anyone can view active subscription plans"
ON public.subscription_plans FOR SELECT
USING (is_active = true);

CREATE POLICY "Super admins can manage subscription plans"
ON public.subscription_plans FOR ALL
USING (is_super_admin(auth.uid()));

-- RLS policies for organization_subscriptions
CREATE POLICY "Users can view their org subscriptions"
ON public.organization_subscriptions FOR SELECT
USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org admins can manage subscriptions"
ON public.organization_subscriptions FOR ALL
USING (is_org_admin(auth.uid(), organization_id) OR is_super_admin(auth.uid()));

-- Create updated_at trigger
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organization_subscriptions_updated_at
  BEFORE UPDATE ON public.organization_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed Restaurant Plans
INSERT INTO public.subscription_plans (name, description, vertical, tier, price_monthly, price_yearly, features, max_locations, max_users) VALUES
('Restaurant Starter', 'Perfect for small cafes and food trucks', 'restaurant', 'starter', 49.00, 470.00, '["Table Management", "Basic POS", "Order Management", "Daily Reports", "Up to 10 Tables"]'::jsonb, 1, 5),
('Restaurant Professional', 'For growing restaurants with multiple staff', 'restaurant', 'professional', 99.00, 950.00, '["All Starter Features", "Kitchen Display System", "Reservations", "Menu Builder", "Advanced Reports", "Up to 30 Tables", "Staff Scheduling"]'::jsonb, 3, 15),
('Restaurant Enterprise', 'For restaurant chains and large venues', 'restaurant', 'enterprise', 199.00, 1910.00, '["All Professional Features", "Multi-location Support", "API Access", "Custom Integrations", "Unlimited Tables", "Priority Support", "White-label Options"]'::jsonb, -1, -1);

-- Seed Hotel Plans
INSERT INTO public.subscription_plans (name, description, vertical, tier, price_monthly, price_yearly, features, max_locations, max_users) VALUES
('Hotel Starter', 'For boutique hotels and B&Bs', 'hotel', 'starter', 79.00, 758.00, '["Room Management", "Basic Reservations", "Guest Check-in/out", "Housekeeping Tracking", "Up to 20 Rooms"]'::jsonb, 1, 5),
('Hotel Professional', 'For mid-size hotels', 'hotel', 'professional', 149.00, 1430.00, '["All Starter Features", "Guest Profiles", "Maintenance Management", "Room Service Orders", "Guest Folios", "Up to 100 Rooms", "Channel Manager Ready"]'::jsonb, 2, 20),
('Hotel Enterprise', 'For hotel chains and resorts', 'hotel', 'enterprise', 299.00, 2870.00, '["All Professional Features", "Multi-property Support", "Revenue Management", "API Access", "Unlimited Rooms", "Priority Support", "Custom Reporting"]'::jsonb, -1, -1);

-- Seed Pharmacy Plans
INSERT INTO public.subscription_plans (name, description, vertical, tier, price_monthly, price_yearly, features, max_locations, max_users) VALUES
('Pharmacy Starter', 'For independent pharmacies', 'pharmacy', 'starter', 99.00, 950.00, '["Prescription Management", "Patient Profiles", "Basic Inventory", "Drug Database", "Insurance Claims"]'::jsonb, 1, 5),
('Pharmacy Professional', 'For growing pharmacy businesses', 'pharmacy', 'professional', 199.00, 1910.00, '["All Starter Features", "Controlled Substance Tracking", "Drug Interaction Alerts", "Refill Reminders", "Advanced Insurance Billing", "Compliance Reports"]'::jsonb, 3, 15),
('Pharmacy Enterprise', 'For pharmacy chains', 'pharmacy', 'enterprise', 399.00, 3830.00, '["All Professional Features", "Multi-location Support", "API Access", "HL7/FHIR Integration Ready", "Priority Support", "Custom Workflows"]'::jsonb, -1, -1);

-- Seed Retail Plans
INSERT INTO public.subscription_plans (name, description, vertical, tier, price_monthly, price_yearly, features, max_locations, max_users) VALUES
('Retail Starter', 'For small shops and boutiques', 'retail', 'starter', 39.00, 374.00, '["Point of Sale", "Basic Inventory", "Customer Database", "Daily Reports", "Up to 500 Products"]'::jsonb, 1, 3),
('Retail Professional', 'For growing retail businesses', 'retail', 'professional', 79.00, 758.00, '["All Starter Features", "Advanced Inventory", "Loyalty Program", "Promotions", "Barcode Printing", "Up to 5000 Products", "Staff Management"]'::jsonb, 3, 10),
('Retail Enterprise', 'For retail chains', 'retail', 'enterprise', 149.00, 1430.00, '["All Professional Features", "Multi-store Support", "API Access", "E-commerce Ready", "Unlimited Products", "Priority Support", "Custom Integrations"]'::jsonb, -1, -1);