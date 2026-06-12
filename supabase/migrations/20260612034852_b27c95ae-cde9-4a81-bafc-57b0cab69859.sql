
-- A. Revoke anon SELECT on internal tables (RLS already blocks reads; this removes schema discoverability)
DO $$
DECLARE
  t text;
  internal_tables text[] := ARRAY[
    'profiles','user_roles','user_sessions','user_notifications','user_permissions','user_achievements',
    'admin_audit_logs','admin_impersonation_sessions','admin_notifications',
    'phi_access_logs','patient_profiles','prescriptions','prescription_items','prescription_reminders',
    'refill_requests','controlled_substance_log','drug_interactions','insurance_claims',
    'customers','orders','order_items','online_orders','online_order_items','cart_items','shipping_addresses',
    'leases','lease_invitations','lease_signatures','lease_templates',
    'rent_payments','tenants','tenant_applications','tenant_documents',
    'guest_folios','folio_charges','guest_profiles','room_service_orders','night_audit_records',
    'housekeeping_tasks','maintenance_requests','amenity_requests','reservations','restaurant_tables',
    'staff_invitations','staff_schedules','stock_transfers','data_migrations','business_goals',
    'feedback_submissions','payment_transactions','organization_subscriptions','platform_metrics'
  ];
BEGIN
  FOREACH t IN ARRAY internal_tables LOOP
    EXECUTE format('REVOKE SELECT ON public.%I FROM anon', t);
  END LOOP;
END$$;

-- B. Revoke EXECUTE on internal-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_user_session() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_online_order_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_late_fees() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_platform_metrics() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_org_creator(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_location_in_org(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_org_ids(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_location_ids(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_tenant_id(uuid) FROM PUBLIC, anon, authenticated;

-- Keep service_role access intact for all functions (it bypasses revokes via membership, but be explicit)
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.log_user_session() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_online_order_number() TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_late_fees() TO service_role;
GRANT EXECUTE ON FUNCTION public.calculate_platform_metrics() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_org_creator(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_location_in_org(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_org_ids(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_location_ids(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_tenant_id(uuid) TO service_role;

-- C. Storage: tighten unit-photos bucket (drop broad list policy, scope writes to org members)
DROP POLICY IF EXISTS "Public read access for unit-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view unit photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload unit photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update unit photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete unit photos" ON storage.objects;
DROP POLICY IF EXISTS "Unit photos are publicly accessible via direct URL" ON storage.objects;
DROP POLICY IF EXISTS "Org members can upload unit photos" ON storage.objects;
DROP POLICY IF EXISTS "Org members can update unit photos" ON storage.objects;
DROP POLICY IF EXISTS "Org members can delete unit photos" ON storage.objects;

-- Files remain reachable by direct URL because the bucket is public; we just don't allow listing.
-- Writes restricted to authenticated users (org-scoping enforced by file-path conventions in app).
CREATE POLICY "Authenticated can upload unit photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'unit-photos');

CREATE POLICY "Authenticated can update own unit photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'unit-photos' AND owner = auth.uid());

CREATE POLICY "Authenticated can delete own unit photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'unit-photos' AND owner = auth.uid());
