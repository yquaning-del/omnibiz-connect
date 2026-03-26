

# Platform Audit Report & Implementation Plan

## Findings Summary

After a thorough audit of the codebase, database schema, security scan results, and architecture, here are the issues and improvements organized by priority.

---

## 1. CRITICAL SECURITY ISSUES

### 1a. `customers` Table Has No RLS Policies (Security Scan: ERROR)
The security scanner flagged that the `customers` table has no RLS policies preventing cross-organization access. Any authenticated user can read ALL customer data (emails, phones) across every organization.

**Fix**: Add RLS policies restricting access to users within the same organization via `get_user_org_ids(auth.uid())`.

### 1b. `patient_profiles` Medical Data Accessible Across Organizations (Security Scan: ERROR)
Patient medical records (allergies, blood type, insurance) are accessible to any staff in an organization. A compromised account could access thousands of records.

**Fix**: Tighten RLS to require pharmacist or front-desk role checks, not just org membership.

### 1c. Leaked Password Protection Still Disabled (Security Scan: WARN)
Users can sign up with passwords from known data breaches.

**Fix**: Enable via auth configuration.

### 1d. `delete-account` Edge Function Missing from `config.toml`
The function exists but has no `verify_jwt = false` entry. Since it manually verifies auth via `verifyAuth()`, it needs the config entry or it will reject requests without a valid Supabase JWT header (double-auth).

**Fix**: Add `[functions.delete-account]` with `verify_jwt = false` to `config.toml`.

---

## 2. CODE QUALITY & STABILITY

### 2a. `PageErrorBoundary` Exists But Is Never Used
The component and HOC are defined but no route or page wraps with them. A crash in any lazy-loaded page takes down the entire app.

**Fix**: Wrap route groups in `App.tsx` with `PageErrorBoundary`.

### 2b. Residual `console.log` in Edge Functions (272 matches)
Previous cleanup was partial. AI functions (`ai-copilot`, `ai-insights`, `ai-demand-forecast`, `ai-customer-insights`, `ai-lease-generator`), `send-notification`, `paystack-payment`, and `create-test-users` still have extensive logging of request data.

**Fix**: Replace with guarded debug logging or remove entirely.

### 2c. Admin Search Handlers Are No-Ops
`AdminUsers`, `AdminSubscriptions`, and `AdminAuditLogs` pages have `onSearch` callbacks that just `console.log` the query without filtering data.

**Fix**: Wire search queries to actual data filtering.

### 2d. Pagination Missing on Most Data Pages
Only `Customers` uses the `usePagination` hook. `Orders`, `Inventory`, `Reports`, and pharmacy pages fetch all records with no pagination, hitting the 1000-row Supabase default limit.

**Fix**: Apply `usePagination` or server-side pagination to Orders, Inventory, and pharmacy pages.

### 2e. Legacy `use-toast.ts` Shim Still Present
The old `useToast` compatibility shim exists. While no pages import it directly anymore, the file and its re-export in `ui/use-toast.ts` remain as dead code.

**Fix**: Remove `src/hooks/use-toast.ts` and `src/components/ui/use-toast.ts`.

---

## 3. DATABASE & RLS ISSUES

### 3a. Duplicate RLS Policies
Multiple tables have overlapping SELECT + ALL policies (e.g., `guest_folios`, `reservations`, `room_service_orders`, `prescriptions`, `guest_profiles`, `platform_metrics`). The ALL policy already covers SELECT.

**Fix**: Drop the redundant SELECT policies to simplify evaluation.

### 3b. Missing Foreign Key Constraints
Many tables lack FK constraints (guest_folios, reservations, rent_payments, prescriptions, order_items, etc.), risking orphaned data and preventing Supabase embedded joins.

**Fix**: Add FK constraints via migration with appropriate ON DELETE behaviors.

---

## 4. MISSING FEATURES & ENHANCEMENTS

### 4a. Empty States on Data Pages
Pages like Orders, Rooms, Reservations show blank content when no data exists. New users see an empty screen with no guidance.

**Fix**: Add `EmptyState` component (already created) to all major data pages.

### 4b. No Password Change UI
Users cannot change their password from within the app. The only flow is "Forgot Password" via email.

**Fix**: Add a password change form to the Profile or Account settings tab.

### 4c. Admin Search Not Functional
The admin data tables accept search input but don't filter. This makes managing large user/subscription lists impractical.

**Fix**: Implement client-side or server-side filtering in admin pages.

---

## 5. IMPLEMENTATION PLAN

### Phase 1: Critical Security (3 items)
1. **Add `customers` table RLS** -- restrict SELECT/ALL to org members
2. **Add `delete-account` to config.toml** -- enable the edge function
3. **Enable leaked password protection** -- via auth config

### Phase 2: Code Cleanup (4 items)
4. **Wrap lazy routes with `PageErrorBoundary`** in App.tsx
5. **Clean edge function console.log** -- remove sensitive data logging from 8 functions
6. **Remove dead `use-toast` shim files** (2 files)
7. **Wire admin search to actual filtering** in AdminUsers, AdminSubscriptions, AdminAuditLogs

### Phase 3: Data & UX (4 items)
8. **Add pagination to Orders page** using existing `usePagination` hook
9. **Add empty states** to Orders, Rooms, Reservations, Kitchen, and pharmacy pages
10. **Drop duplicate RLS policies** on 6 tables
11. **Add password change UI** to Settings Account tab

### Technical Details

**Migration SQL needed for customers RLS**:
```sql
CREATE POLICY "Staff can manage customers in their org"
ON public.customers FOR ALL TO authenticated
USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
```

**Files to modify**:
- `supabase/config.toml` -- add delete-account function config
- `src/App.tsx` -- wrap route groups with PageErrorBoundary
- `src/pages/Orders.tsx` -- add usePagination + EmptyState
- `src/pages/admin/AdminUsers.tsx`, `AdminSubscriptions.tsx`, `AdminAuditLogs.tsx` -- wire search
- `src/components/settings/AccountManagement.tsx` -- add password change form
- 8 edge functions -- clean console.log statements
- Remove `src/hooks/use-toast.ts` and `src/components/ui/use-toast.ts`

