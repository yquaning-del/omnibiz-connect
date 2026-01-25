
# Fix Property Vertical Setup Checklist

## Problem

The "Getting Started" checklist in the Property vertical shows incorrect retail-focused steps:
- "Add your first product" → Should be "Add your first unit"
- "Create a customer profile" → Should be "Create a tenant profile"  
- "Make your first sale" → Should be "Create your first lease"
- "Invite a team member" → Keep as is (universal)
- "Explore reports" → Keep as is (universal)

## Solution

Update `SetupChecklist.tsx` to follow the same vertical-aware pattern as `ProductTour.tsx`:

1. Define vertical-specific checklist items for each business type
2. Select the appropriate checklist based on `currentOrganization?.primary_vertical`
3. Use correct database tables for completion checks

## Implementation

### File to Modify
- `src/components/onboarding/SetupChecklist.tsx`

### Changes

**1. Add new imports for icons:**
```typescript
import { 
  // ...existing imports
  Building2,
  FileText,
  Wallet,
  Hotel,
  BedDouble,
  ClipboardList,
  Pill,
  Stethoscope,
  Utensils
} from "lucide-react";
```

**2. Define vertical-specific checklist items:**

| Vertical | Step 1 | Step 2 | Step 3 | Step 4 | Step 5 |
|----------|--------|--------|--------|--------|--------|
| Property | Add first unit | Create tenant profile | Create first lease | Invite team | Explore reports |
| Hotel | Add first room | Create guest profile | Create reservation | Invite team | Explore reports |
| Restaurant | Add first product | Create first table | Make first sale | Invite team | Explore reports |
| Pharmacy | Add first medication | Create patient profile | Process prescription | Invite team | Explore reports |
| Retail | Add first product | Create customer | Make first sale | Invite team | Explore reports |

**3. Property-specific checklist items:**

```typescript
const propertyChecklistItems: ChecklistItem[] = [
  {
    id: "add_unit",
    title: "Add your first unit",
    description: "Create a property unit to start managing",
    icon: Building2,
    path: "/units",
    checkFn: async () => {
      if (!currentOrganization) return false;
      const { count } = await supabase
        .from("property_units")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", currentOrganization.id);
      return (count || 0) > 0;
    },
  },
  {
    id: "add_tenant",
    title: "Create a tenant profile",
    description: "Add your first tenant to track leases",
    icon: Users,
    path: "/tenants",
    checkFn: async () => {
      if (!currentOrganization) return false;
      const { count } = await supabase
        .from("tenants")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", currentOrganization.id);
      return (count || 0) > 0;
    },
  },
  {
    id: "create_lease",
    title: "Create your first lease",
    description: "Set up a lease agreement for a unit",
    icon: FileText,
    path: "/leases",
    checkFn: async () => {
      if (!currentOrganization) return false;
      const { count } = await supabase
        .from("leases")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", currentOrganization.id);
      return (count || 0) > 0;
    },
  },
  // ... invite_team and view_reports (same as retail)
];
```

**4. Select checklist based on vertical:**

```typescript
const vertical = currentOrganization?.primary_vertical || 'retail';

const checklistItems = React.useMemo(() => {
  switch (vertical) {
    case 'property':
      return propertyChecklistItems;
    case 'hotel':
      return hotelChecklistItems;
    case 'restaurant':
      return restaurantChecklistItems;
    case 'pharmacy':
      return pharmacyChecklistItems;
    default:
      return retailChecklistItems;
  }
}, [vertical, currentOrganization]);
```

---

## Technical Details

### Database Tables Used Per Vertical

| Vertical | Tables Checked |
|----------|----------------|
| Property | `property_units`, `tenants`, `leases` |
| Hotel | `rooms`, `guest_profiles`, `reservations` |
| Restaurant | `products`, `restaurant_tables`, `orders` |
| Pharmacy | `medications`, `pharmacy_patients`, `prescriptions` |
| Retail | `products`, `customers`, `orders` |

### Navigation Paths Per Vertical

| Vertical | Paths |
|----------|-------|
| Property | `/units`, `/tenants`, `/leases`, `/staff`, `/property/reports` |
| Hotel | `/rooms`, `/guest-profiles`, `/reservations`, `/staff`, `/reports` |
| Restaurant | `/products`, `/tables`, `/pos`, `/staff`, `/reports` |
| Pharmacy | `/pharmacy/medications`, `/pharmacy/patients`, `/pharmacy/prescriptions`, `/staff`, `/reports` |
| Retail | `/products`, `/customers`, `/pos`, `/staff`, `/reports` |

---

## Testing Checklist

After implementation:
- [ ] Property vertical shows: Add unit → Add tenant → Create lease → Invite team → Reports
- [ ] Hotel vertical shows room/guest/reservation steps
- [ ] Restaurant vertical shows product/table/sale steps
- [ ] Pharmacy vertical shows medication/patient/prescription steps
- [ ] Retail vertical continues to work as before
- [ ] Completion checks work correctly for each vertical
- [ ] Navigation paths are correct for each step
