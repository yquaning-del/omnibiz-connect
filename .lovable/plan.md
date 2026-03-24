
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

### Phase 4: Remaining Items (Future)
- ⏳ Add foreign key constraints to orphaned tables
- ⏳ Consolidate duplicate/overlapping RLS policies
- ⏳ Add pagination to all data listing pages
- ⏳ Add input length validation to text fields
- ⏳ Add empty states to data pages
- ⏳ Implement account deletion / data export (GDPR)
- ⏳ Add 2FA support
- ⏳ Add session management UI

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
