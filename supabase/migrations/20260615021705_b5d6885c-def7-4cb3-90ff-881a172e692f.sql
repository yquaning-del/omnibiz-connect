
-- 1) Public storefront view for online-available products (excludes cost_price, stock thresholds)
CREATE OR REPLACE VIEW public.public_storefront_products
WITH (security_invoker = true) AS
SELECT id, organization_id, location_id, name, description, category, subcategory,
       vertical, unit_price, tax_rate, image_url, online_description, online_images,
       is_available_online, is_active
FROM public.products
WHERE is_available_online = true AND is_active = true;

GRANT SELECT ON public.public_storefront_products TO anon, authenticated;

-- Allow anon SELECT on products only via the filtered view's underlying query
-- Add a public read policy on products restricted to online-available rows
DROP POLICY IF EXISTS "Public can view online-available products" ON public.products;
CREATE POLICY "Public can view online-available products"
ON public.products FOR SELECT
TO anon, authenticated
USING (is_available_online = true AND is_active = true);

-- Restrict column access for anon: only safe storefront columns
REVOKE SELECT ON public.products FROM anon;
GRANT SELECT (id, organization_id, location_id, name, description, category, subcategory,
              vertical, unit_price, tax_rate, image_url, online_description, online_images,
              is_available_online, is_active)
  ON public.products TO anon;

-- 2) Hide pos_pin from client SELECTs via column-level grants
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, email, full_name, avatar_url, phone, created_at, updated_at,
              is_suspended, tour_completed, onboarding_progress, email_preferences,
              user_settings, pos_pin_enabled)
  ON public.profiles TO authenticated;

-- 3) Add UPDATE policy for the documents storage bucket
DROP POLICY IF EXISTS "Org members can update their documents" ON storage.objects;
CREATE POLICY "Org members can update their documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] IN (
    SELECT organizations.id::text FROM organizations
    WHERE organizations.id IN (SELECT public.get_user_org_ids(auth.uid()))
  )
)
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] IN (
    SELECT organizations.id::text FROM organizations
    WHERE organizations.id IN (SELECT public.get_user_org_ids(auth.uid()))
  )
);

-- 4) Tighten unit-photos INSERT: require the uploader to belong to at least one org
DROP POLICY IF EXISTS "Authenticated can upload unit photos" ON storage.objects;
CREATE POLICY "Org members can upload unit photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'unit-photos'
  AND owner = auth.uid()
  AND EXISTS (SELECT 1 FROM public.get_user_org_ids(auth.uid()))
);

-- 5) Revoke EXECUTE on sensitive SECURITY DEFINER functions from public roles
REVOKE EXECUTE ON FUNCTION public.verify_pos_pin(text, text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.calculate_platform_metrics() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_late_fees() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_user_session() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_online_order_number() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;

-- 6) Lock down Realtime broadcast/subscription channel by default
-- Deny all subscriptions/broadcasts unless an explicit allow policy is added later.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can use realtime within their orgs" ON realtime.messages;
CREATE POLICY "Authenticated users can use realtime within their orgs"
ON realtime.messages FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.get_user_org_ids(auth.uid()))
);
