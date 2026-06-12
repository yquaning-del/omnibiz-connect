# Plan — Resolve Outstanding Linter & Hardening Items

The Supabase linter currently reports **159 SECURITY warnings**. Prior audits already fixed app-layer issues (RLS, route guards, payment gating, realtime scoping, refill rate limiting, PII policies). The remaining work is database-grant hygiene plus one storage bucket issue. No UI changes needed.

## Findings (grouped)

1. **Lint 0025 — Public bucket allows listing (1)**
   The `unit-photos` bucket is public AND the broad `storage.objects` SELECT policy lets clients list every file. We want files publicly readable by direct URL, not enumerable.

2. **Lint 0026 — Tables visible to `anon` in GraphQL schema (~75)**
   Default `GRANT SELECT ... TO anon` exists on internal tables that should never be discoverable before sign-in (e.g. `profiles`, `user_roles`, `user_sessions`, `admin_audit_logs`, `phi_access_logs`, `patient_profiles`, `prescriptions`, `controlled_substance_log`, `insurance_claims`, `leases`, `rent_payments`, `tenants`, `guest_folios`, `folio_charges`, `night_audit_records`, `staff_invitations`, `user_permissions`, etc.). RLS already blocks reads, but exposing them in the GraphQL/PostgREST schema leaks structure.

3. **Lint 0029 — SECURITY DEFINER functions executable by `authenticated` (~80)**
   Helper functions like `has_role`, `is_org_admin`, `is_super_admin`, `is_manager`, `is_pharmacist`, `is_front_desk`, `is_tenant`, `is_location_in_org`, `is_org_creator`, `get_user_org_ids`, `get_user_location_ids`, `get_tenant_id`, `verify_pos_pin`, `apply_late_fees`, `calculate_platform_metrics`, `generate_online_order_number`, `handle_new_user`, `log_user_session`, `update_updated_at_column` are callable directly by signed-in users. Most are only meant for RLS evaluation or triggers.

## Changes

### A. Restrict `anon` GraphQL exposure (single migration)
For every table that should NOT be visible to anonymous visitors, run:
```
REVOKE SELECT ON public.<table> FROM anon;
```
Keep `anon` SELECT only on truly public-catalog tables: `products`, `product_variants`, `subscription_plans`, `supported_countries`, `hotel_rooms`, `property_units`, `locations` (for public site lookups), `organizations` (slug lookups), `reviews`, `medications` (if used by public refill portal).

Tables to lock down: `profiles, user_roles, user_sessions, user_notifications, user_permissions, user_achievements, admin_audit_logs, admin_impersonation_sessions, admin_notifications, phi_access_logs, patient_profiles, prescriptions, prescription_items, prescription_reminders, refill_requests, controlled_substance_log, drug_interactions, insurance_claims, customers, orders, order_items, online_orders, online_order_items, cart_items, shipping_addresses, leases, lease_invitations, lease_signatures, lease_templates, rent_payments, tenants, tenant_applications, tenant_documents, guest_folios, folio_charges, guest_profiles, room_service_orders, night_audit_records, housekeeping_tasks, maintenance_requests, amenity_requests, reservations, restaurant_tables, staff_invitations, staff_schedules, stock_transfers, data_migrations, business_goals, feedback_submissions, payment_transactions, organization_subscriptions, platform_metrics`.

### B. Lock down SECURITY DEFINER execution
For internal helpers used only inside RLS and triggers:
```
REVOKE EXECUTE ON FUNCTION public.<fn>(...) FROM PUBLIC, anon, authenticated;
```
Targets: `handle_new_user, log_user_session, update_updated_at_column, generate_online_order_number, apply_late_fees, calculate_platform_metrics, is_org_creator, is_location_in_org, get_user_org_ids, get_user_location_ids, get_tenant_id`.

Keep EXECUTE for `authenticated` on functions the client legitimately calls: `has_role, is_org_admin, is_super_admin, is_manager, is_front_desk, is_pharmacist, is_tenant, verify_pos_pin`.

### C. Storage bucket — `unit-photos`
Replace the broad SELECT-all policy on `storage.objects` with: no list policy. Files remain readable via signed/public URL but `storage.from('unit-photos').list()` is denied to clients. Add an authenticated INSERT/UPDATE/DELETE policy scoped to org membership (re-use existing org check helpers).

### D. Manual reminders (cannot be done in SQL)
- Enable **HIBP leaked-password protection** in Auth settings.
- Confirm Auth OTP expiry ≤ 1 hour.

## Deliverable
A single migration file that performs all REVOKE/GRANT changes in section A and B, plus an updated storage policy for `unit-photos`. After it runs, re-running the linter should drop from 159 → near 0 (only intentional public-catalog grants remain). No frontend code changes required.
