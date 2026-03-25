
# HospitalityOS Platform Audit Report

## Overview
This plan implements comprehensive security, quality, and stability improvements identified through a full platform audit.

## Implementation Status

### Phase 1: Critical Security Fixes ✅ COMPLETE
1. ✅ Fixed `cart_items` RLS — removed overly permissive `session_id IS NOT NULL` check; now requires matching user_id or validated session
2. ✅ Fixed `refill_requests` INSERT — added patient name/phone validation requirements
3. ✅ Fixed `online_order_items` INSERT — removed anonymous access to recent guest orders
4. ✅ Removed `user_achievements` self-insert — achievements can only be granted server-side
5. ⚠️ Leaked password protection — security linter flag remains (requires manual Supabase dashboard config)

### Phase 2: Code Quality Stabilization ✅ COMPLETE
6. ✅ Migrated all 65 files from `useToast` to `sonner` `toast()` API
7. ✅ Cleaned sensitive data from edge function console.log statements
8. ✅ Fixed AuthContext `fetchUserData` stale closure race condition (functional state updates)

### Phase 3: Infrastructure Hardening ✅ COMPLETE
9. ✅ Added rate limiting to `send-staff-invitation`, `send-lease-invitation`, `process-online-order` edge functions
10. ✅ Created shared `_shared/rateLimit.ts` utility for edge functions

### Phase 4: Missing Features & Enhancements ✅ COMPLETE
11. ✅ Created reusable `usePagination` hook for client-side pagination
12. ✅ Created reusable `EmptyState` component for empty data pages
13. ✅ Created `DataPageControls` component for consistent pagination UI
14. ✅ Added pagination + empty states + export to Customers page
15. ✅ Added `maxLength` input validation to Settings, Customers, and Products forms
16. ✅ Implemented GDPR account data export (JSON download)
17. ✅ Implemented account deletion via `delete-account` edge function with sole-admin guard
18. ✅ Added Account Management tab to Settings page

### Remaining Items (Future)
- ⏳ Add foreign key constraints to orphaned tables
- ⏳ Consolidate duplicate/overlapping RLS policies
- ⏳ Add 2FA support
- ⏳ Add session management UI
- ⏳ Automated email triggers for lease expiry, rent overdue, etc.

## Technical Notes

### Toast Migration
- All 65 files converted from `{ toast } = useToast()` → `import { toast } from 'sonner'`
- Pattern: `toast({ variant: "destructive", title, description })` → `toast.error(title, { description })`
- Pattern: `toast({ title, description })` → `toast.success(title, { description })`

### Rate Limiting
- Shared utility at `supabase/functions/_shared/rateLimit.ts`
- In-memory sliding window: 10 req/min for invitations, 20 req/min for order processing
- Returns 429 Too Many Requests when exceeded

### RLS Policy Changes
- `cart_items`: Separate policies for authenticated (user_id match) and guest (session validation)
- `refill_requests`: Patient name ≥2 chars, phone ≥7 chars required
- `online_order_items`: Only order owner or org staff can insert items
- `user_achievements`: INSERT policy removed entirely (server-side only)

### Pagination & Empty States
- `usePagination` hook: generic client-side pagination with page size, navigation helpers
- `EmptyState` component: icon + title + description + optional action button
- `DataPageControls`: previous/next buttons with "Showing X–Y of Z" text
- Applied to: Customers (new), Orders, Products, Inventory (already had pagination)

### GDPR / Account Management
- Data Export: downloads profile, roles, notifications, permissions as JSON
- Account Deletion: `delete-account` edge function cascades through user_permissions → user_roles → notifications → achievements → feedback → profiles → auth.users
- Sole-admin guard: prevents deletion if user is the only org_admin of any organization
- Accessible via Settings → Account tab
