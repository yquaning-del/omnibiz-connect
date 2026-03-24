

# HospitalityOS Platform Audit Report

## Executive Summary

After a thorough analysis of the codebase, database schema, security scan results, and architectural patterns, this report identifies **critical security vulnerabilities**, **functional risks**, **code quality issues**, and **missing features** across the platform.

---

## 1. CRITICAL SECURITY VULNERABILITIES (Must Fix)

These were identified by the automated security scan and code review:

### 1a. Cart Items RLS — Any User Can Read/Modify Other Users' Carts
- **Risk**: The `cart_items` table policy uses `(user_id = auth.uid()) OR (session_id IS NOT NULL)`, meaning any authenticated user can read, update, or delete ANY cart item that has a session_id set.
- **Fix**: Replace condition with `(user_id = auth.uid()) OR (session_id = current_setting('app.session_id', true))` or tie session_id to a secure claim.

### 1b. Unauthenticated Refill Requests Expose Patient PII
- **Risk**: The `refill_requests` INSERT policy has no auth requirement. Anyone on the internet can submit records containing `patient_name`, `patient_phone`, `patient_email` — a **HIPAA violation risk**.
- **Fix**: Add `auth.uid() IS NOT NULL` to the WITH CHECK, or require a verified patient token/captcha.

### 1c. Online Order Items — Anonymous Users Can Append to Any Recent Guest Order
- **Risk**: The `online_order_items` INSERT policy lets anonymous actors add items to any guest order created in the last hour if they guess an order ID.
- **Fix**: Bind order access to a session identifier stored on the order row.

### 1d. Leaked Password Protection Disabled
- **Risk**: Users can sign up with passwords known to be in data breaches.
- **Fix**: Enable leaked password protection in auth settings.

### 1e. User Achievements — Self-Award Exploit
- **Risk**: Any authenticated user can insert arbitrary achievement types for themselves without server-side validation.
- **Fix**: Restrict inserts to a security-definer function that validates achievement criteria.

---

## 2. CODE QUALITY & STABILITY ISSUES

### 2a. Dual Toast System Creating Confusion
- **58 files** import `useToast` from `@/hooks/use-toast` (shadcn toast), while other files use `toast` from `sonner` directly. The `toaster.tsx` re-exports sonner, but `use-toast.ts` still exists as a separate hook with different API (`toast({ variant, title, description })`).
- **Risk**: The shadcn `useToast` hook and sonner `toast()` have incompatible APIs. Some toast calls may silently fail or render inconsistently.
- **Fix**: Migrate all 58 files from `useToast` to `sonner`'s `toast()` API, then remove the shadcn toast hook entirely.

### 2b. Excessive Console Logging in Production
- **349 `console.log` calls** found across 26 files, including edge functions that log sensitive data like invitation URLs, webhook events, and payment references.
- **Risk**: Information leakage in production; performance impact.
- **Fix**: Replace with structured logging; remove or guard client-side logs.

### 2c. Missing Error Boundaries on Lazy Routes
- While there's a global `ErrorBoundary`, individual lazy-loaded routes don't have granular error boundaries. A crash in one page (e.g., Pharmacy) takes down the entire app.
- **Fix**: Wrap route groups with `PageErrorBoundary` components.

### 2d. `fetchUserData` Race Condition
- In `AuthContext`, both `onAuthStateChange` and `getSession` can trigger `fetchUserData`. The `initializingRef` guard helps but `setCurrentLocation`/`setCurrentOrganization` use stale closures referencing `currentLocation`/`currentOrganization` state.
- **Fix**: Use functional state updates or refs for current org/location to avoid stale closure bugs.

---

## 3. DATABASE & RLS ISSUES

### 3a. Missing Foreign Keys Throughout Schema
- Tables like `guest_folios`, `reservations`, `rent_payments`, `prescriptions`, `room_service_orders` have NO foreign key constraints to their parent tables (organizations, locations, customers).
- **Risk**: Orphaned records, data integrity violations, inability to use Supabase embedded joins.
- **Fix**: Add FK constraints with appropriate `ON DELETE` behaviors via migration.

### 3b. Duplicate/Overlapping RLS Policies
- Several tables (e.g., `organizations`, `locations`, `reservations`, `guest_folios`) have overlapping SELECT + ALL policies that are redundant. ALL already covers SELECT.
- **Risk**: Policy evaluation overhead; confusion about which policy is authoritative.
- **Fix**: Consolidate overlapping policies.

### 3c. No Rate Limiting on Public Endpoints
- Edge functions like `send-staff-invitation`, `send-lease-invitation`, `process-online-order` have `verify_jwt = false` and no rate limiting.
- **Risk**: Abuse via automated requests (spam invitations, fake orders).
- **Fix**: Add rate limiting logic inside edge functions or re-enable JWT verification where appropriate.

---

## 4. MISSING FEATURES & ENHANCEMENTS

### 4a. No Account Deletion / Data Export (GDPR)
- Users cannot delete their account or export their data. This is a legal requirement in many jurisdictions.

### 4b. No Session Management
- Users cannot view active sessions or revoke sessions on other devices.

### 4c. No Two-Factor Authentication (2FA)
- For a platform handling PHI (pharmacy) and financial data (rent, payments), 2FA should be available.

### 4d. No Audit Trail for Tenant Actions
- Tenant portal actions (maintenance requests, payment submissions) are not logged in any audit table.

### 4e. No Email Notification System for Key Events
- While `send-notification` edge function exists, there's no automated trigger for critical events like: lease expiry reminders, rent overdue alerts, prescription refill reminders, reservation confirmations.

### 4f. No Pagination on Large Data Pages
- Pages like `AdminAuditLogs` show pagination UI but most data pages (Orders, Products, Customers, Prescriptions) fetch all records with no pagination, hitting the 1000-row Supabase limit.

### 4g. No Input Sanitization on Rich Text Fields
- Notes fields across the platform (`reservations.notes`, `prescriptions.notes`, etc.) accept raw text with no length validation or sanitization on the client side.

### 4h. Missing Loading/Empty States
- Several pages lack empty state UI when no data exists, showing blank screens to new users.

---

## 5. IMPLEMENTATION PLAN

### Phase 1: Critical Security Fixes (Priority: IMMEDIATE)
1. Fix `cart_items` RLS policy to restrict session-based access
2. Add authentication requirement to `refill_requests` INSERT policy
3. Fix `online_order_items` INSERT policy to bind to session
4. Enable leaked password protection
5. Add server-side validation for `user_achievements` inserts

### Phase 2: Code Quality Stabilization
6. Unify toast system — migrate all 58 files from `useToast` to `sonner`
7. Remove or guard all `console.log` statements in edge functions
8. Add `PageErrorBoundary` wrappers to route groups

### Phase 3: Data Integrity
9. Add foreign key constraints to orphaned tables
10. Consolidate duplicate RLS policies
11. Add rate limiting to public edge functions

### Phase 4: Missing Features
12. Add pagination to all data listing pages
13. Add input length validation to all text fields
14. Add empty states to data pages
15. Implement account deletion / data export

### Technical Details

**Database Migrations Required:**
- `cart_items` RLS policy update
- `refill_requests` RLS policy update  
- `online_order_items` RLS policy update
- FK constraints for `guest_folios`, `reservations`, `rent_payments`, `prescriptions`
- `user_achievements` INSERT policy restriction

**Files Requiring Toast Migration (58 files):**
All files importing `from '@/hooks/use-toast'` need to switch to `import { toast } from 'sonner'` and update call signatures from `toast({ variant, title, description })` to `toast.success(title)` / `toast.error(title)`.

**Edge Functions Requiring Logging Cleanup:**
`paystack-webhook`, `send-staff-invitation`, `send-lease-invitation`, `ai-copilot`, `ai-pharmacy-adherence`, `ai-maintenance-predictor`, `ai-lease-generator`

