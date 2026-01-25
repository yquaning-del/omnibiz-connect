
# Investigation and Fix Plan for Property Vertical Issues

## Executive Summary

I've identified two issues in the Property vertical:

1. **Missing GHS currency plans for Property** - Ghana users selecting Property vertical during onboarding see no plans
2. **Race condition causing redirect back to onboarding** - After successfully completing onboarding, users are redirected back because the auth state hasn't refreshed yet

---

## Issue 1: Missing Property Plans for GHS Currency

### Root Cause
The database query confirms that the "property" vertical only has USD currency plans. All other verticals (restaurant, hotel, pharmacy, retail) have both GHS and USD plans.

**Current state:**
- restaurant: GHS, USD
- hotel: GHS, USD
- pharmacy: GHS, USD
- retail: GHS, USD
- property: USD only (missing GHS)

### Impact
When a user from Ghana (using GHS currency) selects the Property vertical during onboarding:
1. `PlanSelectionStep.tsx` queries plans with `.eq('currency', selectedCountry.currency)`
2. For Ghana, this filters to `currency = 'GHS'`
3. No property plans match, so the plans array is empty
4. Users see no plans to select

### Fix
Insert GHS currency plans for the Property vertical in the database (migration):

| Plan Name | Tier | Monthly (GHS) | Yearly (GHS) |
|-----------|------|---------------|--------------|
| Property Starter | starter | 900 | 9000 |
| Property Professional | professional | 1950 | 19500 |
| Property Enterprise | enterprise | 3750 | 37500 |

---

## Issue 2: Redirect to Onboarding After Trial Selection

### Root Cause
After `handlePlanSelect` in `Onboarding.tsx` completes successfully:
1. New organization, location, and subscription records are created
2. `navigate('/dashboard')` is called
3. `AppLayout.tsx` renders and checks `organizations.length === 0`
4. But `AuthContext` still has the old state (empty organizations array)
5. User is immediately redirected back to `/onboarding`

The auth state doesn't automatically refresh when database records change.

### Technical Flow
```text
Onboarding (handlePlanSelect)
    ↓
Creates org + location + subscription
    ↓
navigate('/dashboard')
    ↓
AppLayout checks organizations.length
    ↓
Still 0 (stale state)
    ↓
Navigate to /onboarding
```

### Fix
Two complementary solutions:

**A. Trigger AuthContext refresh after onboarding**
Add a mechanism to force-refresh the auth state after successfully creating the organization. This ensures `organizations` is populated before navigating.

**B. Improve AppLayout's redirect logic**
Instead of immediately redirecting when `organizations.length === 0`, check if the user is coming from onboarding or if we just haven't loaded data yet. Add a short delay or use a more robust check.

---

## Implementation Plan

### Step 1: Database Migration - Add GHS Property Plans

Create a migration to insert the three missing Property vertical plans for Ghana/GHS currency.

### Step 2: Update AuthContext

Add a `refreshUserData` function that can be called after onboarding to force-reload organizations and locations.

### Step 3: Update Onboarding.tsx

After successfully creating the subscription:
1. Call `refreshUserData()` or manually fetch the new organization
2. Wait for the data to be available
3. Then navigate to dashboard

### Step 4: Improve AppLayout Redirect Logic

Add a safeguard to prevent race condition:
- Check if coming from a fresh session
- Allow a brief moment for data to load before redirecting
- Or check `roles.length > 0` instead (more reliable since we create a role in onboarding)

---

## Technical Details

### Files to Modify

| File | Changes |
|------|---------|
| `supabase/migrations/[new].sql` | Insert 3 GHS property plans |
| `src/contexts/AuthContext.tsx` | Add `refreshUserData()` export |
| `src/pages/Onboarding.tsx` | Call refresh after subscription creation |
| `src/components/layout/AppLayout.tsx` | Use roles check instead of organizations |

### Database Insert Statement

```sql
INSERT INTO subscription_plans (name, vertical, tier, price_monthly, price_yearly, currency, country_code, max_locations, max_users, features, is_active)
VALUES
  ('Property Starter', 'property', 'starter', 900, 9000, 'GHS', 'GH', 1, 5, '["Up to 10 units","Tenant profiles","Basic lease tracking","Rent collection","Maintenance requests","Email support","1 property"]', true),
  ('Property Professional', 'property', 'professional', 1950, 19500, 'GHS', 'GH', 5, 20, '["Everything in Starter","Up to 50 units","Tenant screening","Digital lease signing","Automated rent reminders","Financial reports","Multi-property support","Priority support"]', true),
  ('Property Enterprise', 'property', 'enterprise', 3750, 37500, 'GHS', 'GH', NULL, NULL, '["Everything in Professional","Unlimited units","API access","Accounting integration","Bulk operations","Custom lease templates","Dedicated account manager","24/7 phone support"]', true);
```

### AuthContext Changes

```typescript
// Add to AuthContext
const refreshUserData = async () => {
  if (user) {
    await fetchUserData(user.id, false);
  }
};

// Export in context value
value={{
  ...existingValues,
  refreshUserData,
}}
```

### Onboarding.tsx Changes

```typescript
// After successful subscription creation
toast({
  title: 'Setup complete!',
  description: 'Your 14-day free trial has started.',
});

// Force refresh auth state before navigating
await refreshUserData();

// Then navigate
navigate('/dashboard');
```

### AppLayout.tsx Changes

```typescript
// Change from organizations check to roles check
// This is more reliable because roles are created in onboarding

if (roles.length === 0 && !loading) {
  return <Navigate to="/onboarding" replace />;
}
```

---

## Testing Checklist

After implementation:

- [ ] Create new user with Ghana/GHS and Property vertical - verify plans appear
- [ ] Complete onboarding and verify redirect to dashboard works
- [ ] Test with Restaurant/Hotel verticals to ensure no regression
- [ ] Test resume flow (partial onboarding) still works
- [ ] Verify existing users aren't affected

---

## Risk Assessment

| Change | Risk Level | Mitigation |
|--------|------------|------------|
| Adding GHS plans | Low | Read-only insert, no existing data affected |
| Auth refresh | Low | Additive change, doesn't break existing flow |
| AppLayout redirect logic | Medium | Test thoroughly, roles check is more specific |

The fixes are isolated and don't affect existing functionality for other verticals.
