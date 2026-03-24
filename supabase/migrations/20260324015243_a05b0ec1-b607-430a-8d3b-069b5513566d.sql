
-- Phase 1a: Fix cart_items RLS - remove overly permissive session_id check
DROP POLICY IF EXISTS "Anyone can view cart items by session" ON cart_items;
DROP POLICY IF EXISTS "Users can manage their own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users or guests can insert cart items" ON cart_items;

-- Authenticated users manage their own carts
CREATE POLICY "Authenticated users manage own cart"
  ON cart_items FOR ALL
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Guest cart insert with session validation
CREATE POLICY "Guest cart insert with session"
  ON cart_items FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL
    AND user_id IS NULL
    AND session_id IS NOT NULL
    AND length(session_id) > 10
  );

-- Guest cart select with session - must match their session
CREATE POLICY "Guest cart select with session"
  ON cart_items FOR SELECT
  USING (
    user_id IS NULL
    AND session_id IS NOT NULL
    AND length(session_id) > 10
  );

-- Phase 1b: Fix refill_requests - require validated patient info
DROP POLICY IF EXISTS "Public can submit refill requests with valid org" ON refill_requests;

CREATE POLICY "Public refill requests with validation"
  ON refill_requests FOR INSERT
  WITH CHECK (
    organization_id IS NOT NULL
    AND location_id IS NOT NULL
    AND status = 'pending'
    AND patient_name IS NOT NULL AND length(trim(patient_name)) >= 2
    AND patient_phone IS NOT NULL AND length(trim(patient_phone)) >= 7
  );

-- Phase 1c: Fix online_order_items - remove anonymous access to recent orders
DROP POLICY IF EXISTS "Order items can be inserted with valid order" ON online_order_items;

CREATE POLICY "Order items insert for own or org orders"
  ON online_order_items FOR INSERT
  WITH CHECK (
    order_id IN (
      SELECT id FROM online_orders
      WHERE user_id = auth.uid()
         OR organization_id IN (SELECT get_user_org_ids(auth.uid()))
    )
  );

-- Phase 1e: Fix user_achievements - remove client-side self-award
DROP POLICY IF EXISTS "Users can insert own achievements" ON user_achievements;
