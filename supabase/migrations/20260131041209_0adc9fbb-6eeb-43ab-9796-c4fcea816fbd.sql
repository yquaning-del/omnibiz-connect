-- E-commerce Module Database Schema

-- Product variants (sizes, colors, etc.)
CREATE TABLE public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  price_adjustment NUMERIC DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  attributes JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Shopping cart items (supports both guest and authenticated users)
CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT cart_items_user_or_session CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

-- Shipping addresses for customers
CREATE TABLE public.shipping_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT,
  postal_code TEXT,
  country TEXT NOT NULL DEFAULT 'Kenya',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Online orders (separate from in-store POS orders)
CREATE TABLE public.online_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  shipping_address_id UUID REFERENCES public.shipping_addresses(id) ON DELETE SET NULL,
  order_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  fulfillment_status TEXT DEFAULT 'unfulfilled',
  payment_status TEXT DEFAULT 'pending',
  payment_method TEXT,
  payment_reference TEXT,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  shipping_amount NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'KES',
  notes TEXT,
  shipping_method TEXT,
  tracking_number TEXT,
  estimated_delivery DATE,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Online order items
CREATE TABLE public.online_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.online_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  variant_name TEXT,
  sku TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_order_items ENABLE ROW LEVEL SECURITY;

-- Product variants policies (public read, org admin write)
CREATE POLICY "Anyone can view active product variants"
ON public.product_variants FOR SELECT
USING (is_active = true);

CREATE POLICY "Org admins can manage product variants"
ON public.product_variants FOR ALL
USING (is_org_admin(auth.uid(), organization_id));

-- Cart items policies
CREATE POLICY "Users can manage their own cart items"
ON public.cart_items FOR ALL
USING (user_id = auth.uid() OR session_id IS NOT NULL);

CREATE POLICY "Anyone can insert cart items"
ON public.cart_items FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view cart items by session"
ON public.cart_items FOR SELECT
USING (user_id = auth.uid() OR session_id IS NOT NULL);

-- Shipping addresses policies
CREATE POLICY "Users can manage their own shipping addresses"
ON public.shipping_addresses FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Org admins can view shipping addresses for their orders"
ON public.shipping_addresses FOR SELECT
USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- Online orders policies (public insert for checkout, restricted management)
CREATE POLICY "Anyone can create online orders"
ON public.online_orders FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view their own orders"
ON public.online_orders FOR SELECT
USING (user_id = auth.uid() OR organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org staff can manage orders"
ON public.online_orders FOR ALL
USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- Online order items policies
CREATE POLICY "Anyone can insert order items"
ON public.online_order_items FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view order items for their orders"
ON public.online_order_items FOR SELECT
USING (order_id IN (
  SELECT id FROM public.online_orders 
  WHERE user_id = auth.uid() OR organization_id IN (SELECT get_user_org_ids(auth.uid()))
));

-- Add indexes for performance
CREATE INDEX idx_product_variants_product ON public.product_variants(product_id);
CREATE INDEX idx_cart_items_user ON public.cart_items(user_id);
CREATE INDEX idx_cart_items_session ON public.cart_items(session_id);
CREATE INDEX idx_cart_items_org ON public.cart_items(organization_id);
CREATE INDEX idx_online_orders_org ON public.online_orders(organization_id);
CREATE INDEX idx_online_orders_user ON public.online_orders(user_id);
CREATE INDEX idx_online_orders_status ON public.online_orders(status);
CREATE INDEX idx_online_order_items_order ON public.online_order_items(order_id);

-- Add is_available_online flag to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_available_online BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS online_description TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS online_images JSONB DEFAULT '[]';

-- Function to generate order numbers
CREATE OR REPLACE FUNCTION public.generate_online_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'ONL-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
      LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for auto-generating order numbers
CREATE TRIGGER trg_generate_online_order_number
BEFORE INSERT ON public.online_orders
FOR EACH ROW
EXECUTE FUNCTION public.generate_online_order_number();