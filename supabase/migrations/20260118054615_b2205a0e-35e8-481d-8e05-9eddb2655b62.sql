-- Create supported_countries table for multi-country support
CREATE TABLE public.supported_countries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code TEXT NOT NULL UNIQUE,
  country_name TEXT NOT NULL,
  currency_code TEXT NOT NULL,
  currency_symbol TEXT NOT NULL,
  payment_provider TEXT NOT NULL DEFAULT 'paystack',
  is_active BOOLEAN DEFAULT true,
  tax_rate NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payment_transactions table
CREATE TABLE public.payment_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.organization_subscriptions(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  provider_reference TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  mobile_network TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Add currency and local pricing columns to subscription_plans
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'US',
ADD COLUMN IF NOT EXISTS price_monthly_local NUMERIC,
ADD COLUMN IF NOT EXISTS price_yearly_local NUMERIC;

-- Enable RLS on new tables
ALTER TABLE public.supported_countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for supported_countries (public read)
CREATE POLICY "Anyone can view active countries" 
ON public.supported_countries 
FOR SELECT 
USING (is_active = true);

-- RLS policies for payment_transactions
CREATE POLICY "Users can view their organization transactions" 
ON public.payment_transactions 
FOR SELECT 
USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Users can insert transactions for their organization" 
ON public.payment_transactions 
FOR INSERT 
WITH CHECK (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- Insert Ghana as first supported country
INSERT INTO public.supported_countries (country_code, country_name, currency_code, currency_symbol, payment_provider, is_active, tax_rate)
VALUES ('GH', 'Ghana', 'GHS', '₵', 'paystack', true, 0);

-- Insert US as default country
INSERT INTO public.supported_countries (country_code, country_name, currency_code, currency_symbol, payment_provider, is_active, tax_rate)
VALUES ('US', 'United States', 'USD', '$', 'stripe', true, 0);

-- Insert Ghana pricing for subscription plans (GHS versions)
-- Restaurant vertical
INSERT INTO public.subscription_plans (name, tier, vertical, price_monthly, price_yearly, currency, country_code, price_monthly_local, price_yearly_local, max_locations, max_users, features, is_active)
VALUES 
('Restaurant Starter GH', 'starter', 'restaurant', 49, 470, 'GHS', 'GH', 750, 7200, 1, 3, '["POS System", "Basic Menu Management", "Daily Reports", "Email Support"]'::jsonb, true),
('Restaurant Professional GH', 'professional', 'restaurant', 99, 950, 'GHS', 'GH', 1500, 14400, 3, 10, '["Everything in Starter", "Kitchen Display System", "Inventory Management", "Table Management", "Customer Loyalty", "Priority Support"]'::jsonb, true),
('Restaurant Enterprise GH', 'enterprise', 'restaurant', 199, 1910, 'GHS', 'GH', 3000, 28800, -1, -1, '["Everything in Professional", "Multi-Location", "Advanced Analytics", "API Access", "Custom Integrations", "Dedicated Support"]'::jsonb, true);

-- Hotel vertical
INSERT INTO public.subscription_plans (name, tier, vertical, price_monthly, price_yearly, currency, country_code, price_monthly_local, price_yearly_local, max_locations, max_users, features, is_active)
VALUES 
('Hotel Starter GH', 'starter', 'hotel', 79, 758, 'GHS', 'GH', 1200, 11520, 1, 5, '["Room Management", "Basic Reservations", "Guest Profiles", "Daily Reports"]'::jsonb, true),
('Hotel Professional GH', 'professional', 'hotel', 149, 1430, 'GHS', 'GH', 2250, 21600, 1, 15, '["Everything in Starter", "Housekeeping Module", "Maintenance Tracking", "Guest Services", "Revenue Reports"]'::jsonb, true),
('Hotel Enterprise GH', 'enterprise', 'hotel', 299, 2870, 'GHS', 'GH', 4500, 43200, -1, -1, '["Everything in Professional", "Multi-Property", "Channel Manager", "Advanced Analytics", "API Access"]'::jsonb, true);

-- Pharmacy vertical
INSERT INTO public.subscription_plans (name, tier, vertical, price_monthly, price_yearly, currency, country_code, price_monthly_local, price_yearly_local, max_locations, max_users, features, is_active)
VALUES 
('Pharmacy Starter GH', 'starter', 'pharmacy', 99, 950, 'GHS', 'GH', 1500, 14400, 1, 3, '["Prescription Management", "Basic Inventory", "Patient Records", "Daily Reports"]'::jsonb, true),
('Pharmacy Professional GH', 'professional', 'pharmacy', 199, 1910, 'GHS', 'GH', 3000, 28800, 2, 10, '["Everything in Starter", "Drug Interactions", "Insurance Billing", "Controlled Substances", "Priority Support"]'::jsonb, true),
('Pharmacy Enterprise GH', 'enterprise', 'pharmacy', 399, 3830, 'GHS', 'GH', 6000, 57600, -1, -1, '["Everything in Professional", "Multi-Location", "Advanced Analytics", "API Access", "Compliance Reports"]'::jsonb, true);

-- Retail vertical
INSERT INTO public.subscription_plans (name, tier, vertical, price_monthly, price_yearly, currency, country_code, price_monthly_local, price_yearly_local, max_locations, max_users, features, is_active)
VALUES 
('Retail Starter GH', 'starter', 'retail', 39, 374, 'GHS', 'GH', 600, 5760, 1, 2, '["POS System", "Basic Inventory", "Sales Reports", "Email Support"]'::jsonb, true),
('Retail Professional GH', 'professional', 'retail', 79, 758, 'GHS', 'GH', 1200, 11520, 3, 8, '["Everything in Starter", "Advanced Inventory", "Customer Management", "Promotions", "Priority Support"]'::jsonb, true),
('Retail Enterprise GH', 'enterprise', 'retail', 149, 1430, 'GHS', 'GH', 2250, 21600, -1, -1, '["Everything in Professional", "Multi-Store", "Advanced Analytics", "API Access", "Custom Reports"]'::jsonb, true);

-- Create trigger for updated_at on new tables
CREATE TRIGGER update_supported_countries_updated_at
BEFORE UPDATE ON public.supported_countries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at
BEFORE UPDATE ON public.payment_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();