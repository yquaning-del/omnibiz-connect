
# Platform Audit — Critical Remaining Issues

After re-running the security scanner and reviewing routing, RLS, and module isolation, the following high-impact issues remain. Two are **CRITICAL ERROR-level** vulnerabilities surfaced by the scanner that allow account takeover and cross-tenant data exposure.

---

## 1. CRITICAL — Privilege Escalation via `user_roles` Insert

The `user_roles` table has a policy "Users can insert own first role" that lets any authenticated user with no existing role insert a row for themselves with **any** `app_role` (including `super_admin` or `org_admin`) in **any** organization. A new signup can immediately self-promote to platform super-admin.

**Fix:** Drop that policy. Replace with a restricted policy that:
- Only allows inserting role = `staff` (or no role at all),
- Only into an `organization_id` the user just created (`is_org_creator`) or where they have a valid invitation,
- And only for `user_id = auth.uid()`.

Privileged role assignment must go exclusively through admin flows / invitation acceptance.

---

## 2. CRITICAL — Realtime Channels Have No Authorization

`realtime.messages` has no RLS. Any authenticated user can subscribe to broadcasts on `orders`, `housekeeping_tasks`, `maintenance_requests`, `room_service_orders`, `amenity_requests` — all org/location-scoped operational data leaks across tenants.

**Fix:** Add an RLS policy on `realtime.messages` restricting subscriptions so the topic name encodes the user's `organization_id` / `location_id`, validated against `get_user_org_ids(auth.uid())` / `get_user_location_ids(auth.uid())`. Update client `.channel()` calls to use scoped topic names like `org:{orgId}:orders`.

---

## 3. HIGH — Guest Cart Enumeration

`cart_items` "Guest cart select with session" allows anonymous reads of any row whose `session_id` length > 10 — no binding to the requesting client. Guessable/enumerable session IDs leak cart contents.

**Fix:** Either (a) store guest carts only in localStorage (drop the public SELECT policy entirely), or (b) require a signed/HMACed session token and validate via a SQL function. Recommended approach: client-side only for guests; persist on login.

---

## 4. HIGH — Public Refill PII Submission Without Throttling

`refill_requests` accepts unauthenticated inserts containing patient name, phone, email, and medication details with no captcha or rate limit — enables mass spam and fake medical record creation.

**Fix:** Route public refill submissions through a dedicated edge function (`submit-refill-request`) that enforces: per-IP rate limit (existing `_shared/rateLimit.ts`), Turnstile/hCaptcha verification, payload validation, and inserts via service role. Tighten the table policy to authenticated-only.

---

## 5. HIGH — Cross-Vertical Route Overlap (UX + Data Confusion)

`AppLayout` only checks authentication. Routes like `/pharmacy/*`, `/property/*`, `/billing`, `/front-desk`, `/kitchen`, `/rooms`, `/tables`, `/housekeeping`, `/guest-services`, `/guest-profiles` are reachable by URL from any vertical even though the sidebar hides them. A Retail org user navigating to `/property/leases` sees an empty/broken page; a Pharmacy user can hit `/billing` (hotel folios) and query unrelated tables.

**Fix:** Create a `<VerticalRouteGuard allowed={['hotel']}>` component (super_admin bypass) and wrap each vertical-specific route group. Redirect mismatched verticals to `/dashboard` with a toast: "This module is not available for your business type."

Vertical-to-route map:
- **restaurant**: `/kitchen`, `/tables`, `/reservations` (also hotel)
- **hotel**: `/rooms`, `/front-desk`, `/housekeeping`, `/maintenance`, `/guest-services`, `/guest-profiles`, `/billing`, `/reservations`
- **pharmacy**: `/pharmacy/*`
- **property**: `/property/*`
- **retail**: (shared `/pos`, `/products`, `/inventory`, `/customers`, `/orders`, `/online-orders`)

---

## 6. MEDIUM — Missing Page-Level FeatureGate on `/billing` and `/online-orders`

Sidebar items have `requiredFeature`, but the route components themselves don't wrap content in `<FeatureGate>`. A user who upgrades/downgrades or types the URL bypasses tier enforcement. Wrap page bodies in `<FeatureGate feature="billing_folios">` / `<FeatureGate feature="online_orders">`.

---

## 7. MEDIUM — Storage Bucket Allows Public Listing

A public storage bucket has a broad SELECT policy on `storage.objects` allowing anyone to enumerate all uploaded files (signed leases, ID documents, unit photos, prescription scans). 

**Fix:** Restrict the bucket's SELECT policy to either `auth.uid() IS NOT NULL` plus org-scoped path prefix (`organization_id/...`), or move sensitive buckets to private and serve via signed URLs.

---

## 8. MEDIUM — Anon GraphQL Exposure of Operational Tables

~50 tables remain visible in the public GraphQL schema to the anon key. Most are properly RLS-locked, but discovery itself reveals schema/business intel and enables targeted enumeration. 

**Fix:** `REVOKE SELECT ON <table> FROM anon` for all non-public-facing tables (keep grants only on `products`, `hotel_rooms` for public booking, `units` for listings, `medications` for refill catalog).

---

## 9. LOW — Dashboard Overlap Cleanup

- `Dashboard.tsx` defaults `vertical` to `'retail'` when neither location nor org specifies one. New orgs without a vertical see a misleading retail dashboard. Show an "Choose your business type" prompt instead.
- `console.error` calls in the 5 vertical dashboards should route through the existing toast system rather than only logging silently — users currently see infinite spinners on query failure.

---

## Implementation Plan

### Phase 1 — Critical Security (must ship first)
1. Migration: drop unsafe `user_roles` insert policy; replace with restricted version.
2. Migration: add `realtime.messages` RLS using topic-encoded org/location scoping; refactor `useNotifications`, kitchen, maintenance, room-service realtime subscriptions to use scoped topic names.
3. Migration: drop `cart_items` guest SELECT policy; refactor `useCart` to use localStorage for guests.
4. Edge function `submit-refill-request` with rate limit + payload validation; tighten `refill_requests` insert policy to authenticated only.

### Phase 2 — Module Isolation
5. New `src/components/auth/VerticalRouteGuard.tsx`.
6. Wrap vertical-specific routes in `src/App.tsx` with `VerticalRouteGuard`.
7. Wrap `/billing` and `/online-orders` page contents with `<FeatureGate>`.

### Phase 3 — Hardening + Polish
8. Migration: tighten storage bucket SELECT policy for the public bucket; verify lease/ID/prescription buckets are private.
9. Migration: `REVOKE SELECT ... FROM anon` on non-public tables (batch).
10. `Dashboard.tsx`: detect missing vertical → render onboarding CTA instead of defaulting to retail.
11. Surface dashboard fetch errors via toast.

### Files to Modify
- `supabase/migrations/<new>.sql` — user_roles policy, realtime RLS, cart policy, refill_requests policy, storage policy, anon revokes
- `supabase/functions/submit-refill-request/index.ts` (new)
- `src/components/auth/VerticalRouteGuard.tsx` (new)
- `src/App.tsx` — wrap vertical route groups
- `src/pages/Billing.tsx`, `src/pages/OnlineOrders.tsx` — FeatureGate wrappers
- `src/hooks/useCart.ts` — localStorage guest cart
- `src/components/notifications/NotificationProvider.tsx` and any `.channel()` callers — scoped topic names
- `src/pages/Dashboard.tsx` — vertical-missing handling
- 5 dashboard files — toast on error

### Manual Action (cannot be automated)
- Enable HIBP leaked-password protection in the Cloud Auth dashboard (still pending from prior audits).
