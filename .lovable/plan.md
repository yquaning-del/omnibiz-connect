
# Fix "No Available Units" in Lease Creation Wizard

## Problem Summary

The lease creation wizard shows "No available units" due to a database query using incorrect column names, causing the query to silently fail.

## Root Causes

### Issue 1: Wrong Column Names in Query
The `LeaseWizard.tsx` fetch query references columns that don't exist in the database:

| Wrong Column | Actual Column |
|--------------|---------------|
| `square_feet` | `square_footage` |
| `base_rent` | `monthly_rent` |

This causes the query to fail completely, returning no units.

### Issue 2: Tenant Status Filter
The existing tenant "John Does" has status `applicant` instead of `active`, so they won't appear in tenant selection even after the unit query is fixed.

## Solution

### Fix 1: Update LeaseWizard Unit Query

**File:** `src/components/property/LeaseWizard.tsx`

**Line 133-138:** Update the `fetchUnits` function to use correct column names:

```typescript
// Before (broken)
.select('id, unit_number, address, city, state, country, unit_type, bedrooms, bathrooms, square_feet, base_rent')

// After (fixed)
.select('id, unit_number, address, city, state, country, unit_type, bedrooms, bathrooms, square_footage, monthly_rent')
```

### Fix 2: Update Unit Auto-Fill Logic

**Line 117-129:** Update the `useEffect` that auto-fills from unit to use correct column name:

```typescript
// Before
monthlyRent: selectedUnit.base_rent?.toString() || prev.monthlyRent,

// After
monthlyRent: selectedUnit.monthly_rent?.toString() || prev.monthlyRent,
```

### Fix 3: Update Unit Card Display

**Line 301-303:** Update the rent display to use correct column:

```typescript
// Before
{unit.base_rent && (
  <p className="text-lg font-semibold text-property">${unit.base_rent}/mo</p>
)}

// After
{unit.monthly_rent && (
  <p className="text-lg font-semibold text-property">${unit.monthly_rent}/mo</p>
)}
```

## Expected Result After Fix

1. Units with status "available" will appear in Step 1
2. Unit location data will auto-populate in Step 2
3. Monthly rent will auto-fill in payment step

## Note About Tenants

The existing tenant "John Does" won't appear because their status is "applicant". To include this tenant in lease creation, either:
- Change their status to "active" in the database
- Or update the query to include both statuses (if applicants should be eligible for leases)

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/property/LeaseWizard.tsx` | Fix column names in query and auto-fill logic |

## Verification Steps

After the fix:
1. Open "Create Lease" wizard
2. Unit "BLDG 1, Unit 101" should appear in the list
3. Selecting the unit should auto-populate location and rent fields
