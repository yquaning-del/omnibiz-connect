-- Fix overly permissive RLS policies for e-commerce tables

-- Drop the problematic policies
DROP POLICY IF EXISTS "Anyone can insert cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Anyone can create online orders" ON public.online_orders;
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.online_order_items;

-- Recreate cart_items insert policy with session validation
CREATE POLICY "Users or guests can insert cart items"
ON public.cart_items FOR INSERT
WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()) 
  OR (auth.uid() IS NULL AND session_id IS NOT NULL AND LENGTH(session_id) > 10)
);

-- Recreate online_orders insert policy - must have valid org and either user or session
CREATE POLICY "Authenticated users or guests can create orders"
ON public.online_orders FOR INSERT
WITH CHECK (
  organization_id IS NOT NULL 
  AND (
    (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()))
    OR (auth.uid() IS NULL AND user_id IS NULL)
  )
);

-- Recreate order items insert - must link to an order being created
CREATE POLICY "Order items can be inserted with valid order"
ON public.online_order_items FOR INSERT
WITH CHECK (
  order_id IN (
    SELECT id FROM public.online_orders 
    WHERE user_id = auth.uid() 
    OR (user_id IS NULL AND created_at > NOW() - INTERVAL '1 hour')
    OR organization_id IN (SELECT get_user_org_ids(auth.uid()))
  )
);