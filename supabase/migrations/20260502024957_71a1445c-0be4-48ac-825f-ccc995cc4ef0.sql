
-- 1) PRIVILEGE ESCALATION FIX: drop the over-permissive self-insert role policy
DROP POLICY IF EXISTS "Users can insert own first role" ON public.user_roles;

-- The remaining INSERT policies on user_roles are safe:
--   * "Org creators can self-assign org_admin" - bound to is_org_creator()
--   * "Users can grant self org_admin for own org" - bound to is_org_creator() + is_location_in_org()
--   * "Org admins can manage roles" - bound to is_org_admin()
-- Privileged roles can no longer be self-assigned by arbitrary users.

-- 2) GUEST CART ENUMERATION FIX: drop the unauthenticated guest SELECT/INSERT policies.
-- Guest cart contents will be kept in localStorage on the client; server-side carts require sign-in.
DROP POLICY IF EXISTS "Guest cart select with session" ON public.cart_items;
DROP POLICY IF EXISTS "Guest cart insert with session" ON public.cart_items;

-- The "Authenticated users manage own cart" policy remains and continues to protect signed-in users.
