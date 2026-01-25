
# Fix Property Vertical Navigation Paths Leading to 404 Errors

## Problem Identified

The "Getting Started" checklist in the Property vertical has incorrect navigation paths that lead to 404 errors:

| Checklist Item | Current Path | Correct Path | Result |
|----------------|--------------|--------------|--------|
| Add first unit | `/units` | `/property/units` | 404 Error |
| Create tenant profile | `/tenants` | `/property/tenants` | 404 Error |
| Create first lease | `/leases` | `/property/leases` | 404 Error |

The routes are correctly defined in `App.tsx` with the `/property/` prefix, and the sidebar navigation uses the correct paths. Only the SetupChecklist has outdated paths.

## Audit of All Verticals

I reviewed all navigation paths across the ProductTour and SetupChecklist for all verticals:

### Property Vertical
- **SetupChecklist.tsx** (Lines 84, 99, 114): Paths missing `/property/` prefix

### Hotel Vertical
- `/rooms` - Exists in routes
- `/guest-profiles` - Exists in routes
- `/reservations` - Exists in routes

### Restaurant Vertical
- `/products` - Exists in routes
- `/tables` - Exists in routes
- `/pos` - Exists in routes

### Pharmacy Vertical
- `/pharmacy/medications` - Exists in routes
- `/pharmacy/patients` - Exists in routes
- `/pharmacy/prescriptions` - Exists in routes

### Retail Vertical
- `/products` - Exists in routes
- `/customers` - Exists in routes
- `/pos` - Exists in routes

**Only the Property vertical has path mismatches.**

## Solution

Update `SetupChecklist.tsx` to use the correct `/property/` prefixed paths for property-related navigation.

## Changes Required

### File: `src/components/onboarding/SetupChecklist.tsx`

**Change 1 - Line 84: Fix unit path**
```typescript
// Before
path: "/units",

// After
path: "/property/units",
```

**Change 2 - Line 99: Fix tenants path**
```typescript
// Before
path: "/tenants",

// After
path: "/property/tenants",
```

**Change 3 - Line 114: Fix leases path**
```typescript
// Before
path: "/leases",

// After
path: "/property/leases",
```

## Verification

After implementation:
- Property: Add unit navigates to `/property/units`
- Property: Create tenant navigates to `/property/tenants`
- Property: Create lease navigates to `/property/leases`
- All other verticals continue working as expected
