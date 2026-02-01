-- Add tip_amount column to orders table for restaurant tip management
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tip_amount numeric DEFAULT 0;

-- Add late fee columns to rent_payments for automatic late fee calculation
ALTER TABLE public.rent_payments 
  ADD COLUMN IF NOT EXISTS grace_period_days integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS late_fee_rate numeric DEFAULT 5,
  ADD COLUMN IF NOT EXISTS late_fee_applied boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS late_fee_applied_at timestamp with time zone;

-- Create stock_transfers table for moving inventory between locations
CREATE TABLE IF NOT EXISTS public.stock_transfers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  from_location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  to_location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'completed', 'cancelled')),
  notes text,
  initiated_by uuid REFERENCES auth.users(id),
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on stock_transfers
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;

-- RLS policies for stock_transfers
CREATE POLICY "Users can view stock transfers in their org"
  ON public.stock_transfers
  FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Managers can manage stock transfers"
  ON public.stock_transfers
  FOR ALL
  USING (organization_id IN (
    SELECT user_roles.organization_id FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = ANY(ARRAY['super_admin'::app_role, 'org_admin'::app_role, 'location_manager'::app_role])
  ));

-- Create function to auto-apply late fees
CREATE OR REPLACE FUNCTION public.apply_late_fees()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE rent_payments
  SET 
    late_fee = CASE 
      WHEN late_fee_rate IS NOT NULL THEN (base_rent * late_fee_rate / 100)
      ELSE COALESCE(late_fee, 0)
    END,
    total_amount = base_rent + CASE 
      WHEN late_fee_rate IS NOT NULL THEN (base_rent * late_fee_rate / 100)
      ELSE COALESCE(late_fee, 0)
    END,
    balance = total_amount - paid_amount,
    late_fee_applied = true,
    late_fee_applied_at = now(),
    status = 'overdue'
  WHERE 
    status IN ('pending', 'partial')
    AND due_date < CURRENT_DATE - COALESCE(grace_period_days, 5)
    AND late_fee_applied = false;
END;
$$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_stock_transfers_org ON public.stock_transfers(organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_status ON public.stock_transfers(status);
CREATE INDEX IF NOT EXISTS idx_rent_payments_overdue ON public.rent_payments(due_date, status) WHERE status IN ('pending', 'partial');