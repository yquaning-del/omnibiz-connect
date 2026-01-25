
# Module-Specific Roles and Permissions System

## Problem Analysis

The current permissions system has these limitations:
1. **Generic roles** - Roles like "staff" or "location_manager" are the same across all verticals
2. **No granular control** - Admins cannot specify which exact pages/features a user can access
3. **Property Module mismatch** - The Property vertical has specific features (Units, Tenants, Leases, Rent Collection, Maintenance) but the role permissions don't reflect this
4. **No admin UI for customization** - There's no way to click/toggle specific permissions

---

## Solution Overview

Create a **module-specific, checkbox-based permission system** where admins can:
1. See permissions grouped by the current module (vertical)
2. Toggle individual feature access for each staff member
3. Store granular permissions in the database
4. Enforce permissions at runtime (navigation + API level)

```text
┌──────────────────────────────────────────────────────────────┐
│                    Staff Permissions                          │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ User: John Smith (location_manager)                      │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  Property Module Permissions:                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ ☑ Dashboard          ☑ Units           ☑ Tenants       │ │
│  │ ☑ Leases             ☐ Rent Collection ☐ Applications  │ │
│  │ ☐ Maintenance        ☐ Reports                          │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  Management Permissions:                                     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ ☐ Staff Management   ☐ Settings       ☐ Billing        │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### New Table: `user_permissions`

Stores granular feature access per user:

```sql
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_role_id UUID NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_role_id, permission_key)
);
```

### Permission Keys Structure

Permission keys will be namespaced by vertical:

| Vertical | Permission Keys |
|----------|-----------------|
| **Property** | `property.dashboard`, `property.units`, `property.tenants`, `property.leases`, `property.rent_collection`, `property.applications`, `property.maintenance`, `property.reports` |
| **Restaurant** | `restaurant.dashboard`, `restaurant.pos`, `restaurant.tables`, `restaurant.kitchen`, `restaurant.orders`, `restaurant.reservations`, `restaurant.products`, `restaurant.inventory`, `restaurant.customers` |
| **Hotel** | `hotel.dashboard`, `hotel.front_desk`, `hotel.rooms`, `hotel.reservations`, `hotel.housekeeping`, `hotel.maintenance`, `hotel.guest_services`, `hotel.guest_profiles`, `hotel.billing` |
| **Pharmacy** | `pharmacy.dashboard`, `pharmacy.prescriptions`, `pharmacy.patients`, `pharmacy.medications`, `pharmacy.insurance`, `pharmacy.controlled`, `pharmacy.interactions`, `pharmacy.inventory`, `pharmacy.pos` |
| **Retail** | `retail.dashboard`, `retail.pos`, `retail.products`, `retail.orders`, `retail.inventory`, `retail.customers` |
| **Common** | `common.reports`, `common.staff`, `common.settings` |

---

## Role Permission Defaults

When a staff member is assigned a role, they receive default permissions based on their role level. Admins can then customize:

### Property Vertical Defaults

| Permission | Super Admin | Org Admin | Location Manager | Staff |
|------------|-------------|-----------|------------------|-------|
| Dashboard | ✓ | ✓ | ✓ | ✓ |
| Units | ✓ | ✓ | ✓ | Read |
| Tenants | ✓ | ✓ | ✓ | Read |
| Leases | ✓ | ✓ | ✓ | Read |
| Rent Collection | ✓ | ✓ | ✓ | ✗ |
| Applications | ✓ | ✓ | ✓ | ✗ |
| Maintenance | ✓ | ✓ | ✓ | ✓ |
| Reports | ✓ | ✓ | ✓ | ✗ |
| Staff Management | ✓ | ✓ | ✗ | ✗ |
| Settings | ✓ | ✓ | ✗ | ✗ |

---

## Implementation Components

### Files to Create

| File | Purpose |
|------|---------|
| `src/lib/verticalPermissions.ts` | Module-specific permission definitions per vertical |
| `src/components/staff/StaffPermissionsEditor.tsx` | Checkbox-based UI for editing permissions |
| `src/hooks/usePermissions.ts` | Hook to check if current user has a specific permission |

### Files to Modify

| File | Changes |
|------|---------|
| `src/lib/rolePermissions.ts` | Add vertical-specific permission definitions |
| `src/pages/Staff.tsx` | Add "Edit Permissions" action for each staff member |
| `src/components/staff/RolePermissionsCard.tsx` | Show vertical-specific permissions, not generic ones |
| `src/components/layout/AppSidebar.tsx` | Filter nav items based on user's granted permissions |
| `src/components/staff/InviteStaffDialog.tsx` | Show permission checkboxes during invite |

---

## Vertical Permission Definitions

### Property Module

```typescript
export const PROPERTY_PERMISSIONS = {
  'property.dashboard': {
    label: 'Dashboard',
    description: 'View property overview and KPIs',
    icon: 'LayoutDashboard',
    route: '/dashboard',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager', 'department_lead', 'staff']
  },
  'property.units': {
    label: 'Units',
    description: 'Manage property units and vacancies',
    icon: 'Building2',
    route: '/property/units',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager']
  },
  'property.tenants': {
    label: 'Tenants',
    description: 'View and manage tenant profiles',
    icon: 'Users',
    route: '/property/tenants',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager']
  },
  'property.leases': {
    label: 'Leases',
    description: 'Create and manage lease agreements',
    icon: 'FileText',
    route: '/property/leases',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager']
  },
  'property.rent_collection': {
    label: 'Rent Collection',
    description: 'Track and record rent payments',
    icon: 'DollarSign',
    route: '/property/rent',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager']
  },
  'property.applications': {
    label: 'Applications',
    description: 'Review tenant applications',
    icon: 'ClipboardList',
    route: '/property/applications',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager']
  },
  'property.maintenance': {
    label: 'Maintenance',
    description: 'Handle maintenance requests',
    icon: 'Wrench',
    route: '/property/maintenance',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager', 'staff']
  },
  'property.reports': {
    label: 'Reports',
    description: 'View financial and occupancy reports',
    icon: 'BarChart3',
    route: '/property/reports',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager']
  }
};
```

### Similar definitions for Restaurant, Hotel, Pharmacy, and Retail modules...

---

## UI Components

### Staff Permissions Editor

A modal/sheet that opens when clicking "Edit Permissions" on a staff member:

1. **Header**: Shows staff name and current role
2. **Permission Groups**: 
   - Module-specific permissions (based on current vertical)
   - Management permissions (common across verticals)
3. **Checkboxes**: Toggle individual permissions on/off
4. **Role Preset Buttons**: Quick reset to role defaults
5. **Save Button**: Saves custom permissions

### Role Permissions Card (Enhanced)

Instead of showing generic features, show:
- Current vertical's specific pages/features
- Which roles have access by default
- Visual permission matrix

---

## Permission Enforcement

### Sidebar Navigation

Update `AppSidebar.tsx` to check permissions:

```typescript
const renderNavItem = (item: NavItem) => {
  // Check if user has permission for this route
  const permissionKey = getPermissionKeyForRoute(vertical, item.href);
  if (permissionKey && !hasPermission(permissionKey)) {
    return null; // Don't render this nav item
  }
  // ... existing render logic
};
```

### Page Protection

Wrap protected pages with permission checks:

```typescript
// In page component
const { hasPermission } = usePermissions();

if (!hasPermission('property.leases')) {
  return <AccessDenied message="You don't have permission to view leases" />;
}
```

---

## Database Migration

```sql
-- User permissions table for granular access control
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_role_id UUID NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_role_id, permission_key)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Index for faster lookups
CREATE INDEX idx_user_permissions_role ON user_permissions(user_role_id);
CREATE INDEX idx_user_permissions_key ON user_permissions(permission_key);

-- RLS Policies
CREATE POLICY "Users can view their own permissions"
ON public.user_permissions FOR SELECT
USING (
  user_role_id IN (SELECT id FROM user_roles WHERE user_id = auth.uid())
);

CREATE POLICY "Org admins can manage permissions in their org"
ON public.user_permissions FOR ALL
USING (
  user_role_id IN (
    SELECT ur.id FROM user_roles ur
    WHERE ur.organization_id IN (
      SELECT organization_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'org_admin')
    )
  )
);
```

---

## Implementation Order

| Step | Task | Priority |
|------|------|----------|
| 1 | Create `user_permissions` table with RLS | High |
| 2 | Create `src/lib/verticalPermissions.ts` with all vertical definitions | High |
| 3 | Update `src/lib/rolePermissions.ts` to include vertical awareness | High |
| 4 | Create `src/hooks/usePermissions.ts` hook | High |
| 5 | Create `StaffPermissionsEditor.tsx` component | High |
| 6 | Update `Staff.tsx` with "Edit Permissions" action | High |
| 7 | Update `RolePermissionsCard.tsx` to be vertical-aware | Medium |
| 8 | Update `AppSidebar.tsx` to enforce permissions | High |
| 9 | Update `InviteStaffDialog.tsx` with permission selection | Medium |

---

## Expected Outcome

After implementation:
1. Admins see module-specific permissions based on current vertical (Property, Hotel, etc.)
2. Clicking a staff member shows editable permission checkboxes
3. Permissions are stored per-user in the database
4. Navigation automatically hides pages the user cannot access
5. Role defaults provide sensible starting permissions
6. Property module shows: Dashboard, Units, Tenants, Leases, Rent Collection, Applications, Maintenance, Reports
