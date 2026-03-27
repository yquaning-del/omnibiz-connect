

# Platform Audit — Remaining Issues & Improvements

## Current State

Previous audits addressed: toast unification, Phase 1-4 security fixes, admin search wiring, password change UI, pagination on Orders/Customers, and some PageErrorBoundary wrapping.

After re-examining the codebase and security scan results, the following issues remain.

---

## 1. SECURITY (Still Flagged by Scanner)

### 1a. `customers` Table — No RLS Policies (SCANNER: ERROR)
Still flagged. No migration was applied for this table. Any authenticated user can read all customer PII across organizations.

**Fix**: Add RLS policy restricting access to org members via `get_user_org_ids(auth.uid())`.

### 1b. `patient_profiles` — Medical Data Over-Exposed (SCANNER: ERROR)
Still flagged. Current policy allows any org staff to view all patient records. Needs pharmacist/front-desk role gating.

**Fix**: Tighten the existing RLS to use `is_pharmacist()` or `is_front_desk()`.

### 1c. Leaked Password Protection (SCANNER: WARN)
Still disabled. Requires auth config change.

**Fix**: Enable via `configure_auth` tool.

---

## 2. INCOMPLETE ERROR BOUNDARIES

PageErrorBoundary is only applied to Dashboard, POS, and Pharmacy routes. **20+ routes** remain unwrapped: Products, Customers, Orders, Inventory, Reports, Staff, Tables, Rooms, Kitchen, Reservations, Housekeeping, FrontDesk, Maintenance, GuestServices, GuestProfiles, Billing, Settings, and all Property/Admin routes.

**Fix**: Wrap all remaining routes in `App.tsx`.

---

## 3. EDGE FUNCTION LOGGING (Still Present)

143 `console.log` matches remain across 9 edge functions: `ai-dynamic-pricing`, `ai-maintenance-predictor`, `ai-pharmacy-adherence`, `paystack-webhook`, `send-lease-invitation`, `send-staff-invitation`, `process-online-order`, `create-test-users`.

**Fix**: Remove or guard all remaining `console.log` calls.

---

## 4. MISSING EMPTY STATES & PAGINATION

Only `Customers` and `Orders` have `EmptyState` + pagination. Pages like `Inventory`, `Kitchen`, `Rooms`, `Reservations` still fetch all records with no pagination and show blank content when empty.

**Fix**: Add empty states and client-side pagination to Inventory, Kitchen, Rooms, and Reservations pages.

---

## 5. MISSING FEATURES

### 5a. No `customers` RLS — Data Leak Risk
(Covered in 1a above, but also a functional gap: cross-org data bleeds.)

### 5b. No Rate Limiting on Remaining Public Edge Functions
`ai-copilot`, `ai-insights`, `ai-demand-forecast`, `ai-dynamic-pricing`, `ai-maintenance-predictor`, `ai-pharmacy-adherence`, `ai-lease-generator`, `drug-interactions` still lack rate limiting.

### 5c. Missing FK Constraints
Tables `guest_folios`, `reservations`, `rent_payments`, `prescriptions`, `order_items` lack foreign key constraints to parent tables, risking orphaned records.

---

## Implementation Plan

### Phase 1: Critical Security (Database)
1. **Add `customers` table RLS** — org-scoped ALL policy
2. **Tighten `patient_profiles` RLS** — require pharmacist/front-desk role
3. **Enable leaked password protection** — auth config
4. **Add FK constraints** on `order_items.order_id → orders.id`, `prescriptions.patient_id → patient_profiles.id`, `guest_folios.reservation_id → reservations.id`

### Phase 2: Error Boundaries & Logging
5. **Wrap all remaining routes** with `PageErrorBoundary` in `App.tsx` (~20 routes)
6. **Clean remaining edge function logs** — remove `console.log` from 9 functions

### Phase 3: UX Completeness
7. **Add empty states + pagination** to Inventory, Kitchen, Rooms, Reservations pages
8. **Add rate limiting** to remaining public AI edge functions

### Technical Details

**Migration SQL for customers RLS:**
```sql
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage customers in their org"
ON public.customers FOR ALL TO authenticated
USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
```

**Files to modify:**
- `src/App.tsx` — wrap ~20 routes with `PageErrorBoundary`
- `src/pages/Inventory.tsx`, `Kitchen.tsx`, `Rooms.tsx`, `Reservations.tsx` — add pagination + empty states
- 9 edge functions — remove `console.log` statements
- 1 database migration — customers RLS, patient_profiles tightening, FK constraints

